import * as v from "npm:valibot@1.1.0"
import { parseArgs } from "node:util"

export const goal =
  "/home/scarf/repo/cata/Cataclysm-BN-worktrees/refactor-engine-client/GOAL.md"
export const coordination =
  "/home/scarf/repo/cata/Cataclysm-BN-worktrees/refactor-engine-client-today/build/recovery-side-20261003/worktree-status"
export const output = `${coordination}/three-hour-progress`
export const goalHash =
  "9206f03f4c1e44fddcccb7086c16603432d1bc1e80ccd407456d8f330973e6d2"
const notify = "/home/scarf/.local/bin/notify"
const areas = ["P0", "P1", "P2", "M0/M2", "M1", "M3", "M4", "M5", "M6", "P3"]
const totals = [5, 6, 6, 6, 5, 4, 5, 4, 5, 4]
const count = v.pipe(v.number(), v.integer(), v.minValue(0))
const timestamp = v.pipe(v.string(), v.isoTimestamp())
const itemSchema = v.object({
  id: v.string(),
  text: v.string(),
  complete: v.boolean(),
})
const cardSchema = v.object({
  observedAt: timestamp,
  goal: v.literal(goal),
  metric: v.string(),
  complete: count,
  total: v.literal(50),
  percent: v.number(),
  finalDeliveryGatesComplete: v.pipe(count, v.maxValue(8)),
  finalDeliveryGatesTotal: v.literal(8),
  packages: v.array(v.object({
    id: v.string(),
    title: v.string(),
    items: v.array(itemSchema),
    complete: count,
    total: count,
    evidence: v.string(),
  })),
})
export type Card = v.InferOutput<typeof cardSchema>
const noteSchema = v.object({
  area: v.picklist(areas),
  kind: v.picklist(["verified", "partial", "blocker"]),
  text: v.pipe(v.string(), v.minLength(1), v.maxLength(2000)),
  evidence: v.string(),
  evidenceAt: timestamp,
})
export type Note = v.InferOutput<typeof noteSchema>
type Evidence = Note & { hash: string | null }
export type Snapshot = {
  reportedAt: string
  card: Card
  ledger: string
  evidence: Evidence[]
}
const require = (condition: boolean) => {
  if (!condition) throw new Error("Invalid reporting input")
}
export async function sha(text: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("")
}
export function validateCard(raw: unknown, goalText: string): Card {
  const card = v.parse(cardSchema, raw)
  const originals = [...goalText.matchAll(/^- \[[ x]\] (.+)$/gm)].slice(0, 50)
    .map((m) => m[1])
  require(originals.length === 50 && card.packages.length === areas.length)
  let offset = 0
  card.packages.forEach((p, i) => {
    require(
      p.id === areas[i] && p.total === totals[i] && p.items.length === p.total,
    )
    p.items.forEach((item, j) =>
      require(
        item.id === `${p.id}.${j + 1}` && item.text === originals[offset++],
      )
    )
    require(p.complete === p.items.filter((item) => item.complete).length)
  })
  require(
    card.complete === card.packages.reduce((sum, p) => sum + p.complete, 0),
  )
  require(card.percent === card.complete * 2)
  return card
}
export const percent = (n: number, total: number) =>
  `${Math.round(n / total * 1000) / 10}%`
