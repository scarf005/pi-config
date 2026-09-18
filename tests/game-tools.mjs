import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { agentDir, createToolCaller, loadSdk, root as config, textContent as text } from "./support.mjs";

assert.equal(process.env.PI_GAME_DESKTOP, "1", "Run through bin/game-desktop");
assert.equal(process.env.WAYLAND_DISPLAY, undefined);
assert.ok(process.env.AT_SPI_BUS_ADDRESS.includes(process.env.XDG_RUNTIME_DIR));
assert.equal(process.env.XDG_SESSION_TYPE, "x11");
assert.match(execFileSync("xdpyinfo", { encoding: "utf8" }), /1600x900 pixels/);

const modules = join(agentDir, "npm/node_modules");
process.env.PI_CODING_AGENT_DIR = agentDir;
process.env.PI_COMPUTER_USE_LINUX_HELPER_PATH = join(agentDir, "bin/computer-use-linux-bridge");
// Mirror bin/pi-game wiring: the managed browser runs through bin/pi-chrome,
// which adds --enable-unsafe-swiftshader for WebGL2 on the GPU-less display.
process.env.PI_COMPUTER_USE_CHROME_EXECUTABLE = join(config, "bin", "pi-chrome");
const { createAgentSession, DefaultResourceLoader, SessionManager, SettingsManager } = await loadSdk();
const settingsManager = SettingsManager.inMemory({ packages: [], retry: { enabled: false } });
const loader = new DefaultResourceLoader({
  cwd: config,
  agentDir,
  settingsManager,
  additionalExtensionPaths: [
    join(modules, "pi-mcp-adapter/index.ts"),
    join(modules, "@injaneity/pi-computer-use/extensions/computer-use.ts"),
  ],
});
await loader.reload();
assert.deepEqual(loader.getExtensions().errors, []);
const { session } = await createAgentSession({
  cwd: config, agentDir, resourceLoader: loader, settingsManager,
  sessionManager: SessionManager.inMemory(config),
});
await session.bindExtensions({ mode: "print" });
const call = createToolCaller({ session, timeoutMs: 30000, assertSuccess: true });
const mcp = async (tool, args = {}) => {
  const result = await call("mcp", { tool: `godot_${tool}`, args });
  assert.ok(!result.details?.mcpResult?.isError, text(result));
  return result;
};
const stateId = (result) => result.details.stateId ?? result.details.capture?.stateId;
const artifacts = await mkdtemp(join(tmpdir(), "pi-game-tools-test-"));
const server = createServer((_req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.end('<!doctype html><title>Game input test</title><button onclick="this.textContent=\'Clicked\'">Click me</button><input aria-label="Keyboard test"><canvas width="320" height="180"></canvas>');
});
try {
  await call("mcp", { connect: "godot" });
  assert.match(text(await mcp("get_godot_version")), /4\./);
  console.log("PASS: Pi loads Godot MCP and reports installed Godot 4");

  await writeFile(join(artifacts, "project.godot"), '[application]\nconfig/name="Game Tools Test"\nrun/main_scene="res://main.tscn"\n[display]\nwindow/size/viewport_width=640\nwindow/size/viewport_height=360\n[rendering]\nrenderer/rendering_method="gl_compatibility"\n');
  await writeFile(join(artifacts, "main.tscn"), '[gd_scene load_steps=2 format=3]\n[ext_resource type="Script" path="res://main.gd" id="1"]\n[node name="Test" type="Control"]\nscript = ExtResource("1")\n');
  await writeFile(join(artifacts, "main.gd"), 'extends Control\nfunc _ready():\n\tvar button = Button.new()\n\tbutton.text = "Godot MCP: running"\n\tbutton.size = Vector2(640, 360)\n\tbutton.pressed.connect(func(): button.text = "Godot MCP: clicked")\n\tadd_child(button)\n\tprint("GAME_TOOLS_READY")\nfunc _input(event):\n\tif event is InputEventKey and event.pressed:\n\t\tprint("GAME_TOOLS_KEY:", event.keycode)\n');
  console.log("Godot launch:", text(await mcp("run_project", { projectPath: artifacts })));
  execFileSync("xdotool", ["search", "--sync", "--onlyvisible", "--name", "Game Tools Test"], { timeout: 15000 });
  console.log("Godot debug:", text(await mcp("get_debug_output")));
  const native = await call("find_roots", { text: "Game Tools Test" });
  const root = text(native).match(/@r\d+/)?.[0];
  assert.ok(root, "Godot window discovered on virtual display");
  let view = await call("observe_ui", { root, mode: "visual" });
  view = await call("act_ui", {
    stateId: stateId(view), actions: [{ action: "click", x: 320, y: 180 }, { action: "keypress", keys: ["r"] }],
    expect: { text: "Godot MCP: clicked", timeoutMs: 5000 },
  });
  assert.match(text(view), /Godot MCP: clicked/);
  assert.match(text(await mcp("get_debug_output")), /GAME_TOOLS_KEY:82/);
  view = await call("observe_ui", { root, mode: "visual" });
  const image = view.content.find((block) => block.type === "image");
  assert.ok(image, "Godot screenshot returned through Pi computer use");
  await writeFile(join(artifacts, "godot.png"), Buffer.from(image.data ?? image.source?.data, "base64"));
  console.log("PASS: native Godot screenshot, coordinate click and R key verified through Pi computer use");
  await mcp("stop_project");

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  let browser = await call("launch_browser", { url: `http://127.0.0.1:${server.address().port}` });
  browser = await call("wait_for", { stateId: stateId(browser), text: "Click me", timeoutMs: 10000 });
  const match = await call("search_ui", { stateId: stateId(browser), role: "button", text: "Click me" });
  const button = text(match).match(/^(@e\d+) button "Click me"/m)?.[1];
  assert.ok(button, text(match));
  browser = await call("act_ui", {
    stateId: stateId(browser), actions: [{ action: "press", ref: button }],
    expect: { text: "Clicked", timeoutMs: 5000 },
  });
  assert.match(text(browser), /Clicked/);
  const value = await call("evaluate_browser", {
    stateId: stateId(browser),
    expression: 'new Promise((resolve) => { const c = document.createElement("canvas"); const gl2 = c.getContext("webgl2"); resolve({ title: document.title, clicked: document.querySelector("button")?.textContent, webgl2: !!gl2, renderer: gl2 ? gl2.getParameter(gl2.RENDERER) : null }); })',
  });
  assert.match(text(value), /Game input test/);
  assert.match(text(value), /"webgl2":\s*true/);
  console.log("PASS: browser navigation, button input and WebGL2 verified through Pi computer use");
  console.log(`Artifacts: ${artifacts}`);
} finally {
  server.close();
  await session.extensionRunner.emit({ type: "session_shutdown", reason: "quit" });
  session.dispose();
}

