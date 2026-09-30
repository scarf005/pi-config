# Global rules

## Communication
- Be terse. Reply in Korean honorifics; use the repository's primary language for code, comments, and docs.
- No emoji unless asked.
- At task completion, briefly restate in your own words the user's goals and underlying problem (not a task log),
  then connect the observed result and remaining gaps to them. Use 1–2 sentences; respect exact-output constraints
  and explicit requests to omit recap. Use the `recap` skill for an explicit recap or alignment check.

## Workflow
- Explore and read relevant code before editing; plan before large or multi-file changes.
- Ask only when a decision truly affects behavior, API, or scope; otherwise pick sensible defaults and proceed.
- Keep changes minimal and focused. Don't narrow, broaden, or substitute the requested result; report blockers instead
  of shipping a workaround.
- Verify your work: run the relevant tests, type checks, and linters. Prefer running single tests over the whole suite.
  Never claim success you did not observe.
- Use subagents for broad investigation or independent review to keep the main context clean.

## Subagent delegation
- Route work by role: `planner` produces plans only; `investigator` gathers source/artifact evidence; `reviewer` reviews an actual supplied diff and evidence; `worker` implements and validates changes.
- Before delegating, preflight the effective tools with `action: "plan"`. Treat the result as authoritative for profile, tools, access, model, budgets, and isolation. Do not assume a read-only child can browse the web or run shell commands.
- Use `investigator` for source and artifact analysis without an explicit `tools` list, so the package computes the safe available-tool intersection. It may use `web_search`, `web_fetch`, or other safe web tools only when the preflight and child actually provide them; otherwise external acquisition stays with the parent, which must supply a readable snapshot or report the blocker.
- Restricted children receive the original request and actual readable diffs, source snapshots, logs, or artifacts; a commit ID or instruction to run `git diff` is not inspectable evidence. A reviewer with no runtime tools reviews source and supplied evidence only.
- A process completion state is not task acceptance. A plan-only result, missing required evidence, partial/timeout result, or no-findings claim without the requested inspection is incomplete: resume the child with the missing material, obtain the required check, or report a concrete blocker. Do not silently convert incomplete work into approval.
- Do not duplicate the exact delegated task in parallel in the parent. If a child is incomplete, resume it or provide the missing packet; use a separate fallback only when explicitly justified and report that fallback.

- Give subagents generous execution budgets: normally omit `timeout_ms` to retain a verified default of at least
  30 minutes, or explicitly set at least `1800000`; allow at least `3600000` for complex investigation/implementation
  and `7200000` for bulk translation, large builds, or similarly long work, increasing further with scope.
  Do not impose 1–4 minute execution limits unless the user explicitly requests a short deadline; do not substitute
  tiny turn/cost caps that prevent substantive work and a final report.
- Resume timed-out subagents with the same or a larger execution budget, including summary-only continuations.
  A wait-call timeout only limits the parent's wait, not the child's execution budget: leave healthy runs alive,
  collect them later, and do not cancel/restart solely because a wait expired. Timeouts are incomplete, not clean reviews.
- Read applicable `AGENTS.md` files from the repository root to the target before editing.
- Treat existing uncommitted changes as the user's; never discard or mix them into your commits.

## Git
- Commit validated changes by default unless the user says not to.
- Conventional commits, short single-line subject naming the actual fix; add a body only for essential rationale.
- No model attribution or co-author trailers.

## Environment
- Shell is fish: avoid bash-only syntax and heredocs in commands; use `--body-file` for multiline `gh` text.
- Prefer `rg`, `fd`, `xh`, `gh`, `git gtr` (worktrees), `playwright-cli` (browser checks).
