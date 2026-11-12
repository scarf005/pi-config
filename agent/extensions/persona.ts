/**
 * Ports the Claude Code persona hooks: inject the active persona and its per-prompt sticker
 * candidates into every request, then block a settled run that ends without sticker images
 * (`show_image` calls) or whose visible text is not Korean.
 *
 * Index format (persona/stickers/<persona>.tsv): first line `dir<TAB>absolute pack directory`,
 * then `file<TAB>moods<TAB>text`. GIF stickers are skipped because `show_image` draws PNG only.
 */

import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join, resolve, sep } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

type Row = { file: string; moods: string[]; text: string };
type Pack = { dir: string; rows: Row[] };

const personaDir = () => process.env.PI_PERSONA_DIR ?? join(homedir(), ".config/persona");

/** The persona file `active.md` points at. */
export function activePersona(dir = personaDir()): { stem: string; text: string } | undefined {
  try {
    const path = realpathSync(join(dir, "active.md"));
    return { stem: basename(path, ".md"), text: readFileSync(path, "utf8") };
  } catch {
    return undefined;
  }
}

/** Sticker rows that `show_image` can draw: PNG files that exist. */
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
        `## Stickers\n\nEnd every reply with 1-3 stickers whose mood fits it: call show_image once per sticker with its absolute path and the sticker text as the caption. Write no sticker paths as text. Candidates per mood:\n${stickerCandidates(pack)}`;
    } else {
      delete event.systemPromptOptions.sections.stickers;
    }
  });

  pi.on("tool_execution_end", (event) => {
    const path = (event.args as { path?: unknown } | undefined)?.path;
    if (event.toolName === "show_image" && typeof path === "string" && isSticker(path, packDirs())) shown++;
  });

  pi.on("agent_before_settle", (event, ctx) => {
    if (nudged) return;
    const persona = activePersona();
    const pack = persona && readPack(persona.stem);
    const nudges: string[] = [];
    if (pack && shown === 0 && ctx.hasUI && pi.getActiveTools().includes("show_image")) {
      nudges.push(
        "End the reply with 1-3 stickers: call show_image once per sticker whose mood fits the reply, with its absolute path and the sticker text as the caption. Write no sticker paths and do not mention this check. Candidates per mood:\n" +
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
