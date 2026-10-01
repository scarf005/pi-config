// --live uses real child models; only completion-triggered parent replies are stubbed.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { agentDir, createToolCaller, loadSdk, root, sdkDir, textContent as text } from "./support.mjs";

const live = process.argv.includes("--live");
assert.ok(process.argv.slice(2).every((arg) => arg === "--live"));
const artifacts = mkdtempSync("/tmp/pi/subagent-replacement-test-");
process.env.PI_CODING_AGENT_DIR = agentDir;
process.env.PI_SUBAGENTS_PI_CODING_AGENT_PACKAGE_ROOT = sdkDir;
const require = createRequire(join(agentDir, "npm/package.json"));
const hostRequire = createRequire(join(sdkDir, "package.json"));
const { createJiti } = hostRequire("jiti");
const jiti = createJiti(import.meta.url, { alias: {
  "@earendil-works/pi-coding-agent": join(sdkDir, "dist/index.js"),
  ...Object.fromEntries(["pi-agent-core", "pi-ai", "pi-tui"].map((name) => [
    `@earendil-works/${name}`, join(sdkDir, "node_modules/@earendil-works", name, "dist/index.js"),
  ])),
  typebox: join(sdkDir, "node_modules/typebox/build/index.mjs"),
} });
const { resolveSubagentLaunchContract } = await jiti.import(require.resolve("pi-subagents/preflight"));
const { createAssistantMessageEventStream } = await import(pathToFileURL(join(sdkDir, "node_modules/@earendil-works/pi-ai/dist/index.js")));
const { createAgentSession, DefaultResourceLoader, ModelRuntime, parseFrontmatter, SessionManager, SettingsManager } = await loadSdk();
const settings = JSON.parse(readFileSync(join(agentDir, "settings.json"), "utf8"));
const source = (pkg) => typeof pkg === "string" ? pkg : pkg.source;
assert.ok(settings.packages.some((pkg) => source(pkg) === "npm:pi-subagents@0.74.0"));
assert.ok(!settings.packages.some((pkg) => source(pkg).includes("@parke.dev/pi-subagent")));
assert.ok(!existsSync(join(agentDir, "npm/node_modules/@parke.dev/pi-subagent")));
const manifest = JSON.parse(readFileSync(join(agentDir, "npm/package.json"), "utf8"));
const lock = JSON.parse(readFileSync(join(agentDir, "npm/package-lock.json"), "utf8"));
assert.equal(manifest.dependencies["pi-subagents"], "0.74.0");
assert.equal(lock.packages[""].dependencies["pi-subagents"], "0.74.0");
assert.equal(lock.packages["node_modules/pi-subagents"].version, "0.74.0");
const config = JSON.parse(readFileSync(join(agentDir, "extensions/subagent/config.json"), "utf8"));
assert.equal(config.asyncByDefault, false);
assert.ok(config.disabledFeatures.includes("workflow-scripts"));
assert.equal(config.intercomBridge.mode, "off");
assert.equal(settings.subagents.disableBuiltins, true);
const settingsManager = SettingsManager.inMemory(settings);
const loader = new DefaultResourceLoader({ cwd: root, agentDir, settingsManager });
await loader.reload();
assert.deepEqual(loader.getExtensions().errors, [], "All configured extensions load");
assert.deepEqual(loader.getSkills().diagnostics, [], "Skill discovery remains valid");
const runtime = await ModelRuntime.create({
  authPath: join(agentDir, "auth.json"), modelsPath: join(agentDir, "models.json"),
  modelsStorePath: join(agentDir, "models-store.json"), allowModelNetwork: false,
  signal: AbortSignal.timeout(15000),
});
const { session } = await createAgentSession({
  cwd: root, agentDir, settingsManager, resourceLoader: loader, modelRuntime: runtime,
  sessionManager: SessionManager.create(root, join(artifacts, "parent")),
});
const call = createToolCaller({ session, timeoutMs: 1800000, assertSuccess: true });
const roles = ["planner", "investigator", "oracle", "reviewer", "worker"];
let parentTurns = 0;
// Prevent completion notifications from spending parent-model tokens or calling more tools.
// Child sessions resolve their own real model and stream independently.
session.agent.streamFunction = (model) => {
  parentTurns++;
  const stream = createAssistantMessageEventStream();
  const message = {
    role: "assistant", content: [{ type: "text", text: "completion received" }],
    api: model.api, provider: model.provider, model: model.id, stopReason: "stop",
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
    timestamp: Date.now(),
  };
  stream.push({ type: "done", reason: "stop", message });
  return stream;
};
const save = (name, result) => writeFileSync(join(artifacts, name), JSON.stringify(result, null, 2));
const transcriptRecords = (result) => readFileSync(result.transcriptPath, "utf8")
  .trim().split("\n").map((line) => JSON.parse(line));
const containsRead = (result) => result.details.results.every((child) => transcriptRecords(child)
  .some((record) => record.recordType === "tool_end" && record.toolName === "read" && !record.isError));
