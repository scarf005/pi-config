import { deepStrictEqual, rejects, strictEqual, throws } from "node:assert"
import {
  deliver,
  endpointFrom,
  goal,
  noteStatus,
  output,
  percent,
  publish,
  render,
  sha,
  type Snapshot,
  validateCard,
} from "./bn-progress.ts"

function fixture(): { goalText: string; snapshot: Snapshot } {
  const ids = ["P0", "P1", "P2", "M0/M2", "M1", "M3", "M4", "M5", "M6", "P3"]
  const totals = [5, 6, 6, 6, 5, 4, 5, 4, 5, 4]
  const completes = [5, 4, 1, 3, 2, 0, 0, 1, 0, 0]
  const packages = ids.map((id, i) => ({
    id,
    title: id,
    complete: completes[i],
    total: totals[i],
    evidence: "Historical evidence",
    items: Array.from(
      { length: totals[i] },
      (_, j) => ({
        id: `${id}.${j + 1}`,
        text: `Original ${id}.${j + 1}`,
        complete: j < completes[i],
      }),
    ),
  }))
  return {
    goalText: packages.flatMap((p) =>
      p.items.map((item) => `- [ ] ${item.text}`)
    ).join("\n"),
    snapshot: {
      reportedAt: "2026-10-05T14:00:00.000Z",
      ledger: "Controlled ledger",
      evidence: [],
      card: {
        goal,
        metric: "fixed",
        observedAt: "2026-10-05T13:00:00.000Z",
        complete: 16,
        total: 50,
        percent: 32,
        finalDeliveryGatesComplete: 0,
        finalDeliveryGatesTotal: 8,
        packages,
      },
    },
  }
}
Deno.test("initial baseline, unchanged report and fractional area percentages", () => {
  const { snapshot, goalText } = fixture()
  validateCard(snapshot.card, goalText)
  strictEqual(percent(4, 6), "66.7%")
  strictEqual(percent(1, 6), "16.7%")
  const first = render(snapshot, null, "/report.md")
  strictEqual(first.markdown.includes("초기 기준선"), true)
  strictEqual(first.body.includes("P1: 66.7% → 66.7% (4/6)"), true)
  const same = render(snapshot, snapshot, "/report.md")
  strictEqual(same.body.includes("32% → 32% (16/50)"), true)
  strictEqual(same.markdown.includes("장부 변경:"), false)
})
Deno.test("validated new completion and reversal derive from item booleans", () => {
  const { snapshot, goalText } = fixture()
  const current = structuredClone(snapshot)
  const p = current.card.packages[1]
  p.items[4].complete = true
  p.complete++
  current.card.complete++
  current.card.percent += 2
  validateCard(current.card, goalText)
  const result = render(current, snapshot, "/report.md")
  strictEqual(result.body.includes("32% → 34% (17/50)"), true)
  strictEqual(result.markdown.includes("P1.5 승인"), true)
  strictEqual(
    render(snapshot, current, "/report.md").markdown.includes("P1.5 승인 철회"),
    true,
  )
})
Deno.test("reject changed denominator, IDs, item text, summaries, invalid booleans", () => {
  for (
    const mutation of [
      (c: Snapshot["card"]) => c.total = 51 as 50,
      (c: Snapshot["card"]) => c.packages[1].items[0].id = "P0.1",
      (c: Snapshot["card"]) => c.packages[1].items[0].text = "replacement",
      (c: Snapshot["card"]) => c.packages[1].complete++,
      (c: Snapshot["card"]) => c.complete++,
      (c: Snapshot["card"]) => c.percent++,
      (c: Snapshot["card"]) => c.packages.reverse(),
      (c: Snapshot["card"]) =>
        c.packages[1].items[0].complete = "partial" as unknown as boolean,
    ]
  ) {
    const { snapshot, goalText } = fixture()
    mutation(snapshot.card)
    throws(() => validateCard(snapshot.card, goalText))
  }
})
Deno.test("fresh, old, unchanged and missing evidence cannot become invented new work", () => {
  const { snapshot } = fixture()
  snapshot.reportedAt = "2026-10-05T13:00:00.000Z"
  const evidence = {
    area: "P2",
    kind: "partial" as const,
    text: "부분 검증",
    evidence: "/evidence",
    evidenceAt: "2026-10-05T13:30:00.000Z",
    hash: "abc",
  }
  strictEqual(
    noteStatus(evidence, snapshot, "2026-10-05T14:00:00.000Z"),
    "새 근거",
  )
  snapshot.evidence.push(evidence)
  strictEqual(
    noteStatus(evidence, snapshot, "2026-10-05T14:00:00.000Z"),
    "기존 근거",
  )
  strictEqual(
    noteStatus(
      { ...evidence, hash: null },
      snapshot,
      "2026-10-05T14:00:00.000Z",
    ).includes("확인 불가"),
    true,
  )
  strictEqual(
    noteStatus(evidence, snapshot, "2026-10-05T18:00:00.000Z"),
    "기존 근거",
  )
  strictEqual(
    noteStatus(evidence, null, "2026-10-05T14:00:00.000Z").includes(
      "초기 관측",
    ),
    true,
  )
})
Deno.test("delayed reports preserve interval novelty separately from freshness and boundaries", () => {
  const { snapshot } = fixture()
  snapshot.reportedAt = "2026-10-05T12:00:00.000Z"
  const current = structuredClone(snapshot)
  current.reportedAt = "2026-10-05T15:31:00.000Z"
  const evidence = {
    area: "P2",
    kind: "partial" as const,
    text: "부분 검증",
    evidence: "/evidence",
    evidenceAt: "2026-10-05T12:30:00.000Z",
    hash: "new",
  }
  snapshot.evidence.push({
    ...evidence,
    evidenceAt: "2026-10-05T11:30:00.000Z",
    hash: "old",
  })
  current.evidence.push(evidence)
  strictEqual(noteStatus(evidence, snapshot, current.reportedAt), "새 근거")
  const report = render(current, snapshot, "/report.md")
  for (const text of [report.body, report.markdown]) {
    strictEqual(text.includes("새 근거; 현재 상태 확인 불가"), true)
  }
  strictEqual(
    noteStatus(
      { ...evidence, evidenceAt: snapshot.reportedAt },
      snapshot,
      current.reportedAt,
    ),
    "이전 근거(신규 아님)",
  )
  strictEqual(
    noteStatus(
      { ...evidence, evidenceAt: current.reportedAt },
      snapshot,
      current.reportedAt,
    ),
    "새 근거",
  )
  strictEqual(
    noteStatus(
      { ...evidence, evidenceAt: "2026-10-05T16:00:00.000Z" },
      snapshot,
      current.reportedAt,
    ).includes("확인 불가"),
    true,
  )
  strictEqual(
    noteStatus(evidence, null, current.reportedAt).includes("초기 관측"),
    true,
  )
  strictEqual(
    noteStatus({ ...evidence, hash: null }, snapshot, current.reportedAt)
      .includes("확인 불가"),
    true,
  )
  current.reportedAt = "2026-10-05T18:00:00.000Z"
  strictEqual(
    render(current, snapshot, "/report.md").markdown.includes("오래된 장부"),
    true,
  )
})
Deno.test("workflow dryRun forwards only validated booleans and retains the worker contract", async () => {
  const script = await Deno.readTextFile(
    new URL("./bn-progress-3h.js", import.meta.url),
  )
  const execute = new Function("args", "runs", script)
  for (const args of [{}, { dryRun: false }, { dryRun: true }]) {
    const calls: {
      agent: string
      model: string
      fast: boolean
      async: boolean
      context: string
      task: string
    }[] = []
    execute(args, {
      run: (_key: string, options: typeof calls[number]) => calls.push(options),
    })
    strictEqual(calls.length, 1)
    const child = calls[0]
    deepStrictEqual([
      child.agent,
      child.model,
      child.fast,
      child.async,
      child.context,
    ], ["worker", "openai-codex/gpt-6-astra:medium", true, true, "fresh"])
    const command = child.task.split("\n").find((line) =>
      line.startsWith("DENO_DIR=")
    )!
    strictEqual(command.endsWith(" --dry-run"), args.dryRun === true)
    strictEqual(child.task.includes("Dry-run only:"), args.dryRun === true)
  }
  for (const dryRun of ["true", "false", 0, 1, null, [], {}]) {
    let launches = 0
    throws(
      () => execute({ dryRun }, { run: () => launches++ }),
      /args.dryRun must be a boolean/,
    )
    strictEqual(launches, 0)
  }
})
Deno.test("bounded Unicode body preserves every area and report path", () => {
  const { snapshot } = fixture()
  snapshot.evidence.push({
    area: "P2",
    kind: "blocker",
    text: "실제 부분 검증과 차단점 가나𐐀".repeat(500),
    evidence: "/evidence",
    evidenceAt: snapshot.reportedAt,
    hash: "abc",
  })
  const { body } = render(snapshot, null, "/named/report.md")
  strictEqual(new TextEncoder().encode(body).length <= 3800, true)
  strictEqual(
    new TextDecoder("utf-8", { fatal: true }).decode(
      new TextEncoder().encode(body),
    ),
    body,
  )
  for (const p of snapshot.card.packages) {
    strictEqual(body.includes(`${p.id}:`), true)
  }
  strictEqual(body.includes("/named/report.md"), true)
})
Deno.test("relay exceptions stay private and destination is restricted", async () => {
  const receipt = await publish("http://127.0.0.1:8080/private", "body", () => {
    throw new Error("secret-token private-topic authorization")
  })
  deepStrictEqual(receipt, {
    accepted: false,
    status: null,
    deviceDelivery: "unknown",
  })
  strictEqual(
    endpointFrom('  local endpoint="http://127.0.0.1:8080/private"'),
    "http://127.0.0.1:8080/private",
  )
  for (
    const bad of [
      "https://example.com/private",
      "http://secret@127.0.0.1:8080/private",
      "http://127.0.0.1:8080/private?token=secret",
    ]
  ) {
    throws(() => endpointFrom(`local endpoint="${bad}"`))
  }
})
Deno.test("controlled publication: failure and dry-run preserve baseline; acceptance advances atomically", async () => {
  await Deno.mkdir(output, { recursive: true })
  const directory = await Deno.makeTempDir({ dir: output, prefix: "test-" })
  try {
    const { snapshot } = fixture()
    snapshot.reportedAt = "2026-10-05T12:00:00.000Z"
    snapshot.card.observedAt = "2026-10-05T12:00:00.000Z"
    const baseline = `${directory}/last-delivered.json`
    await Deno.writeTextFile(baseline, JSON.stringify(snapshot))
    const oldHash = await sha(await Deno.readTextFile(baseline))
    const current = structuredClone(snapshot)
    current.reportedAt = "2026-10-05T15:00:00.000Z"
    current.evidence.push({
      area: "P2",
      kind: "partial",
      text: "부분 검증",
      evidence: "/evidence",
      evidenceAt: "2026-10-05T12:30:00.000Z",
      hash: "new",
    })
    const options = {
      snapshot: current,
      previous: snapshot,
      directory,
      dryRun: false,
      endpoint: "http://127.0.0.1:8080/fixture",
    }
    const failure = await deliver({
      ...options,
      send: () =>
        Promise.resolve(new Response("private error", { status: 503 })),
    })
    strictEqual(failure.accepted, false)
    strictEqual(await sha(await Deno.readTextFile(baseline)), oldHash)
    const dry = await deliver({
      ...options,
      dryRun: true,
      send: () => {
        throw new Error("Must not send")
      },
    })
    strictEqual(dry.accepted, false)
    strictEqual(await sha(await Deno.readTextFile(baseline)), oldHash)
    current.reportedAt = "2026-10-05T18:00:00.000Z"
    options.previous = JSON.parse(await Deno.readTextFile(baseline))
    strictEqual(options.previous.reportedAt, "2026-10-05T12:00:00.000Z")
    let requests = 0
    const success = await deliver({
      ...options,
      send: (_url, init) => {
        requests++
        strictEqual(init?.redirect, "error")
        strictEqual(init?.method, "POST")
        strictEqual(
          String(init?.body).includes("새 근거; 현재 상태 확인 불가"),
          true,
        )
        return Promise.resolve(
          new Response("sensitive acknowledgement", { status: 200 }),
        )
      },
    })
    strictEqual(requests, 1)
    strictEqual(success.accepted, true)
    strictEqual(
      (await Deno.readTextFile(success.report)).includes(
        "새 근거; 현재 상태 확인 불가",
      ),
      true,
    )
    deepStrictEqual(JSON.parse(await Deno.readTextFile(baseline)), current)
    for await (const entry of Deno.readDir(directory)) {
      if (entry.name.endsWith("receipt.json")) {
        strictEqual(
          (await Deno.readTextFile(`${directory}/${entry.name}`)).includes(
            "sensitive",
          ),
          false,
        )
      }
    }
  } finally {
    await Deno.remove(directory, { recursive: true })
  }
})
Deno.test("actual scoped runtime denies unrelated filesystem and subprocess access", async () => {
  await rejects(() => Deno.readTextFile("/etc/passwd"), Deno.errors.NotCapable)
  throws(() => new Deno.Command("true").spawn(), Deno.errors.NotCapable)
})
