// Installed package/SDK checks; --live also starts real read-only child processes.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { agentDir, createToolCaller, loadSdk, root, sdkDir, textContent as text } from "./support.mjs";

const live = process.argv.includes("--live");
assert.ok(process.argv.slice(2).every((arg) => arg === "--live"));
const artifacts = mkdtempSync(join(tmpdir(), "pi-subagent-test-"));
process.env.PI_CODING_AGENT_DIR = agentDir;
process.env.PI_SUBAGENT_SESSION_DIR = join(artifacts, "sessions");
process.env.PI_SUBAGENT_WORKTREE_DIR = join(artifacts, "worktrees");
process.env.PI_SUBAGENT_LOCK_DIR = join(artifacts, "locks");
process.env.PI_SUBAGENT_NOTIFICATIONS = "off";
// SDK hosts have their own argv[1]; pin the real CLI rather than respawning this test.
process.env.PI_SUBAGENT_BIN = realpathSync(join(sdkDir, "dist/cli.js"));
const { createAgentSession, DefaultResourceLoader, ModelRuntime, parseFrontmatter, SessionManager, SettingsManager } = await loadSdk();
const settings = JSON.parse(readFileSync(join(agentDir, "settings.json"), "utf8"));
const source = (pkg) => typeof pkg === "string" ? pkg : pkg.source;
assert.ok(settings.packages.some((pkg) => source(pkg).startsWith("npm:@parke.dev/pi-subagent@")));
assert.ok(!settings.packages.some((pkg) => /^npm:pi-subagents(?:@|$)/.test(source(pkg))));
assert.equal(settings.subagents, undefined, "Obsolete Nico settings were migrated");
const settingsManager = SettingsManager.inMemory(settings);
const loader = new DefaultResourceLoader({ cwd: root, agentDir, settingsManager });
await loader.reload();
assert.deepEqual(loader.getExtensions().errors, [], "All enabled extensions still load");
assert.deepEqual(loader.getSkills().diagnostics, [], "Skill discovery remains valid");
const runtime = await ModelRuntime.create({
  authPath: join(agentDir, "auth.json"), modelsPath: join(agentDir, "models.json"),
  modelsStorePath: join(agentDir, "models-store.json"), allowModelNetwork: false,
  signal: AbortSignal.timeout(15000),
});
const { session } = await createAgentSession({
  cwd: root, agentDir, settingsManager, resourceLoader: loader, modelRuntime: runtime,
  sessionManager: SessionManager.inMemory(root),
});
const call = createToolCaller({ session, timeoutMs: 180000 });
const readOnly = ["read", "grep", "find", "ls"];
try {
  await session.bindExtensions({ mode: "print" });
  const catalog = text(await call("subagent", { action: "status" }));
  const availableTools = session.getAllTools().map((tool) => tool.name);
  const safeReadOnly = ["read", "grep", "find", "ls", "firecrawl_scrape", "firecrawl_search", "firecrawl_map", "firecrawl_crawl", "web_search", "web_fetch"];
  for (const name of ["planner", "investigator", "oracle", "reviewer", "worker"]) {
    assert.ok(catalog.includes(name), `Catalog advertises ${name}`);
    const { frontmatter } = parseFrontmatter(readFileSync(join(agentDir, "agents", `${name}.md`), "utf8"));
    const { details: { plan: [plan] } } = await call("subagent", { action: "plan", agent: name, task: "Validate this configuration without executing work." });
    assert.equal(plan.model, frontmatter.model);
    assert.equal(plan.thinking, frontmatter.thinking);
    assert.equal(plan.profile, frontmatter.profile);
    assert.equal(frontmatter.spawns, false);
    assert.equal(plan.budgets.timeoutMs, 1800000);
    for (const model of [frontmatter.model, ...frontmatter.fallback_models]) {
      const separator = model.indexOf("/");
      assert.ok(runtime.getModel(model.slice(0, separator), model.slice(separator + 1)), `Configured model exists: ${model}`);
    }
    if (name === "worker") {
      assert.equal(plan.access, "RW");
      assert.ok(["bash", "edit", "write"].every((tool) => plan.tools.includes(tool)));
    } else {
      assert.equal(plan.access, "RO");
      const expectedTools = name === "investigator" ? safeReadOnly.filter((tool) => availableTools.includes(tool)) : readOnly;
      assert.deepEqual(plan.tools, expectedTools);
      if (name === "investigator") {
        assert.equal(frontmatter.tools, undefined, "Investigator must inherit the safe available-tool intersection");
        if (availableTools.includes("web_search")) assert.ok(plan.tools.includes("web_search"), "Available web_search must remain available to investigator");
      }
    }
  }
  const { details: { plan } } = await call("subagent", {
    action: "plan", tasks: ["reviewer", "oracle"].map((agent) => ({ agent, task: "Inspect only." })),
  });
  assert.equal(plan.length, 2);
  assert.ok(plan.every((entry) => entry.access === "RO"));
  for (const agent of ["reviewer", "oracle"]) {
    await assert.rejects(call("subagent", { action: "plan", agent, task: "Check permissions.", tools: ["bash"] }), /strictly read-only/);
  }
  await assert.rejects(call("subagent", {
    action: "plan", tasks: [{ agent: "worker", task: "First edit." }, { agent: "worker", task: "Second edit." }],
  }), /Parallel writers share/);
  console.log("PASS: package replacement, all-extension load, model/persona resolution, read-only and parallel-write guards");
  console.log(`SDK prompt (global + repository + active extensions): ${Buffer.byteLength(session.systemPrompt)} UTF-8 bytes`);

  if (live) {
    const fixture = join(artifacts, "marker.txt");
    const marker = randomUUID();
    writeFileSync(fixture, marker);
    const task = `Read ${fixture} with the read tool. Return only its exact contents. Do not edit files, execute commands, or delegate.`;
    const parallel = await call("subagent", {
      tasks: ["reviewer", "planner", "investigator"].map((agent) => ({ agent, task, timeout_ms: 120000 })),
    });
    assert.ok(text(parallel).includes(marker), "Parallel children returned the observed fixture");
    assert.equal(parallel.details.results.length, 3);
    assert.ok(parallel.details.results.every((result) => result.state === "completed" && result.finalOutput.includes(marker)));
    const investigated = parallel.details.results.find((result) => result.label === "investigator");
    assert.match(investigated?.transcript ?? "", /read/i, "Live investigator actually used a read-only tool");
    const background = await call("subagent", { agent: "reviewer", task, async: true, timeout_ms: 120000 });
    const id = text(background).match(/Started run ([^.\s]+)\./)?.[1];
    assert.ok(id, "Background run returned an id");
    const completed = await call("subagent_wait", { id, timeout_ms: 150000 });
    assert.ok(text(completed).includes(marker));
    const child = completed.details.results[0];
    assert.equal(child.state, "completed");
    assert.ok(child.sessionId, "Child session is resumable");
    const resumed = await call("subagent", {
      agent: "reviewer", resume: child.sessionId, timeout_ms: 120000,
      task: "Return only the exact marker you read in your previous turn. Do not use tools.",
    });
    assert.ok(text(resumed).includes(marker), "Resumed child retained its own context");
    assert.equal(readFileSync(fixture, "utf8"), marker, "Read-only children left the fixture unchanged");
    console.log("PASS: real parallel reviewer/planner, background wait, and child-session resume");
  }
  console.log(`Artifacts: ${artifacts}`);
} finally {
  await session.extensionRunner.emit({ type: "session_shutdown", reason: "quit" });
  session.dispose();
}