try {
  await session.bindExtensions({ mode: "print" });
  if (!session.getActiveToolNames().includes("subagent")) await call("subagents_enable", {});
  assert.ok(!session.getAllTools().some((tool) => tool.name === "subagent_wait"));
  const catalog = await call("subagent", { action: "list", capabilities: true });
  save("catalog.json", catalog);
  for (const name of roles) {
    assert.ok(text(catalog).includes(name), `Advertised role: ${name}`);
    const { frontmatter } = parseFrontmatter(readFileSync(join(agentDir, "agents", `${name}.md`), "utf8"));
    assert.equal(frontmatter.async, false);
    assert.equal(Number(frontmatter.timeoutMs), 1800000);
    assert.equal(frontmatter.profile, undefined);
    assert.equal(frontmatter.spawns, undefined);
    assert.equal(frontmatter.fallback_models, undefined);
    const inspected = await call("subagent", { action: "get", agent: name });
    save(`${name}-definition.json`, inspected);
    const result = await resolveSubagentLaunchContract({
      agent: name, task: "Inspect this supplied artifact.", cwd: root, context: "fresh",
      availableModels: await runtime.getAvailable(),
      parentModel: session.model, parentSessionFile: session.sessionManager.getSessionFile(),
      parentSessionId: session.sessionManager.getSessionId(),
      intercomBridge: { mode: "off" },
    });
    save(`${name}-contract.json`, result);
    assert.ok(result.ok, JSON.stringify(result));
    const contract = result.contract;
    assert.ok(contract.model.startsWith(frontmatter.model), `Preserved model: ${name}`);
    assert.equal(contract.thinking, frontmatter.thinking);
    assert.equal(contract.tools.explicitAllowlist, true);
    assert.equal(contract.tools.fanoutAuthorized, false);
    const tools = contract.tools.effectiveAllowlist;
    if (name === "worker") {
      assert.ok(["bash", "edit", "write"].every((tool) => tools.includes(tool)));
    } else {
      assert.ok(!["bash", "edit", "write", "subagent"].some((tool) => tools.includes(tool)));
      assert.ok(["read", "grep", "find", "ls"].every((tool) => tools.includes(tool)));
      if (name === "investigator") {
        assert.ok(["web_search", "fetch_content", "get_search_content", "source_check"].every((tool) => tools.includes(tool)));
        assert.ok(contract.tools.configuredExtensions.some((path) => path.includes("pi-web-access")));
      }
    }
  }
  console.log("PASS: replacement load, five role contracts, explicit read-only/web/writer tools, no nested fanout");
  console.log(`Effective SDK prompt: ${Buffer.byteLength(session.systemPrompt)} UTF-8 bytes`);

  if (live) {
    const marker = randomUUID();
    const fixture = join(artifacts, "marker.txt");
    writeFileSync(fixture, marker);
    const task = `Read ${fixture} with read. Return only its exact contents. Do not delegate or edit files.`;
    // Omit async deliberately: the ordinary configured path must return the actual result.
    const direct = await call("subagent", { agent: "reviewer", task });
    save("foreground.json", direct);
    assert.ok(text(direct).includes(marker), "Foreground returns observed marker, not a launch receipt");
    assert.ok(containsRead(direct), "Real reviewer actually called read");
    const parallel = await call("subagent", {
      tasks: ["planner", "investigator"].map((agent) => ({ agent, task })), async: false,
    });
    save("parallel.json", parallel);
    assert.equal(parallel.details.results.length, 2);
    assert.ok(parallel.details.results.every((result) => JSON.stringify(result).includes(marker)));
    assert.equal(parentTurns, 0, "Foreground results cause no extra parent completion turn");
    console.log("PASS: actual foreground marker read and independent parallel child results");

    const background = await call("subagent", {
      agent: "reviewer", task, async: true, sessionDir: join(artifacts, "children"),
    });
    save("background-launch.json", background);
    const id = background.details.runId ?? background.details.id;
    assert.ok(id, JSON.stringify(background));
    const completed = await call("bg_wait", { id, timeoutMs: 1800000, stopOnAttention: false });
    save("background-wait.json", completed);
    const completion = completed.details.completions.find((entry) => entry.runId === id);
    assert.equal(completion.success, true);
    const archive = JSON.parse(readFileSync(completion.archivePath, "utf8"));
    assert.ok(archive.entries.some((entry) => readFileSync(entry.path, "utf8").includes(marker)),
      "Background wait exposes a readable archive containing the substantive result");
    await new Promise((resolve) => setTimeout(resolve, 2500));
    await session.waitForIdle();
    const turnsAfterDelivery = parentTurns;
    const again = await call("bg_wait", { id, timeoutMs: 1000, stopOnAttention: false });
    save("background-replay.json", again);
    const replay = again.details.completions.find((entry) => entry.runId === id);
    assert.equal(replay.archivePath, completion.archivePath, "Repeated collection recovers the same archive");
    await new Promise((resolve) => setTimeout(resolve, 2500));
    await session.waitForIdle();
    assert.equal(parentTurns, turnsAfterDelivery, "Recollection causes no duplicate parent wake");
    assert.equal(parentTurns, 1, "Exactly one completion-triggered stub parent turn");
    assert.equal(readFileSync(fixture, "utf8"), marker);
    console.log("PASS: actual background wait, archived result replay, no duplicate completion wake");
  }
  console.log(`Artifacts: ${artifacts}`);
} finally {
  await session.extensionRunner.emit({ type: "session_shutdown", reason: "quit" });
  session.dispose();
}
