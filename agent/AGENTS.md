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
