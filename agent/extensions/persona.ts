/**
 * Ports the Claude Code persona hooks: inject the active persona and its per-prompt sticker
 * candidates into every request, then block a settled run that ends without sticker images
 * (`show_sticker` calls) or whose visible text is not Korean.
 *
 * Index format (persona/stickers/<persona>.tsv): first line `dir<TAB>absolute pack directory`,
 * then `file<TAB>moods<TAB>text`. GIF stickers are skipped because the tool draws PNG only.
 *
 * Stickers get their own `show_sticker` tool and entry: `show_image` draws them at 60 cells, which
 * is 2-3 times the natural size of a 200x200 sticker and repaints a large area on every scroll.
 */

import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join, resolve, sep } from "node:path";
import type { ExtensionAPI, ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import { Container, Image, Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";

type Row = { file: string; moods: string[]; text: string };
type Pack = { dir: string; rows: Row[] };

/** Cells wide enough for a 200x200 sticker to keep its pixel size. */
export const STICKER_WIDTH_CELLS = 16;

const personaDir = () => process.env.PI_PERSONA_DIR ?? join(homedir(), ".config/persona");

export const STICKER_ENTRY = "persona-sticker";

/** The persona file `active.md` points at. */
export function activePersona(dir = personaDir()): { stem: string; text: string } | undefined {
  try {
    const path = realpathSync(join(dir, "active.md"));
    return { stem: basename(path, ".md"), text: readFileSync(path, "utf8") };
  } catch {
    return undefined;
  }
}

/** Sticker rows the tool can draw: PNG files that exist. */
export function readPack(stem: string, dir = personaDir()): Pack | undefined {
  let lines: string[];
  try {
    lines = readFileSync(join(dir, "stickers", `${stem}.tsv`), "utf8").split("\n").filter((line) => line);
  } catch {
    return undefined;
  }
  const [head, ...rows] = lines.map((line) => line.split("\t"));
  const packDir = head[1];
  if (!packDir) return undefined;
  const usable = rows.flatMap(([file, moods, text]) =>
    file?.endsWith(".png") && moods && text && existsSync(join(packDir, file))
      ? [{ file, moods: moods.split(" "), text }]
      : []
  );
  return usable.length ? { dir: packDir, rows: usable } : undefined;
}

/** One sticker per mood, chosen at random so repeated prompts vary. */
export function stickerCandidates(pack: Pack, random = Math.random): string {
  const moods = [...new Set(pack.rows.flatMap((row) => row.moods))].sort();
  return moods
    .map((mood) => {
      const rows = pack.rows.filter((row) => row.moods.includes(mood));
      const row = rows[Math.floor(random() * rows.length)];
      return `- ${mood}: ${join(pack.dir, row.file)} (${row.text})`;
    })
    .join("\n");
}

/** Pack directories of every persona, because `active.md` is shared by all running sessions. */
export function packDirs(dir = personaDir()): string[] {
  try {
    return readdirSync(join(dir, "stickers"))
      .filter((name) => name.endsWith(".tsv"))
      .flatMap((name) => {
        const head = readFileSync(join(dir, "stickers", name), "utf8").split("\n")[0]?.split("\t")[1];
        return head ? [head] : [];
      });
  } catch {
    return [];
  }
}

export function renderSticker(data: { path?: string; caption?: string } | undefined, theme: Theme): Container {
  const container = new Container();
  if (!data?.path) {
    container.addChild(new Text(theme.fg("warning", "sticker entry without a path"), 1, 0));
    return container;
  }
  if (data.caption) container.addChild(new Text(theme.fg("accent", data.caption), 1, 0));
  try {
    container.addChild(new Image(
      readFileSync(data.path).toString("base64"),
      "image/png",
      { fallbackColor: (text) => theme.fg("muted", text) },
      { maxWidthCells: STICKER_WIDTH_CELLS, filename: basename(data.path) },
    ));
  } catch {
    container.addChild(new Text(theme.fg("warning", `The sticker ${data.path} is no longer available.`), 1, 0));
  }
  return container;
}

export function isSticker(path: string, dirs: string[]): boolean {
  if (!path.trim()) return false;
  const full = resolve(path);
  return dirs.some((dir) => full === dir || full.startsWith(dir + sep));
}

const HANGUL = /[가-힣]/g;
const LATIN = /[A-Za-z]/g;
const RUN = /\b[A-Za-z]{2,}(?:[ ,]+[A-Za-z]{2,}){3}\b/;
const CODE = /```[\s\S]*?```|`[^`\n]*`|"[^"\n]*"|[^\s`]*\/[^\s`]*/g;

/** English prose in the reply: 4+ consecutive Latin words with fewer than half as many Hangul letters. */
export function isEnglish(text: string): boolean {
  return text.split("\n").some((line) => {
    if (line.trimStart().startsWith("|")) return false;
    const plain = line.replace(CODE, "");
    return RUN.test(plain) &&
      (plain.match(HANGUL)?.length ?? 0) * 2 < (plain.match(LATIN)?.length ?? 0);
  });
}

/** Assistant text of the run: everything after the last user message. */
export function replyText(ctx: ExtensionContext): string {
  const branch = ctx.sessionManager.getBranch();
  const lastUser = branch.findLastIndex((entry) => entry.type === "message" && entry.message.role === "user");
  return branch.slice(lastUser + 1)
    .flatMap((entry) =>
      entry.type === "message" && entry.message.role === "assistant"
        ? entry.message.content
        : []
    )
    .flatMap((block) => block.type === "text" ? [block.text] : [])
    .join("\n");
}

export default function personaExtension(pi: ExtensionAPI): void {
  if ((process.env.PI_SUBAGENT_DEPTH ?? "0") !== "0") return;

  let nudged = false;
  let shown = 0;

  pi.registerEntryRenderer<{ path?: string; caption?: string }>(
    STICKER_ENTRY,
    (entry, _options, theme) => renderSticker(entry.data, theme),
  );

  pi.registerTool({
    name: "show_sticker",
    label: "Show sticker",
    description: "Show a persona sticker inline in the terminal at sticker size, next to the reply. The image is not sent to you.",
    promptSnippet: "Show a persona sticker from the injected candidates inline at sticker size",
    promptGuidelines: ["Call show_sticker once per sticker, with the sticker text as the caption."],
    parameters: Type.Object({
      path: Type.String({ description: "Absolute path of the sticker PNG from the candidate list" }),
      caption: Type.Optional(Type.String({ description: "The sticker text" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const path = resolve(ctx.cwd, params.path);
      if (!existsSync(path)) throw new Error(`No sticker at ${path}.`);
      pi.appendEntry(STICKER_ENTRY, { path, caption: params.caption?.trim() || undefined });
      return { content: [{ type: "text", text: `Showed ${path} to the user.` }], details: undefined };
    },
  });

  pi.on("before_agent_start", (event, ctx) => {
    if (event.messageType === "user") {
      nudged = false;
      shown = 0;
    }
    const persona = activePersona();
    if (!persona) {
      delete event.systemPromptOptions.sections.persona;
      delete event.systemPromptOptions.sections.stickers;
      return;
    }
    event.systemPromptOptions.sections.persona =
      `## Reply persona\n\nThe user-visible text of this session uses the ${persona.stem} voice below.\n\n${persona.text}`;
    const pack = ctx.hasUI ? readPack(persona.stem) : undefined;
    if (pack) {
      event.systemPromptOptions.sections.stickers =
        `## Stickers\n\nEnd every reply with 1-3 stickers whose mood fits it: call show_sticker once per sticker with its absolute path and the sticker text as the caption. Write no sticker paths as text. Candidates per mood:\n${stickerCandidates(pack)}`;
    } else {
      delete event.systemPromptOptions.sections.stickers;
    }
  });

  pi.on("tool_execution_end", (event) => {
    const path = (event.args as { path?: unknown } | undefined)?.path;
    if (event.toolName === "show_sticker" && typeof path === "string" && isSticker(path, packDirs())) shown++;
  });

  pi.on("agent_before_settle", (event, ctx) => {
    if (nudged) return;
    const persona = activePersona();
    const pack = persona && readPack(persona.stem);
    const nudges: string[] = [];
    if (pack && shown === 0 && ctx.hasUI && pi.getActiveTools().includes("show_sticker")) {
      nudges.push(
        "End the reply with 1-3 stickers: call show_sticker once per sticker whose mood fits the reply, with its absolute path and the sticker text as the caption. Write no sticker paths and do not mention this check. Candidates per mood:\n" +
          stickerCandidates(pack),
      );
    }
    if (isEnglish(replyText(ctx))) {
      nudges.push(
        "Reply to the user again in Korean, in the persona voice from the global instructions. Give only the substantive answer; do not mention this check, a language violation, or an apology, and do not quote the earlier text (code, paths and commands may stay as is).",
      );
    }
    if (!nudges.length) return;
    nudged = true;
    return {
      entries: [
        ...event.entries,
        { type: "custom_message", customType: "persona-gate", content: nudges.join("\n\n"), display: false },
      ],
      continue: true,
    };
  });
}
