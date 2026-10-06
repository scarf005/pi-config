if ("dryRun" in args && typeof args.dryRun !== "boolean") {
  throw new Error("args.dryRun must be a boolean")
}
const dryRun = args.dryRun === true
const repo = "/home/scarf/.config/pi"
const coordination =
  "/home/scarf/repo/cata/Cataclysm-BN-worktrees/refactor-engine-client-today/build/recovery-side-20261003/worktree-status"
const goal =
  "/home/scarf/repo/cata/Cataclysm-BN-worktrees/refactor-engine-client/GOAL.md"
const output = `${coordination}/three-hour-progress`
const stamp = new Date().toISOString().replaceAll(":", "-")
return runs.run("three-hour-report", {
  agent: "worker",
  model: "openai-codex/gpt-6.1-sol:medium",
  fast: false,
  async: true,
  context: "fresh",
  cwd: repo,
  output: `${output}/${stamp}-worker.md`,
  task: [
    "Report-only assignment. Do not implement, build, test, run Git, scan processes, delegate, or change source/config/GOAL/scorecard/ledgers. No stage/commit/push.",
    `Only reporting files under ${output}/ may be written. Read ${repo}/agent/workflows/bn-progress.ts for the notes schema and helper API.`,
    `Read ${goal}, ${coordination}/goal-scorecard.json, BOTH ${coordination}/execution-progress.md (other-owner P2) AND ${coordination}/execution-progress-astra.md (this session's current C++/Rust/reporting states), and ${output}/last-delivered.json if present. The saved snapshot includes the previous execution-progress.md ledger and evidence hashes; older snapshots do not contain the Astra ledger.`,
    "For active or recently changed run IDs in either ledger, read their exact known status/final handoff and follow its named runtime receipts. Completed runtime receipts outrank stale ledger descriptions, including setup failures superseded by successful execution. Report missing exact references as unverified; never substitute broad /tmp, session, worktree or process scans. A running/newer repair is not approval of an unresolved blocking review.",
    "Original fixed 50 equal checkbox items; partial/unverified=0; final delivery8 separate. Never change scoring or claim housekeeping as GOAL closure. Compare new evidence against the last successfully reported snapshot, including delayed reports or failed publishes. Evidence older than 3h can still be new within that interval; its age leaves current status unverified. Missing evidence means unknown progress. A source-only review or partial test success does not accept all P2/A6. Preserve successful tests/builds; do not rerun them.",
    `Write ${output}/${stamp}-notes.json as a JSON array of {area,kind,text,evidence,evidenceAt}. area is P0/P1/P2/M0/M2/M1/M3/M4/M5/M6/P3 (M0/M2 is one area). kind is verified/partial/blocker. text is concise Korean honorific prose. evidence is the exact absolute file you read, evidenceAt is its actual result timestamp or explicit null when unknown, never the report time or inferred filesystem time. A missing timestamp must NOT omit a known blocking review: retain its blocker text and exact citation with evidenceAt:null; its time, novelty and freshness remain unknown. Put the most important blocker and verified/partial result first, concisely; the bounded ntfy summary can truncate later notes. Include concrete new verified/partial work AND blockers; use [] when nothing is substantiated. Omit secrets/URLs/tokens/headers/action payloads.`,
    "No new completion may be invented: the helper validates IDs/text/totals against the pinned original GOAL and computes all percentages from the authoritative scorecard. Old ledger status is historical; newer exact receipts override it in notes, not in scorecard. No unsupported cause or elapsed-time attribution.",
    "Only shell execution authorized: the following deterministic Deno helper invocation. Add --allow-read entries for the exact named evidence files you inspected outside coordination; do not widen to worktree directories. No --allow-run, -A, environment sweeps, or alternate runtime.",
    dryRun
      ? "Dry-run only: keep --dry-run on the helper command. Do not publish a notification or modify last-delivered.json."
      : "Publish once through the helper after preparing the evidence notes.",
    `DENO_DIR=/home/scarf/.config/pi/agent/pi-subagents/bn-progress-20261005/cache/deno deno run --no-config --no-lock --cached-only --no-prompt --allow-read=${goal},${coordination},/home/scarf/.local/bin/notify --allow-write=${output} --allow-env=NOTIFY_NTFY_ENDPOINT --allow-net=127.0.0.1:8080 ${repo}/agent/workflows/bn-progress.ts --notes=${output}/${stamp}-notes.json${
      dryRun ? " --dry-run" : ""
    }`,
    "Invoke once. A helper failure is a blocker, not permission to retry a publish or clear a lock. Return the report path and sanitized receipt. Relay acceptance does not prove device delivery; do not claim schedule registration or future delivery. All helper percentages and area deltas must remain intact.",
  ].join("\n"),
})
