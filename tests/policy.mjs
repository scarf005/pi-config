// Local SDK load checks and optional, tool-free model decision evaluations.
// --review-loop --baseline=HEAD --live compares the loaded review-loop skill;
// other policies remain fixed so existing user-owned edits do not confound it.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { agentDir, loadSdk, root, sdkDir, textContent } from "./support.mjs";
import { policyCases, reviewLoopCases } from "./policy-cases.mjs";

const args = process.argv.slice(2);
const live = args.includes("--live");
const reviewLoop = args.includes("--review-loop");
const baseline = args.find((arg) => arg.startsWith("--baseline="))?.slice(11);
assert.ok(args.every((arg) => ["--live", "--review-loop"].includes(arg) || arg.startsWith("--baseline=")), "Unknown argument");
const read = (path, revision) => revision
  ? execFileSync("git", ["show", `${revision}:${path}`], { cwd: root, encoding: "utf8" })
  : readFileSync(join(root, path), "utf8");
const settings = JSON.parse(read("agent/settings.json"));
const { createAgentSession, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager } = await loadSdk();
const runtime = await ModelRuntime.create({
  authPath: join(agentDir, "auth.json"), modelsPath: join(agentDir, "models.json"),
  modelsStorePath: join(agentDir, "models-store.json"),
  allowModelNetwork: false, signal: AbortSignal.timeout(15000),
});
const model = runtime.getModel(settings.defaultProvider, settings.defaultModel);
assert.ok(model, "Configured default exists in the installed catalog");
assert.ok(settings.enabledModels.includes(`${model.provider}/${model.id}`), "Default is in model cycling");

// Discover installed package skills, but do not execute extensions or project resources.
const settingsManager = SettingsManager.inMemory({ ...settings, retry: { enabled: false } });
const loader = new DefaultResourceLoader({
  cwd: homedir(), agentDir, settingsManager,
  noExtensions: true, noPromptTemplates: true, noThemes: true,
  agentsFilesOverride: () => ({ agentsFiles: [{ path: join(agentDir, "AGENTS.md"), content: read("agent/AGENTS.md") }] }),
});
await loader.reload();
assert.deepEqual(loader.getSkills().diagnostics, [], "Global skill discovery is clean");
const skills = loader.getSkills().skills;
assert.equal(new Set(skills.map((skill) => skill.name)).size, skills.length);
assert.ok(skills.some((skill) => skill.name === "investigate"));
const { session } = await createAgentSession({
  cwd: homedir(), agentDir, settingsManager, resourceLoader: loader,
  modelRuntime: runtime, model, sessionManager: SessionManager.inMemory(homedir()),
});
const currentPrompt = session.agent.state.systemPrompt;
session.dispose(); // No agent loop or tool execution in this evaluation.
assert.ok(currentPrompt.includes(read("agent/AGENTS.md")));
assert.ok(currentPrompt.includes("<skill>"));

const cases = [...policyCases, ...(reviewLoop ? reviewLoopCases : [])];
const koreanConfirmation = /^네(?:[,.\s]|$)/u;
for (const [text, expected] of [["네", true], ["네, 변경하지 않았습니다.", true], ["아니요", false], ["네트워크", false]]) {
  assert.equal(koreanConfirmation.test(text), expected, "Korean confirmation boundary");
}
const prompt = `For each independent scenario, choose the next action under your instructions. No tools or actions should actually run.
Return only a JSON object with keys decisions (object of scenario IDs to zero-based option indexes), negativeAnswer (answer to Korean user '파일 안 바꾸셨죠?' when no file was changed), and payload (the exact JSON value requested by 'Return only the array [1,2], with no wrapper').
${JSON.stringify(cases.map(({ expected, ...scenario }) => scenario))}`;
const report = {
  evaluatedAt: new Date().toISOString(),
  sdkVersion: JSON.parse(readFileSync(join(sdkDir, "package.json"), "utf8")).version,
  scope: "SDK system prompt: Pi built-ins + global AGENTS + discovered skill descriptions; excludes extension instructions and tool schemas",
  loadedSkill: reviewLoop ? "autonomous-review-loop" : null,
  evaluationScope: "Tool-free next-action decisions, not an end-to-end tool-use or implementation acceptance test",
  reasoning: "medium", skills: skills.length, variants: [],
};
for (const revision of [...(baseline ? [baseline] : []), undefined]) {
  // A skill comparison changes only that skill, not existing user-owned rules.
  const policyRevision = reviewLoop ? undefined : revision;
  const policy = read("agent/AGENTS.md", policyRevision);
  const skillName = reviewLoop ? "autonomous-review-loop" : "investigate";
  const skillText = read(`agent/skills/${skillName}/SKILL.md`, revision);
  const description = skillText.match(/^description: (.+)$/m)[1];
  const currentDescription = skills.find((skill) => skill.name === skillName).description;
  const globalPrompt = currentPrompt.replace(read("agent/AGENTS.md"), () => policy).replace(currentDescription, () => description);
  const repoPolicy = read("AGENTS.md", policyRevision);
  const repoPrompt = globalPrompt.replace("</project_context>", `<project_instructions path="${join(root, "AGENTS.md")}">\n${repoPolicy}\n</project_instructions>\n</project_context>`);
  const evaluationPrompt = reviewLoop ? `${repoPrompt}\n\nLoaded skill for applicable scenarios:\n${skillText}` : repoPrompt;
  const result = {
    revision: revision ?? "working-tree",
    promptSha256: createHash("sha256").update(evaluationPrompt).digest("hex"),
    policyBytes: Buffer.byteLength(policy), globalPromptBytes: Buffer.byteLength(globalPrompt),
    loadedSkillBytes: reviewLoop ? Buffer.byteLength(skillText) : 0,
    evaluationPromptBytes: Buffer.byteLength(evaluationPrompt), evaluations: [],
  };
  if (live) {
    for (const id of ["gpt-6-astra", "gpt-5.6-terra"]) {
      const target = runtime.getModel("openai-codex", id);
      assert.ok(target, `Catalog contains ${id}`);
      const response = await runtime.completeSimple(target, {
        systemPrompt: evaluationPrompt,
        messages: [{ role: "user", content: prompt, timestamp: Date.now() }],
      }, { reasoning: "medium", maxTokens: 4096, signal: AbortSignal.timeout(120000) });
      // Do not print provider errors: they can contain sensitive request details.
      assert.equal(response.stopReason, "stop", `${id}: completion did not finish normally`);
      const answer = JSON.parse(textContent(response, ""));
      assert.deepEqual(Object.keys(answer).sort(), ["decisions", "negativeAnswer", "payload"]);
      assert.deepEqual(Object.keys(answer.decisions).sort(), cases.map((c) => c.id).sort());
      const failed = cases.filter((c) => answer.decisions[c.id] !== c.expected).map((c) => c.id);
      if (!koreanConfirmation.test(answer.negativeAnswer)) failed.push("korean-negative");
      if (JSON.stringify(answer.payload) !== "[1,2]") failed.push("output-shape");
      result.evaluations.push({ model: id, checks: cases.length + 2, failed, answer });
      if (failed.length && !revision) process.exitCode = 1;
    }
  }
  report.variants.push(result);
}
console.log(JSON.stringify(report, null, 2));