const fresh = (at: string, now: string) => {
  const age = Date.parse(now) - Date.parse(at)
  return age >= 0 && age <= 3 * 60 * 60 * 1000
}
export function noteStatus(
  e: Evidence,
  previous: Snapshot | null,
  now: string,
) {
  const evidenceTime = Date.parse(e.evidenceAt)
  if (
    !e.hash || !Number.isFinite(evidenceTime) || evidenceTime > Date.parse(now)
  ) {
    return "새 진척 확인 불가(근거 누락/시각 미확인)"
  }
  if (!previous) return "초기 관측(기간 내 신규 여부 미확인)"
  if (
    previous.evidence.some((old) =>
      old.evidence === e.evidence && old.hash === e.hash
    )
  ) return "기존 근거"
  return evidenceTime > Date.parse(previous.reportedAt)
    ? "새 근거"
    : "이전 근거(신규 아님)"
}
export function render(
  current: Snapshot,
  previous: Snapshot | null,
  path: string,
) {
  const { card, reportedAt } = current
  const prior = previous?.card ?? card
  const delta = (n: number, old: number, total: number) =>
    `${percent(old, total)} → ${percent(n, total)}`
  const rows = card.packages.map((p, i) => {
    const changed = p.items.filter((item, j) =>
      item.complete !== prior.packages[i].items[j].complete
    )
      .map((item) => `${item.id} ${item.complete ? "승인" : "승인 철회"}`).join(
        ", ",
      )
    return `${p.id}: ${
      delta(p.complete, prior.packages[i].complete, p.total)
    } (${p.complete}/${p.total})${changed ? `; 장부 변경: ${changed}` : ""}`
  })
  const notes = current.evidence.map((e) =>
    `${e.area} [${e.kind}; ${noteStatus(e, previous, reportedAt)}; ${
      e.hash && fresh(e.evidenceAt, reportedAt)
        ? "근거 3시간 이내"
        : "현재 상태 확인 불가(근거 오래됨/누락/시각 미확인)"
    }] ${e.text}`
  )
  const header = [
    `# BN GOAL 진행 보고 — ${reportedAt}`,
    `전체: ${delta(card.complete, prior.complete, 50)} (${card.complete}/50)`,
    previous
      ? `이전 릴레이 수락 보고: ${previous.reportedAt}`
      : "초기 기준선: 이전 보고 없음; A=B는 비교 시작값이며 신규 성과가 아닙니다.",
    `장부 관측: ${card.observedAt}; ${
      fresh(card.observedAt, reportedAt)
        ? "3시간 이내"
        : "오래된 장부: 현재 실제 진척 확인 불가"
    }`,
    "원본 50개 항목 동일 가중치; 부분/미검증=0. 시간·노력 추정이 아니며 정리 작업은 GOAL 완료로 세지 않습니다.",
    `최종 전달 게이트(별도): ${prior.finalDeliveryGatesComplete}/8 → ${card.finalDeliveryGatesComplete}/8`,
  ]
  const details = card.packages.map((p) =>
    `## ${p.id} — ${p.title}\n${p.evidence}\n${
      current.evidence.some((e) => e.area === p.id)
        ? ""
        : "새 검증/부분 작업 및 현재 차단점: 추가 근거 없어 확인 불가. 위 내용은 마지막 장부 기록입니다."
    }`
  )
  const markdown = [
    ...header,
    "",
    ...rows,
    "",
    ...notes,
    "",
    ...details,
    "",
    "## 근거",
    ...current.evidence.map((e) =>
      `- ${e.evidence} (근거 시각 ${e.evidenceAt}; SHA-256 ${
        e.hash ?? "확인 불가"
      })`
    ),
    "",
    "릴레이 수락은 기기 전달 증명이 아닙니다. 발행 결과는 같은 이름의 receipt.json을 확인하십시오.",
    "",
  ].join("\n")
  const fixed = [
    `BN ${delta(card.complete, prior.complete, 50)} (${card.complete}/50)`,
    ...rows,
    `전달 게이트 ${card.finalDeliveryGatesComplete}/8; 장부 ${card.observedAt}`,
    previous ? "이전 릴레이 수락 기준 비교" : "초기 기준선(신규 성과 아님)",
    fresh(card.observedAt, reportedAt)
      ? ""
      : "오래된 장부: 현재 진척 확인 불가",
  ].filter(Boolean).join("\n")
  const summary = notes.length
    ? notes.join("\n")
    : "새 성과/차단점: 추가 근거 없어 확인 불가"
  const suffix = `\n보고서: ${path}\n릴레이 수락 ≠ 기기 전달`
  return {
    markdown,
    body: fixed + "\n" +
      truncate(
        summary,
        3800 - new TextEncoder().encode(fixed + "\n" + suffix).length,
      ) + suffix,
  }
}
export function truncate(text: string, bytes: number) {
  let result = ""
  for (const char of text) {
    if (new TextEncoder().encode(result + char + "…").length > bytes) {
      return result + "…"
    }
    result += char
  }
  return result
}
export function endpointFrom(script: string, override?: string) {
  const matches = [...script.matchAll(/^\s*local endpoint="([^"\n]+)"\s*$/gm)]
  require(matches.length === 1)
  const endpoint = new URL(override || matches[0][1])
  require(
    endpoint.origin === "http://127.0.0.1:8080" && !endpoint.username &&
      !endpoint.password && !endpoint.search && !endpoint.hash,
  )
  return endpoint.href
}
export async function publish(
  endpoint: string,
  body: string,
  send: typeof fetch = fetch,
) {
  try {
    const response = await send(endpoint, {
      method: "POST",
      redirect: "error",
      headers: {
        Title: "BN GOAL progress",
        "Content-Type": "text/plain; charset=utf-8",
      },
      body,
      signal: AbortSignal.timeout(10000),
    })
    await response.body?.cancel()
    return {
      accepted: response.ok,
      status: response.status,
      deviceDelivery: "unknown",
    }
  } catch {
    return { accepted: false, status: null, deviceDelivery: "unknown" }
  }
}
export async function deliver(options: {
  snapshot: Snapshot
  previous: Snapshot | null
  directory: string
  dryRun: boolean
  endpoint: string
  send?: typeof fetch
}) {
  const { snapshot, previous, directory, dryRun } = options
  const stem = `${directory}/${
    snapshot.reportedAt.replaceAll(":", "-")
  }-${crypto.randomUUID()}`
  const report = `${stem}.md`
  const rendered = render(snapshot, previous, report)
  await Deno.writeTextFile(report, rendered.markdown, {
    createNew: true,
    mode: 0o600,
  })
  await Deno.writeTextFile(
    `${stem}.snapshot.json`,
    JSON.stringify(snapshot, null, 2),
    { createNew: true, mode: 0o600 },
  )
  const receipt = dryRun
    ? { accepted: false, status: null, deviceDelivery: "unknown", dryRun: true }
    : await publish(options.endpoint, rendered.body, options.send)
  await Deno.writeTextFile(
    `${stem}.receipt.json`,
    JSON.stringify(
      { ...receipt, report, reportedAt: snapshot.reportedAt },
      null,
      2,
    ),
    { createNew: true, mode: 0o600 },
  )
  if (receipt.accepted) {
    await Deno.writeTextFile(
      `${stem}.pending`,
      JSON.stringify(snapshot, null, 2),
      { createNew: true, mode: 0o600 },
    )
    await Deno.rename(`${stem}.pending`, `${directory}/last-delivered.json`)
  }
  return { ...receipt, report }
}
async function main() {
  const { values } = parseArgs({
    args: Deno.args,
    options: { notes: { type: "string" }, "dry-run": { type: "boolean" } },
  })
  require(
    !!values.notes && values.notes.startsWith(`${output}/`) &&
      !values.notes.includes("/../"),
  )
  const goalText = await Deno.readTextFile(goal)
  require(await sha(goalText) === goalHash)
  await Deno.mkdir(output, { recursive: true, mode: 0o700 })
  // Never clear an abandoned lock automatically: acceptance may have preceded a crash.
  const lock = await Deno.open(`${output}/publish.lock`, {
    createNew: true,
    write: true,
    mode: 0o600,
  })
  try {
    const card = validateCard(
      JSON.parse(
        await Deno.readTextFile(`${coordination}/goal-scorecard.json`),
      ),
      goalText,
    )
    const reportedAt = new Date().toISOString()
    require(Date.parse(card.observedAt) <= Date.parse(reportedAt))
    let previous: Snapshot | null = null
    try {
      previous = JSON.parse(
        await Deno.readTextFile(`${output}/last-delivered.json`),
      )
      require(previous !== null)
      previous!.card = validateCard(previous!.card, goalText)
      v.parse(timestamp, previous!.reportedAt)
      require(Date.parse(previous!.reportedAt) <= Date.parse(reportedAt))
      require(
        Date.parse(card.observedAt) >= Date.parse(previous!.card.observedAt),
      )
      require(card.metric === previous!.card.metric)
      require(
        Array.isArray(previous!.evidence) &&
          typeof previous!.ledger === "string",
      )
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error
    }
    const notes = v.parse(
      v.array(noteSchema),
      JSON.parse(await Deno.readTextFile(values.notes!)),
    )
    const evidence: Evidence[] = []
    for (const note of notes) {
      require(
        note.evidence.startsWith(
          "/home/scarf/repo/cata/Cataclysm-BN-worktrees/",
        ) && !note.evidence.includes("/../"),
      )
      require(Date.parse(note.evidenceAt) <= Date.parse(reportedAt))
      let hash: string | null = null
      try {
        hash = await sha(await Deno.readTextFile(note.evidence))
      } catch { /* Missing or ungranted evidence stays unknown. */ }
      evidence.push({ ...note, hash })
    }
    const snapshot = {
      reportedAt,
      card,
      ledger: await Deno.readTextFile(`${coordination}/execution-progress.md`),
      evidence,
    }
    const endpoint = values["dry-run"] ? "" : endpointFrom(
      await Deno.readTextFile(notify),
      Deno.env.get("NOTIFY_NTFY_ENDPOINT"),
    )
    const receipt = await deliver({
      snapshot,
      previous,
      directory: output,
      dryRun: !!values["dry-run"],
      endpoint,
    })
    console.log(JSON.stringify(receipt))
    if (!values["dry-run"] && !receipt.accepted) Deno.exitCode = 1
  } finally {
    lock.close()
    await Deno.remove(`${output}/publish.lock`)
  }
}
if (import.meta.main) {
  try {
    await main()
  } catch {
    console.error(
      "BN report failed; no delivery claimed. Inspect scoped inputs/permissions and publish.lock; private error details withheld.",
    )
    Deno.exitCode = 1
  }
}
