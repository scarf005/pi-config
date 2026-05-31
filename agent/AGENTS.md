# Global Rules

## Priority

- Treat all applicable `AGENTS.md` rules as gates for every task, including metadata, related links, commits, and automation rules.
- Keep this file for always-on behavior; load matching skills only for truly narrow workflows.

## Communication

- Reply in Korean honorifics. Answer directly; do not start with meta phrases like `확인했습니다`, `설명했습니다`, `답변했습니다`, or `처리했습니다`.
- Answer questions/objections before acting unless execution is explicit. If asked only to analyze/investigate, do not edit, commit, push, or open/update PRs.
- If corrected, apply the fix now and update `AGENTS.md` before final response when the mistake can recur. Do not use formulaic apologies or evidence-report prefaces such as `지금 확인된 사실은`; do not say `next time` or `앞으로`.
- Use user-provided references/artifacts directly before broad search or alternatives.
- Avoid rhetorical contrast patterns such as `not just A` or `단순 A가 아닌`.
- For negative yes/no questions in Korean, use `네` to confirm the negative premise and `아니요` only to reject it.

## Tools

- Web: `xh`; search: `rg --heading`, `fd`, `fzf`; GitHub: `gh`; web validation/screenshots: `playwright-cli`.
- Use task-scoped commands/formatters. Exit code `0` with no output means completed.
- When uncertain, use `npm:pi-ask-user` before proceeding.

## Before editing

1. Identify the repo root.
2. Read applicable `AGENTS.md` files.
3. Check `git status --short`.
4. Verify target files belong to the intended repo.
5. Prefer tracked files; create new files only inside the intended repo.

## Implementation

- Do not reduce requested scope without approval. Preserve requested behavior, content, comments, libraries, frameworks, and platform support unless removal is requested.
- Follow explicit approaches; ask if unclear or risky. Investigate documented command failures before replacing commands.
- Verify facts with diagnostics before explaining corrections.
- Before finalizing, review assistant changes for simpler, smaller, clearer code without reducing scope.
- When writing issues, PRs, Markdown, docs, changelogs, release notes, or similar text, include direct related URLs/issues/PRs; search when relevant, and state if none are available.

## Validation

- Prefer TDD; add meaningful behavior tests. If requested TDD or bugfix, commit failing tests before fixes, verify failure, then verify pass.
- Cover boundaries, negative paths, relevant state combinations, and adjacent regressions.
- Do not run commands that invoke forbidden formatters transitively.
- Fix validation failures on touched files before final summary.
- Do not call failures pre-existing unless proven on the base branch.
- For CI/release/platform/build changes, run matching local workflows when feasible or state unverified paths.

## Completion

- After each task, run `~/.local/bin/notify --id "$PWD" "{{Korean title}}" "{{Korean summary with actual conclusion/result/answer}}"`; add `--click "$URL"` for important URLs. Title should answer tersely; body must state the result directly without meta phrases.
- After a major mistake, stop, identify the repeated failure mode, and update the relevant `AGENTS.md` only if existing rules cannot cover it.
- AGENTS updates must prevent the mistake class by editing existing rules where possible; avoid incident-specific, tool-specific, or blame-shifting rules.
- For conduct/instruction mistakes, update global `AGENTS.md`; repo `AGENTS.md` files should stay repo-specific.

## Git

- If tracked files change, commit assistant-made changes before final response unless commits are forbidden, the task is analysis-only, user changes are ambiguous, or validation fails.
- Use atomic conventional commits and commit only assistant-made changes. Do not duplicate automation metadata such as `Assisted-by` trailers.
- Before final response, verify tracked changes and either commit or state the exact skip reason.
- Branch names: `{type}/{issue-number}/{issue-slug}` or `{type}/{slug}` from `upstream/main` if available, else `origin/main`.
- For requested new worktrees, use `https://github.com/coderabbitai/git-worktree-runner`.
- Never run discard-style commands on tracked files unless explicitly asked for those exact files.
- Treat unstaged tracked changes as user-owned unless proven otherwise.
- Before amend/force-push, verify `HEAD` and inspect `git diff --cached --name-status`.

## GitHub and PRs

- Use `gh`; do not comment unless requested.
- Read PR templates and existing PR bodies before editing; preserve human content, screenshots, artifacts, checklist state, related links, and prose.
- Patch existing PR bodies minimally; save the current body first. Do not regenerate sections when a targeted patch is enough.
- Before creating/updating PR bodies, run task-specific `gh search issues`/`gh search prs`, add discovered related links, and remove generic filler.
- If a PR resolves an issue, put `close #NUMBER` before any full URL references.
- Avoid redundant prose covered by templates/checklists. Keep PR bodies terse; do not fill optional fields with meaningless text.
- When templates ask for testing/reviewer suggestions, include concrete steps and expected results beyond commands run.
- Before PR titles, read changelog/title guidelines and make subjects player-facing when required.
- For web UI PRs, attach `playwright-cli` screenshots.
- If formatter setup is missing, configure the documented target-scoped workflow and rerun before PR updates.
- For PRs from external reports, link the report and rerun timed-out validation with sufficient timeout before calling it unverified.
- Update PR body/checklist after follow-up changes affecting implementation, compatibility, or validation.

## Coding conventions

- Prefer FP, TypeScript options objects for 3+ args, C++ structs, single-line arrow functions, and ternaries.
- YAML: use inline syntax for short maps/lists, e.g. `env: { FOO: bar }`, `foo: [1, 2, 3]`.
