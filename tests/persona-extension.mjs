import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { root } from "./support.mjs";

const require = createRequire(join(root, "agent/npm/package.json"));
const jiti = require("jiti")(import.meta.url);

const dir = mkdtempSync(join(tmpdir(), "persona-"));
const pack = join(dir, "pack");
mkdirSync(pack);
for (const file of ["001.png", "002.png"]) writeFileSync(join(pack, file), "");
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
process.env.PI_PERSONA_DIR = dir;

const extension = await jiti.import(join(root, "agent/extensions/persona.ts"), { default: true });
const handlers = new Map();
const pi = {
  on: (name, handler) => handlers.set(name, handler),
  getActiveTools: () => ["show_image"],
};
extension(pi);
assert.deepEqual([...handlers.keys()], ["before_agent_start", "tool_execution_end", "agent_before_settle"]);
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

const ctx = (text, role = "assistant") => ({
  hasUI: true,
  sessionManager: {
    getBranch: () => [
      { type: "message", message: { role: "user", content: [{ type: "text", text: "물어봤어요" }] } },
      { type: "message", message: { role, content: [{ type: "text", text }] } },
    ],
  },
});
const settle = (context) => handlers.get("agent_before_settle")({ entries: [] }, context);

prompt();
const missing = settle(ctx("끝이에요"));
assert.equal(missing.continue, true);
assert.equal(missing.entries.at(-1).customType, "persona-gate");
assert.match(missing.entries.at(-1).content, /show_image/);
assert.match(missing.entries.at(-1).content, new RegExp(pack), "nudges with the sticker candidates");
assert.equal(settle(ctx("끝이에요")), undefined, "nudges once per prompt");

prompt();
handlers.get("tool_execution_end")({ toolName: "show_image", args: { path: join(pack, "001.png") } });
assert.equal(settle(ctx("보여드렸어요")), undefined, "a shown sticker and a Korean reply pass");

prompt();
handlers.get("tool_execution_end")({ toolName: "show_image", args: { path: "/tmp/screenshot.png" } });
const english = settle(ctx("The build passes and all tests ran clean."));
assert.match(english.entries.at(-1).content, /Korean/, "blocks English prose");

prompt();
handlers.get("tool_execution_end")({ toolName: "show_image", args: { path: `${pack}/001.png` } });
assert.equal(settle(ctx("경로는 /tmp/a/b.ts 와 `npm test` 입니다")), undefined, "code and paths are not prose");

process.env.PI_SUBAGENT_DEPTH = "1";
extension({ on: () => assert.fail("subagents must not inject a persona") });
delete process.env.PI_SUBAGENT_DEPTH;
rmSync(dir, { recursive: true });

console.log("Pi persona extension: injection, sticker gate and Korean gate passed");
