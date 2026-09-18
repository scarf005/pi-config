// Real SDK/model tool loops over disposable files. External CI/review/runtime observations are explicit fixtures.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { agentDir, loadSdk, root, sdkDir as host, textContent } from "./support.mjs";
import { cases } from "./workflow-cases.mjs";
const args = process.argv.slice(2);
assert.ok(args.every((arg) => ["--live", "--matrix"].includes(arg) || arg.startsWith("--case=")));
for (const arg of args.filter((a) => a.startsWith("--case="))) assert.ok(cases.some((c) => arg === `--case=${c.id}`), `Unknown case: ${arg}`);
const selected = cases.filter((c) => !args.some((a) => a.startsWith("--case=")) || args.includes(`--case=${c.id}`));
assert.ok(selected.length, "Known case required");
mkdirSync("/tmp/pi", { recursive: true });
const artifacts = mkdtempSync("/tmp/pi/workflow-eval-");
const sdk = await loadSdk();
const { createAgentSession, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager } = sdk;
const settings = JSON.parse(readFileSync(join(agentDir, "settings.json"), "utf8"));
const runtime = await ModelRuntime.create({
  authPath: join(agentDir, "auth.json"), modelsPath: join(agentDir, "models.json"),
  modelsStorePath: join(agentDir, "models-store.json"), allowModelNetwork: false, signal: AbortSignal.timeout(15000),
});
const globalRules = readFileSync(join(agentDir, "AGENTS.md"), "utf8");
const repoRules = readFileSync(join(root, "AGENTS.md"), "utf8");
const reviewRules = readFileSync(join(agentDir, "skills/autonomous-review-loop/SKILL.md"), "utf8");
const loader = new DefaultResourceLoader({
  cwd: root, agentDir, settingsManager: SettingsManager.inMemory(settings),
  agentsFilesOverride: () => ({ agentsFiles: [{ path: join(agentDir, "AGENTS.md"), content: globalRules }] }),
});
await loader.reload();
assert.deepEqual(loader.getExtensions().errors, []);
const { session: loaded } = await createAgentSession({
  cwd: root, agentDir, resourceLoader: loader, modelRuntime: runtime,
  settingsManager: SettingsManager.inMemory(settings), sessionManager: SessionManager.inMemory(root),
});
const allTools = loaded.getAllTools();
const activeTools = allTools.filter((tool) => loaded.getActiveToolNames().includes(tool.name));
const ask = allTools.find((t) => t.name === "ask_user");
assert.ok(ask?.promptGuidelines.some((line) => line.includes("standing authorization")), "Patched ask-user source actually loaded");
assert.ok(!ask.promptGuidelines.some((line) => line.includes("or when multiple valid options exist")));
const report = {
  evaluatedAt: new Date().toISOString(), sdkVersion: JSON.parse(readFileSync(join(host, "package.json"))).version,
  scope: "Startup global rules + discovered skills + active extension instructions; fixture loops use production read/ls/edit/write and ask_user schema with a simulated UI answer. External CI/review/runtime observations are fixtures, not execution; new-session handoff is tested, automatic compaction and UI are not.",
  configRevision: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  sourceSha256: Object.fromEntries(["AGENTS.md", "agent/AGENTS.md", "agent/settings.json", "agent/agents/reviewer.md", "agent/skills/autonomous-review-loop/SKILL.md", "tests/workflow.mjs", "tests/workflow-cases.mjs", "tests/support.mjs"].map((path) => [path, createHash("sha256").update(readFileSync(join(root, path))).digest("hex")])),
  askUserSource: ask.sourceInfo.path,
  askUserSha256: createHash("sha256").update(readFileSync(ask.sourceInfo.path)).digest("hex"),
  globalPromptBytes: Buffer.byteLength(loaded.agent.state.systemPrompt),
  toolSchemaBytes: Buffer.byteLength(JSON.stringify(activeTools.map(({ name, description, parameters }) => ({ name, description, parameters })))),
  artifacts, runs: [],
};
loaded.setActiveToolsByName(["read", "ls", "edit", "write", "ask_user"]);
const fixturePrompt = loaded.agent.state.systemPrompt.replace("</project_context>", `<project_instructions path="${join(root, "AGENTS.md")}">\n${repoRules}\n</project_instructions>\n</project_context>`);
loaded.dispose();

