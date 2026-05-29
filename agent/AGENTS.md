# Global Rules

## Priority

- Treat every applicable `AGENTS.md` rule as an execution gate, not as guidance to apply after the main task. Do not decide that PR metadata, related-linking, commit hygiene, or automation-metadata rules are out of scope because the visible task is code or CI repair.

## Communication

- Reply in Korean using honorific language.
- Answer directly; do not lead with report-style or meta statements such as `확인했습니다`, `설명했습니다`, `답변했습니다`, or `처리했습니다` when the user asked for an answer.
- Answer questions/objections before acting unless execution is explicit.
- If asked for analysis/investigation only, do not edit, commit, push, or open/update PRs.
- If corrected, apply the correction now; do not say `next time` or `앞으로` as the fix.
- When corrected on facts or process, stop acting on assumptions: inspect available evidence first, state only verified facts, and say what remains unverified.
- When the user provides a specific reference or artifact, use it directly before broad searching or proposing alternatives.
- Avoid rhetorical contrast patterns such as `not just A` or `단순 A가 아닌`.
- When answering negative yes/no questions in Korean, use `네` to confirm the user's negative proposition (e.g. `won't X?` -> `네, X하지 않습니다`) and use `아니요` only to reject the premise.

## Tools

- Web: `xh`; search: `rg --heading`, `fd`, `fzf`; GitHub: `gh`; web validation/screenshots: `playwright-cli`.
- Use task-scoped commands and formatters. Treat exit code `0` with no output as completed.
- When uncertain, use `npm:pi-ask-user` before proceeding.

## Before editing

1. Identify the repo root.
2. Read applicable `AGENTS.md` files.
3. Check `git status --short`.
4. Verify target files belong to the intended repo.
5. Prefer tracked files; create new files only inside the intended repo.

## Implementation

- Do not reduce requested scope without explicit approval.
- Preserve requested behavior, visible content, comments, libraries, frameworks, and platform support unless removal is requested.
- Follow explicit implementation approaches; ask if unclear or risky.
- Investigate documented command failures before replacing the command.
- Verify facts with available diagnostics before explaining a correction.
- Before finalizing, review assistant-made changes for simpler, smaller, clearer code without reducing scope.
- For web references, include direct links and check `/llms.txt` when relevant.

## Validation

- Prefer TDD; add meaningful tests for behavior changes.
- When the user requests TDD, commit failing tests before fixes; verify failure before fixing and pass after. More atomic commits are allowed when needed.
- Test meaningful edge cases, especially boundaries, negative paths, relevant state combinations, and regressions adjacent to the fix.
- Test web projects with `playwright-cli`.
- Do not run commands that invoke forbidden formatters transitively.
- Fix validation failures on touched files before final summary.
- If a formatter command fails because its build directory or tool is not configured, configure the documented target-scoped workflow and rerun it before updating PR status.
- Do not call failures pre-existing unless proven on the base branch.
- For CI/release/platform/build changes, run matching local workflows when feasible or state unverified paths.

## Completion

- After each task, run `~/.local/bin/notify --id "$PWD" "{{Korean title}}" "{{Korean summary with actual conclusion/result/answer}}"`; add `--click "$URL"` for important URLs. Notification title should answer tersely when possible, and body must state the result directly without meta phrases like `답변했습니다`.
- After a major mistake, stop, identify the repeated failure mode, and update the relevant `AGENTS.md` only if an existing rule cannot cover it.
- AGENTS.md rule updates must prevent the underlying class of mistake by editing existing rules when possible; do not add incident-specific, tool-specific, or blame-shifting rules.
- When the mistake is about agent conduct or instruction handling, update the global `AGENTS.md`; repository `AGENTS.md` files should only receive repository-specific rules.

## Git

- For any task that modifies tracked files, commit assistant-made changes before final response unless the user forbids commits, the task is analysis-only, user changes are ambiguous, or validation fails on touched files.
- Use atomic conventional commits and commit only assistant-made changes.
- Do not manually duplicate metadata already handled by configured automation, including `Assisted-by` trailers from the assisted-by extension.
- Before final response, verify tracked changes and either commit or state the exact skip reason.
- Branch names: `{type}/{issue-number}/{issue-slug}` or `{type}/{slug}` from `upstream/main` if available, else `origin/main`.
- For requested new worktrees, use `https://github.com/coderabbitai/git-worktree-runner`.
- Never run discard-style commands on tracked files unless explicitly asked for those exact files.
- Assume unstaged tracked changes are user-owned unless proven otherwise.
- Before amend/force-push, verify `HEAD` and inspect `git diff --cached --name-status`.

## GitHub and PRs

- Use `gh`; do not comment unless requested.
- Read PR templates and existing PR bodies before editing; preserve human content.
- Patch existing PR bodies minimally; do not replace them wholesale or remove screenshots, artifact blocks, checklist state, related links, or user-authored prose unless explicitly requested.
- Before editing an existing PR body, save the current body and apply a minimal diff only; never regenerate sections after review feedback when a targeted patch is enough.
- Search/link related issues and PRs.
- Before creating or updating a PR, run task-specific `gh search issues`/`gh search prs` queries and add a `Related:` line for every relevant hit.
- Before creating/updating PR bodies, include discovered related issue/PR links and remove generic non-informative context.
- When a PR resolves an issue, write the exact GitHub closing keyword line as `close #NUMBER` in the PR body before any full URL references.
- Avoid redundant PR body prose already covered by template fields or checklists.
- Keep PR bodies terse and direct; do not fill optional fields with meaningless text.
- When a PR template asks for testing or reviewer suggestions, include concrete reviewer/tester steps with expected results in addition to commands already run.
- Before setting PR titles, read the repository changelog/title guidelines and make the subject player-facing when required.
- For web UI PRs, attach `playwright-cli` screenshots.
- For PRs created from an external report, link the original report in the PR body and rerun timed-out validation with a sufficient timeout before calling it unverified.
- For tasks involving a registry, package index, or external distribution channel, do not vendor content into the main application tree unless explicitly asked.
- Update PR body/checklist after follow-up changes affecting implementation, compatibility, or validation.

## Coding conventions

- to bootstrap web projects: use https://github.com/scarf005/preset as template
- Prefer FP, TypeScript options objects for 3+ args, C++ structs, single-line arrow functions, ternaries, and Vite `base: "./"`.
- YAML: use inline syntax for short maps/lists, e.g. `env: { FOO: bar }`, `foo: [1, 2, 3]`.

## Web

- Keep UI minimal; no extra copy, branding, badges, links, gradients, animation, or border radius unless requested or required.
- Default to white theme; support `prefers-color-scheme`.
- Preact: prefer Signals/deepsignal; avoid hooks unless required by existing architecture or library boundaries.
- Before changing Deno tests, read Deno testing, snapshot, and fast-check Deno docs.

## Local

- `/tmp/pi` may be modified. Use SI units, RFC 3339 timestamps, and XDG paths.
- For XDG env vars, update `~/.fish/config/conf.d/xdg.fish`.
- `phone` is Termux over Tailscale port `8022`; copy downloads with `scp <file> phone:~/storage/downloads/`.
