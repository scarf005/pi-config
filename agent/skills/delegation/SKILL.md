---
name: delegation
description: Rules for spawning subagents, writing their briefs, orchestrating parallel lanes, and accepting their results. Use before any subagent call, agent-to-agent message, lane dispatch or lane merge, and when a summarized session must hand off.
---

# Delegation

- Write subagent briefs and agent-to-agent messages in English (fewer tokens); only user-visible text is Korean.
- When orchestrating lanes, the parent plans, dispatches, integrates and verifies; delegate investigation and fixes
  of new problems to a lane at once instead of debugging them in the parent while lanes sit idle. Direction comes
  before throughput: keep a written backlog and refill lanes from it when a lane reports, but only with work whose
  direction is settled; never dispatch implementation that depends on an open design or architecture question
  (including one the user just asked to review).
- A backlog or audit entry is not authority: before dispatching, check each item against the repository rules and
  the user's stated principles, and drop or reclassify conflicts. When the user states a new principle, re-check all
  in-flight and merged work against it before dispatching more, and record the result.
- Before merging a lane, read its diff yourself against the user's principles and the brief, including every
  user-facing string, and drive any changed UI yourself; passing tests and the lane's own reviewer (which checks
  against your brief) are not acceptance. Record standing user corrections in the repository's `AGENTS.md`, each as
  what the user objected to in their words, never widened from one line into a ban on a word in it, so
  every fresh lane inherits them; a parent-only memory does not reach lanes. Before calling a review or plan done,
  check it answers the level the user asked for (architecture vs line-level).
- When the session context has been summarized and judgement depends on summaries and reports, write a handoff
  document (decisions, state, open questions, next steps) and recommend continuing in a fresh session.
- Verify the child's effective role, model, tools, permissions, and working directory from real metadata before
  relying on them.
- Give the task, constraints, readable sources/diffs/logs (a commit ID is not readable for a tool-restricted child),
  and acceptance checks; preflight input paths. A controller continuation needs its exact execution command and
  scoped permissions. Inspect enforcement before claiming a reused guard supplies quotas or deadlines.
- Carry the global gates into every brief: `env -u WAYLAND_DISPLAY -u DISPLAY` for app launches, Cargo scripts for
  one-off tools, `rg` instead of `grep`, `gio trash`/`tmp-rm` instead of `rm`. Inspect the child's executed commands
  before acceptance.
- A completion notification is not acceptance: require the final answer with evidence (tool observations, actual diff
  and validation). Resume the same child for missing work; do not duplicate it in the parent.
- Parallel children share the machine: give each its own worktree, let only one run the full suite at a time, and
  run the final full suite once in the parent after merging.
- Token budget: run at most 3–4 children at once with file-disjoint scopes; after a child's task is accepted, start
  the next task in a fresh child with a short brief instead of resuming the long one.