const inside = (parent, target) => { const rel = relative(parent, target); return !isAbsolute(rel) && rel !== ".." && !rel.startsWith("../"); };
const readResources = [join(agentDir, "AGENTS.md"), join(root, "AGENTS.md"), join(agentDir, "skills"), join(agentDir, "agents")];
const encode = (data) => typeof data === "string" ? data : `${JSON.stringify(data, null, 2)}\n`;
const makeFixture = (scenario) => {
  const cwd = mkdtempSync(join(artifacts, `${scenario.id}-`));
  for (const [name, content] of Object.entries(scenario.files)) writeFileSync(join(cwd, name), encode(content));
  const calls = [];
  const pathGuard = (name, path) => {
    const target = resolve(cwd, path.replace(/^@/, ""));
    let existing = target;
    while (!lstatSync(existing, { throwIfNoEntry: false })) existing = dirname(existing);
    const real = realpathSync(existing);
    if (inside(cwd, target) && inside(cwd, real)) return;
    if (name === "read" && readResources.some((p) => inside(p, target) && inside(p, real))) return;
    throw new Error("Evaluation tools are restricted to disposable files and explicit policy resources");
  };
  const fileTools = [sdk.createReadTool(cwd), sdk.createLsTool(cwd), sdk.createEditTool(cwd), sdk.createWriteTool(cwd)].map((tool) => ({
    ...tool, label: tool.name,
    execute: async (id, input, signal, onUpdate) => {
      const path = input.path ?? ".";
      pathGuard(tool.name, path);
      const call = { name: tool.name, path: relative(cwd, resolve(cwd, path.replace(/^@/, ""))), passed: false };
      calls.push(call);
      const result = await tool.execute(id, input, signal, onUpdate);
      call.passed = true;
      return result;
    },
  }));
  const tools = [...fileTools, {
    name: "ask_user", label: "Ask user", description: ask.description, parameters: ask.parameters,
    execute: async () => {
      calls.push({ name: "ask_user" });
      return { content: [{ type: "text", text: scenario.answer ?? "Proceed under the existing instructions." }], details: {} };
    },
  }, {
    name: "check", label: "Check", description: "Run the fixture repository's existing label or documentation checks. Does not check visual/runtime acceptance.",
    parameters: { type: "object", properties: { target: { type: "string", enum: ["labels", "docs"] } }, required: ["target"], additionalProperties: false },
    execute: async (_id, { target }) => {
      const call = { name: "check", target, passed: false };
      calls.push(call);
      const value = JSON.parse(readFileSync(join(cwd, `${target}.json`), "utf8"));
      if (target === "labels") assert.deepEqual(value, { primary: "Submit", secondary: "Submit", cancel: "Cancel" });
      else assert.equal(value.image, "images/tank.png");
      call.passed = true;
      return { content: [{ type: "text", text: `${target}: passed` }], details: {} };
    },
  }];
  return { cwd, calls, tools };
};

// Exercise the actual filesystem tools and the test boundary without model calls.
const boundary = makeFixture(cases[0]);
const execute = (name, input) => boundary.tools.find((t) => t.name === name).execute(randomUUID(), input);
await assert.rejects(execute("check", { target: "labels" }));
await execute("edit", { path: "labels.json", edits: [{ oldText: '"primary": "Save"', newText: '"primary": "Submit"' }, { oldText: '"secondary": "Save"', newText: '"secondary": "Submit"' }] });
await execute("check", { target: "labels" });
const outside = join(artifacts, "untouched.txt");
writeFileSync(outside, "untouched");
symlinkSync(artifacts, join(boundary.cwd, "outside"));
for (const path of [outside, "../untouched.txt", "outside/untouched.txt"]) {
  for (const name of ["read", "ls", "write", "edit"]) await assert.rejects(execute(name, { path, content: "bad", edits: [] }), /restricted/);
}
assert.equal(readFileSync(outside, "utf8"), "untouched");
report.localChecks = "SDK extension guidance, real read/ls/edit/write boundary, failing/passing repository check, absolute/relative/symlink escape rejection";

const variants = args.includes("--matrix")
  ? [["gpt-6-astra", "medium"], ["gpt-6-astra", "high"], ["gpt-5.6-terra", "medium"]]
  : [[settings.defaultModel, settings.defaultThinkingLevel]];
