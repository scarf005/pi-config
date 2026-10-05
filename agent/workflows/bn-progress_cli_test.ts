import { match, strictEqual } from "node:assert"
import { coordination, goal, output, sha } from "./bn-progress.ts"

const deno = "/home/scarf/.local/share/deno/bin/deno"
const cache =
  "/home/scarf/.config/pi/agent/pi-subagents/bn-progress-20261005/cache/deno"
const helper = new URL("./bn-progress.ts", import.meta.url).pathname

// This CLI test needs only the named Deno executable grant. Its child explicitly
// denies network, subprocesses, and writes to the real delivered baseline.
Deno.test("CLI preserves undated critical blockers after a same-permissions dated control", async (t) => {
  const directory = await Deno.makeTempDir({
    dir: output,
    prefix: "test-undated-",
  })
  console.log(`Controlled CLI evidence: ${directory}`)
  const baseline = `${output}/last-delivered.json`
  const before = await sha(await Deno.readTextFile(baseline))
  const evidence = `${directory}/review.md`
  const notes = `${directory}/notes.json`
  const text =
    "실패한 저장 작업 뒤 raw DB handle 수명이 보장되지 않아 history 승인은 BLOCKED입니다."
  await Deno.writeTextFile(evidence, `# Review\n\n${text}\n`)
  const args = [
    "run",
    "--no-config",
    "--no-lock",
    "--cached-only",
    "--no-prompt",
    `--allow-read=${goal},${coordination}/goal-scorecard.json,${coordination}/execution-progress.md,${baseline},${directory}`,
    `--allow-write=${output}`,
    `--deny-write=${baseline}`,
    "--deny-net",
    "--deny-run",
    helper,
    `--notes=${notes}`,
    "--dry-run",
  ]
  await Deno.writeTextFile(
    `${directory}/invocation.json`,
    JSON.stringify({ executable: deno, args }, null, 2),
  )
  const run = async (label: string, evidenceAt: string | null) => {
    await Deno.writeTextFile(
      notes,
      JSON.stringify([{
        area: "P2",
        kind: "blocker",
        text,
        evidence,
        evidenceAt,
      }]),
    )
    // Preserve both actual inputs; the command and grants are identical.
    await Deno.copyFile(notes, `${directory}/${label}-notes.json`)
    const result = await new Deno.Command(deno, {
      args,
      clearEnv: true,
      env: { DENO_DIR: cache, NO_COLOR: "1" },
      stdout: "piped",
      stderr: "piped",
    }).output()
    const stdout = new TextDecoder().decode(result.stdout)
    const stderr = new TextDecoder().decode(result.stderr)
    await Deno.writeTextFile(`${directory}/${label}-stdout.log`, stdout)
    await Deno.writeTextFile(`${directory}/${label}-stderr.log`, stderr)
    await Deno.writeTextFile(
      `${directory}/${label}-exit.json`,
      JSON.stringify({ code: result.code, signal: result.signal }),
    )
    strictEqual(
      result.code,
      0,
      `${label}: CLI must preserve the blocker; see ${directory}/${label}-stderr.log`,
    )
    const receipt = JSON.parse(stdout)
    strictEqual(receipt.dryRun, true)
    strictEqual(receipt.accepted, false)
    strictEqual(receipt.report.startsWith(`${output}/`), true)
    const markdown = await Deno.readTextFile(receipt.report)
    const snapshot = JSON.parse(
      await Deno.readTextFile(
        receipt.report.replace(/\.md$/, ".snapshot.json"),
      ),
    )
    strictEqual(markdown.includes(text), true)
    strictEqual(snapshot.evidence[0].evidenceAt, evidenceAt)
    strictEqual(
      snapshot.evidence[0].hash,
      await sha(await Deno.readTextFile(evidence)),
    )
    return markdown
  }
  try {
    const controlPassed = await t.step(
      "dated blocker passes actual notes validation and dry-run",
      async () => {
        await run("dated", "2026-10-05T12:30:00.000Z")
      },
    )
    strictEqual(
      controlPassed,
      true,
      "Dated control must pass before testing the null timestamp",
    )
    await t.step(
      "undated blocker is preserved with unknown time, not invented novelty",
      async () => {
        const markdown = await run("undated", null)
        const blockerLine = markdown.split("\n").find((line) =>
          line.includes(text)
        )!
        match(
          blockerLine,
          /(?:시각|시간)[^\]\n]*(?:미확인|불명|미상|확인 불가|알 수 없)/,
        )
        strictEqual(blockerLine.includes("새 근거"), false)
        strictEqual(blockerLine.includes("근거 3시간 이내"), false)
      },
    )
  } finally {
    const after = await sha(await Deno.readTextFile(baseline))
    await Deno.writeTextFile(
      `${directory}/baseline-hashes.json`,
      JSON.stringify({ before, after }, null, 2),
    )
    strictEqual(
      after,
      before,
      "The real delivered baseline must remain untouched",
    )
  }
})
