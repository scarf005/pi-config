import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { root } from "./support.mjs";

const require = createRequire(join(root, "agent/npm/package.json"));

const dir = mkdtempSync(join(tmpdir(), "persona-"));
const pack = join(dir, "pack");
mkdirSync(pack);
for (const file of ["001.png", "002.png"]) writeFileSync(join(pack, file), "");
writeFileSync(join(dir, "outside.png"), "");
writeFileSync(join(dir, "nagisa.md"), "# Nagisa\n\nVoice: calm.");
symlinkSync("nagisa.md", join(dir, "active.md"));
mkdirSync(join(dir, "stickers"));
writeFileSync(
  join(dir, "stickers/nagisa.tsv"),
  [
    `dir\t${pack}`,
    "001.png\tsuccess\t좋네요",
    "002.png\tsuccess fail\t죄송해요",
    "003.png\tfailure\t없는 파일",
    "004.gif\tgreet\t움짤",
  ].join("\n"),
);
// Pi resolves these for extensions at runtime; the test supplies minimal stubs.
for (const [name, source] of Object.entries({
  "pi-tui.js": "export class Container { addChild() { return this } } export class Text {} export class Image {}",
  "typebox.js": "export const Type = { Object: (o) => o, String: (o) => o, Optional: (o) => o }",
})) writeFileSync(join(dir, name), source);
const jiti = require("jiti")(import.meta.url, {
  alias: {
    "@earendil-works/pi-tui": join(dir, "pi-tui.js"),
    typebox: join(dir, "typebox.js"),
  },
});

process.env.PI_PERSONA_DIR = dir;

const extension = await jiti.import(join(root, "agent/extensions/persona.ts"), { default: true });
const handlers = new Map();
const tools = new Map();
const pi = {
  on: (name, handler) => handlers.set(name, handler),
  getActiveTools: () => ["show_sticker"],
  registerEntryRenderer: () => {},
  registerTool: (tool) => tools.set(tool.name, tool),
  appendEntry: () => {},
};
extension(pi);
assert.deepEqual([...handlers.keys()], ["tool_call", "before_agent_start", "agent_before_settle"]);
const prompt = (hasUI = true) => {
  const event = { messageType: "user", systemPromptOptions: { sections: {} } };
  handlers.get("before_agent_start")(event, { hasUI });
  return event.systemPromptOptions.sections;
};

const sections = prompt();
assert.match(sections.persona, /Nagisa[\s\S]*calm/, "injects the text of the persona active.md points at");
const rows = sections.stickers.split("\n").filter((line) => line.startsWith("- "));
assert.deepEqual(rows.map((line) => line.split(":")[0]), ["- fail", "- success"], "lists every mood of the pack");
assert.ok(rows.every((line) => /^\- (fail|success): .*\/(001|002)\.png \((좋네요|죄송해요)\)$/.test(line)), sections.stickers);
assert.ok(!sections.stickers.includes("003.png"), "skips rows whose file does not exist");
assert.ok(!sections.stickers.includes("004.gif"), "skips GIF rows, since show_image draws PNG only");
assert.ok(!("stickers" in prompt(false)), "no sticker instruction without a terminal to draw in");

const ctx = (text) => ({
  cwd: dir,
  hasUI: true,
  sessionManager: {
    getBranch: () => [
      { type: "message", message: { role: "user", content: [{ type: "text", text: "물어봤어요" }] } },
      { type: "message", message: { role: "assistant", content: text ? [{ type: "text", text }] : [] } },
    ],
  },
});
const settle = (context) => handlers.get("agent_before_settle")({ entries: [] }, context);
const show = (path, context, toolCallId = path) => {
  handlers.get("tool_call")({ toolName: "show_sticker", toolCallId }, context);
  return tools.get("show_sticker").execute(toolCallId, { path }, undefined, undefined, context);
};

prompt();
const missing = settle(ctx("끝이에요"));
assert.equal(missing.continue, true);
assert.equal(missing.entries.at(-1).customType, "persona-gate");
assert.match(missing.entries.at(-1).content, /show_sticker/);
assert.match(missing.entries.at(-1).content, new RegExp(pack), "nudges with the sticker candidates");
assert.equal(settle(ctx("끝이에요")), undefined, "nudges once per prompt");

prompt();
const drawn = await show(join(pack, "001.png"), ctx("끝이에요"));
assert.equal(drawn.terminate, true, "ends the batch once the reply text is on screen");
assert.equal(settle(ctx("보여드렸어요")), undefined, "a shown sticker and a Korean reply pass");

prompt();
const early = await show(join(pack, "002.png"), ctx(""));
assert.equal(early.terminate, false, "keeps the turn open when the sticker comes before any reply text");

prompt();
await show(join(dir, "outside.png"), ctx("끝이에요"));
const english = settle(ctx("The build passes and all tests ran clean."));
assert.match(english.entries.at(-1).content, /Korean/, "blocks English prose");
assert.match(english.entries.at(-1).content, /show_sticker/, "a picture outside the sticker pack is not a sticker");

prompt();
await show(`${pack}/001.png`, ctx("끝이에요"));
assert.equal(settle(ctx("경로는 /tmp/a/b.ts 와 `npm test` 입니다")), undefined, "code and paths are not prose");

process.env.PI_SUBAGENT_DEPTH = "1";
extension({ on: () => assert.fail("subagents must not inject a persona") });
delete process.env.PI_SUBAGENT_DEPTH;
rmSync(dir, { recursive: true });

console.log("Pi persona extension: injection, sticker gate and Korean gate passed");