if (args.includes("--live")) for (const [modelId, thinkingLevel] of variants) for (const scenario of selected) {
  const fixture = makeFixture(scenario);
  const sessionManager = SessionManager.inMemory(fixture.cwd);
  if (scenario.history) sessionManager.appendMessage({ role: "user", content: scenario.history, timestamp: Date.now() });
  const systemPrompt = fixturePrompt + (scenario.id.includes("acceptance") || scenario.id === "partial-not-approval" ? `\n\n${reviewRules}` : "");
  const resourceLoader = {
    getExtensions: () => ({ extensions: [], errors: [], runtime: sdk.createExtensionRuntime() }),
    getSkills: () => ({ skills: [], diagnostics: [] }), getPrompts: () => ({ prompts: [], diagnostics: [] }), getThemes: () => ({ themes: [], diagnostics: [] }),
    getAgentsFiles: () => ({ agentsFiles: [] }), getSystemPrompt: () => systemPrompt, getSystemPromptSource: () => undefined,
    getAppendSystemPrompt: () => [], getAppendSystemPromptSources: () => [], extendResources: () => {}, reload: async () => {},
  };
  const { session } = await createAgentSession({
    cwd: fixture.cwd, agentDir, modelRuntime: runtime, model: runtime.getModel("openai-codex", modelId), thinkingLevel,
    settingsManager: SettingsManager.inMemory({ retry: { enabled: false }, compaction: { enabled: false } }), resourceLoader,
    sessionManager, tools: fixture.tools.map((t) => t.name), customTools: fixture.tools,
  });
  let turns = 0;
  let bounded = false;
  const abort = () => { bounded = true; void session.abort(); };
  const timer = setTimeout(abort, 120000);
  const unsubscribe = session.subscribe((event) => {
    if (event.type === "message_end" && event.message.role === "assistant") {
      const text = textContent(event.message);
      if (text) fixture.calls.push({ name: "response", text });
    }
    if (event.type === "turn_end" && ++turns >= 10 && event.message.stopReason !== "stop") abort();
  });
  const result = { model: modelId, thinking: thinkingLevel, case: scenario.id, passed: false, failures: [] };
  try {
    await session.prompt(`${scenario.prompt}\n\nRepository ownership checks are complete. Work only in ${fixture.cwd}. Tools are deliberately limited; check is the repository validator. No git operations are requested.`);
    const last = session.messages.findLast((m) => m.role === "assistant");
    assert.ok(!bounded && last?.stopReason === "stop", "Run did not finish normally within its budget");
    const check = (name, fn) => { try { fn(); } catch { result.failures.push(name); } };
    check("question-count", () => assert.equal(fixture.calls.filter((c) => c.name === "ask_user").length, scenario.asks));
    for (const [path, expected] of Object.entries(scenario.expected)) check(`outcome:${path}`, () => {
      const actual = JSON.parse(readFileSync(join(fixture.cwd, path), "utf8"));
      for (const [key, value] of Object.entries(expected)) assert.deepEqual(actual[key], value);
      if (path !== "report.json") assert.deepEqual(actual, expected);
    });
    for (const path of scenario.protected ?? []) check(`unchanged:${path}`, () => assert.equal(readFileSync(join(fixture.cwd, path), "utf8"), encode(scenario.files[path])));
    for (const target of scenario.checks ?? []) check(`check:${target}`, () => assert.ok(fixture.calls.some((c) => c.name === "check" && c.target === target && c.passed)));
    for (const path of scenario.reads ?? []) check(`read:${path}`, () => assert.ok(fixture.calls.some((c) => c.name === "read" && c.path === path && c.passed)));
    if (scenario.answerBeforeWrite) check("answer-before-continuing", () => {
      const mutation = fixture.calls.findIndex((c) => ["edit", "write"].includes(c.name));
      assert.ok(mutation > 0 && fixture.calls.slice(0, mutation).some((c) => c.name === "response" && scenario.answerBeforeWrite.every((word) => c.text.includes(word))));
    });
    const writes = fixture.calls.filter((c) => ["edit", "write"].includes(c.name));
    check("mutation-scope", () => assert.ok(writes.every((c) => Object.hasOwn(scenario.expected, c.path) || c.path === "progress.md")));
    if (scenario.noWrites) check("read-only", () => assert.equal(writes.length, 0));
    result.passed = result.failures.length === 0;
  } catch {
    result.failures.push(bounded ? "budget-exhausted" : "provider-or-session-error");
  } finally {
    clearTimeout(timer); unsubscribe();
    const response = session.messages.filter((m) => m.role === "assistant").map((m) => textContent(m)).filter(Boolean);
    writeFileSync(join(fixture.cwd, "transcript.json"), JSON.stringify({ calls: fixture.calls, response }, null, 2));
    session.dispose();
  }
  Object.assign(result, { turns, asks: fixture.calls.filter((c) => c.name === "ask_user").length, calls: fixture.calls, fixture: fixture.cwd, promptSha256: createHash("sha256").update(systemPrompt).digest("hex") });
  report.runs.push(result);
  console.log(`${result.passed ? "PASS" : "FAIL"} ${modelId}:${thinkingLevel} ${scenario.id} ${result.failures.join(", ")}`);
  writeFileSync(join(artifacts, "report.json"), JSON.stringify(report, null, 2));
}
writeFileSync(join(artifacts, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, runs: report.runs.map(({ calls, fixture, ...r }) => r) }, null, 2));
if (report.runs.some((r) => !r.passed)) process.exitCode = 1;
