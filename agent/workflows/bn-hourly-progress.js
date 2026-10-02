const root = "/home/scarf/repo/cata/Cataclysm-BN-worktrees/refactor-engine-client";
const todayRoot = "/home/scarf/repo/cata/Cataclysm-BN-worktrees/refactor-engine-client-today";
const goalFile = "/home/scarf/repo/cata/Cataclysm-BN-worktrees/fix-engine-client-iteminfo-purity/.pi/goals/active_goal_2026100209154898_muq7piwt-yqeqm2.md";
const observedAt = new Date().toISOString();
return runs.run("hourly-progress", {
  label: "Summarize BN implementation progress",
  agent: "investigator",
  cwd: root,
  context: "fresh",
  output: `${root}/out/hourly-progress/${observedAt}.md`,
  task: `Report progress of today's confirmed goal muq7piwt-yqeqm2 at ${observedAt}.
Read-only reporting, not implementation, a new goal, review, or permission to start workers.
Read ${goalFile} and ${todayRoot}/progress.md for today's priorities: language-neutral
interface; native tutorial replay and measured bottlenecks; a Rust game client with actual
screen-reader accessibility, full mouse support and excellent Zomboid-informed UI/UX.
Read ${root}/GOAL.md and the current board at the start of ${root}/progress.md as the
broader existing engine work. Do not substitute that older goal for today's requirements.
Read the latest previous report under ${root}/out/hourly-progress/ if present.
Inspect current lane progress/handoff artifacts and exact run status.json files under
/tmp/pi-subagents-uid-1000/async-subagent-runs/. Use the run IDs in the lane ledgers;
include both the canonical and iteminfo-purity parent sessions. New vehicle and chargen
lanes live in sibling feat-engine-client-vehicles and feat-engine-client-chargen worktrees.
Do not infer stopped work from the current-session fleet being empty. Do not count a
workflow container plus its children twice. A running status without recent activity is
unverified activity, not proof of execution. Report missing evidence instead of guessing.

Return a concise Korean-honorific report headed with the RFC3339 observation time.
Start with the most important outcome and the observed active subagent count.
Use an easy-to-read Markdown table with exactly these columns:
작업 | 현재 상태 | 지난 1시간 성과 | 막힌 점 | 다음 단계
Use understandable work names, grouping closely related pieces. Distinguish implementation,
validation, independent review, integration, waiting, and blocked. State whether passing tests
cover current source; do not call a candidate complete solely from its worker's completion.
Compare prior report/evidence for the last-hour column; say 확인 불가 if timing cannot be
established, and 변화 없음 when verified unchanged. Never invent completion percentages,
ETAs, performance results, test counts, or integration claims. Put detailed artifact paths
below the table only when needed. Include currently pending native whole-save/IPC/performance
acceptance rather than reducing the GOAL to the active UI slices.

No source/config/progress edits, commands, builds, Git operations, installs, delegation,
external research, or sensitive payloads. Return only the report; runtime persists output.
If today's goal muq7piwt-yqeqm2 is complete or cancelled, report that with evidence and
explicitly request the parent stop schedule bn-goal-hourly-progress; do not reopen it.
If its record is missing, locate its archived record or report status unverified; completion
of the older canonical goal alone does not end today's report.`,
});
