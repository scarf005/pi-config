# Global Rules

## Priority

- Treat all applicable `AGENTS.md` rules as gates for every task, including metadata, related links, commits, and automation rules.
- Keep this file for always-on behavior; load matching skills only for truly narrow workflows.
- Do not edit `AGENTS.md` solely to force skill loading; make the skill metadata match the workflow instead.

## Communication

- Reply in Korean honorifics. Answer directly; do not start with meta phrases like `확인했습니다`, `설명했습니다`, `답변했습니다`, or `처리했습니다`.
- Answer questions/objections before acting unless execution is explicit. If asked only to analyze/investigate, do not edit, commit, push, or open/update PRs.
- If corrected, apply the fix now. Load the `agent-policy-updates` skill before considering any agent policy change. Do not use formulaic apologies or evidence-report prefaces such as `지금 확인된 사실은`; do not say `next time` or `앞으로`.
- Use user-provided references/artifacts directly before broad search or alternatives.
- For external reports involving a mod, plugin, extension, or bundled third-party component, identify whether the fix belongs in the upstream component repo or the host repo before branching or opening a PR; do not choose a bundled host-repo copy unless the user explicitly requests that target.
- For UI complaints with screenshots or recordings, identify the exact visible view/component/toolbar before editing; do not assume a similarly named surface is the one shown.
- Avoid rhetorical contrast patterns such as `not just A` or `단순 A가 아닌`.
- For negative yes/no questions in Korean, use `네` to confirm the negative premise and `아니요` only to reject it.

## Tools

- Web: `xh`; search: `rg --heading`, `fd`, `fzf`; GitHub: `gh`; web validation/screenshots: `playwright-cli`.
- Redact credentials and action tokens before printing command output, especially local service/cache API responses, config files, headers, URLs, and notification action payloads.
- Use task-scoped commands/formatters. Exit code `0` with no output means completed.
- For preset/profile-driven tools such as CMake presets, package-manager scripts, and CI jobs, treat the preset/profile as the contract: invoke it directly, use fresh/reconfigure options for stale state, and validate observable outputs instead of duplicating its cache variables/options in wrapper logic.
- When adding repository automation scripts in a project with Deno/TypeScript tooling, use Deno/TypeScript and the `deno-script` skill unless the user explicitly requests another language.
- When uncertain, use `npm:pi-ask-user` before proceeding.
- When the user explicitly asks to use subagents, delegate substantive planning or implementation to subagents before doing direct implementation work.
- You're on fish shell; avoid Bash-only syntax (`$'...'`, heredocs/EOF). For multi-line GitHub bodies, use `--body-file` with a temp file or stdin instead of inline quoting.

## Before editing

1. Identify the repo root.
2. Read applicable `AGENTS.md` files.
3. Check `git status --short`.
4. Verify target files belong to the intended repo.
5. Prefer tracked files; create new files only inside the intended repo.

## Implementation

- Do not reduce or broaden requested scope without approval. If the user names a specific entity/case, do not apply the change to related entities unless explicitly requested; if the user says all fields/items in a data category, enumerate matching loaders/keys/files before editing and treat omissions as blockers. Preserve requested behavior, content, comments, libraries, frameworks, and platform support unless removal is requested. When proxying, caching, downloading, or mirroring media, preserve the exact visible asset role/crop/source intent; do not substitute thumbnails, portraits, banners, or full-body images for each other. Do not invent source-backed content or data; before treating requested source data as unavailable, inspect directly linked source pages/details that can contain the missing fields, not just index/list pages. When the requested source lacks data, represent it as unavailable/disabled instead of filling plausible values. For bug/performance fixes, first identify the behavior contract/invariant and every gate enforcing it, then replace them with equivalent safer/faster paths; do not stop at one symptom such as a warning, message, or output. Do not delete fallback, validation, recovery, compatibility, or safety behavior unless the user explicitly requests that removal or diagnostics prove it is unreachable and unnecessary.
- Before changing numeric balance values, inspect adjacent same-role and same-category baselines and ensure the new ordering is intentional; do not tune values in isolation.
- Follow explicit approaches; ask if unclear or risky. Prefer the correct maintainable structure over the smallest diff; do not choose a worse location, API, or architecture solely to minimize change size. When minimizing LoC, count production/behavior changes; exclude tests and whitespace-only changes. Investigate documented command failures before replacing commands. Do not bypass requested workflows or validation steps without explicit approval; fix the underlying issue or report the blocker.
- When CI fails after an intentional behavior change, first check whether expectations/fixtures are stale; do not change implementation behavior to satisfy old tests unless the intended behavior is verified.
- Verify facts with diagnostics before explaining corrections. For app/game controls, keybindings, or UI menu paths, inspect the relevant code/docs before giving an exact shortcut or menu sequence.
- Do not manually edit generated files; change their sources and run the appropriate generator instead.
- Before finalizing, review assistant changes for simpler, smaller, clearer code without reducing scope.
- For CSS state styling, avoid reusing generic class names across unrelated components; verify state classes do not match structural selectors elsewhere before declaring visual bugs fixed.
- When writing issues, PRs, Markdown, docs, changelogs, release notes, or similar text, include direct related URLs/issues/PRs and search when relevant. If no related items are found, omit the related-links note instead of saying none were found.
- When writing any Markdown, docs, issues, PRs, release notes, skills, or similar prose, keep it terse: include only actionable or user-relevant content, link or invoke source configs/tools instead of copying their contents, and delete obvious metadata or statistics unless the change is justified by measured performance or the user requested benchmarks. For bug reports, lead with the concrete symptom and related link, then repro, environment, and logs/backtrace; do not add template filler, speculative diagnosis, or AI-polished framing. For performance PRs or benchmark-requested work, include a concise before/after result table in the PR body. Do not include research/process provenance in the deliverable unless the user asked for it; use requested references as inputs, not self-reporting content. For player-facing docs, omit developer provenance, fork history, implementation history, and contributor workflow unless the user asked for it; lead with visible gameplay consequences. For prose/style tasks, run the final text through the loaded style rules as the deliverable, not just as background reading.

## Validation

- Prefer TDD; add meaningful behavior tests. If requested TDD, bug reproduction, or bugfix starts with a reproducer, verify the focused test fails, then immediately commit that red test before investigating or implementing the fix. Do not skip the red-test commit because validation fails; the failing focused test is the required evidence for that commit. After fixes, verify the same focused test passes.
- Cover boundaries, negative paths, relevant state combinations, and adjacent regressions.
- Do not run commands that invoke forbidden formatters transitively.
- Fix validation failures on touched files before final summary.
- Do not call failures pre-existing unless proven on the base branch.
- For CI/release/platform/build changes, run matching local workflows when feasible or state unverified paths.
- For visual layout fixes, validate the exact reported interaction and at least the reported/screenshot viewport plus adjacent common viewports before claiming scrollbar, overflow, alignment, or sizing behavior is fixed; inspect the captured result when screenshots are part of the complaint.
- For data/content/live-site fixes, validate the exact user-reported record, field, asset, and UI state; broad string presence, successful builds, or deploy status are insufficient. For images/media, verify the final served asset identity with MIME/dimensions or an inspected render, not only the filename or URL.
- When validating source-tree-dependent behavior, use a binary or tool built from the target source/revision; do not substitute installed apps, Flatpaks, package-manager builds, or unrelated worktrees unless their revision is verified to match, and label the result as environmental if no matching binary is available.

## Completion

- After each task, run `~/.local/bin/notify --id "$PWD" "{{Korean title}}" "{{Korean summary with actual conclusion/result/answer}}"`; add `--click "$URL"` for important URLs. Title should answer tersely; body must state the result directly without meta phrases.
- For live-site fixes, do not say the live URL is fixed until the commit is pushed and the deployment is verified; if only local validation passed, state that explicitly.
- For mistakes or agent policy changes, load the `agent-policy-updates` skill.

## Git

- If tracked files change, commit assistant-made changes before final response unless commits are forbidden, the task is analysis-only, user changes are ambiguous, or validation fails from the assistant-made changes; if validation failure is proven unrelated or pre-existing, commit the scoped fix and report the unrelated blocker.
- When a requested task starts with uncommitted tracked changes in the target repo and commits are allowed, immediately commit those existing changes first in a separate checkpoint commit before any new edit, then make and commit your own changes separately; do not postpone the checkpoint, cite uncommitted changes as a reason to skip your commit, or mix pre-existing changes with new work.
- Use atomic conventional commits. Commit pre-existing changes only as the separate checkpoint required above; otherwise commit only assistant-made changes. Split independent concerns into separate commits, such as UI/content, runtime/build plumbing, CI/deploy automation, docs, and tests; do not collapse broad multi-part work into one commit merely because it is one deployable feature. Before every commit, inspect `git diff --cached --name-status` and abort if any unrelated or user-owned path is staged. Preserve existing automation metadata such as `Assisted-by` trailers; do not add duplicate automation trailers. When a commit body is requested, use concise newline-separated bullets instead of a prose paragraph.
- Before final response, verify tracked changes and either commit or state the exact skip reason.
- Branch names: `{type}/{issue-number}/{issue-slug}` or `{type}/{slug}` from `upstream/main` if available, else `origin/main`.
- For requested new worktrees, use `https://github.com/coderabbitai/git-worktree-runner`.
- Never run discard-style commands on tracked files unless explicitly asked for those exact files.
- Treat unstaged tracked changes as user-owned unless proven otherwise.
- Before amend/force-push, verify `HEAD` and inspect `git diff --cached --name-status`.
- After opening a PR, do not push follow-up commits or force-push unless the user explicitly asks to update the remote branch; keep local changes unpushed and report them.

## GitHub and PRs

- Use `gh`; do not comment unless requested.
- For questions about whether a PR/commit changed a file, inspect the specific PR/commit file list and diff before concluding from current branch state or broad search results.
- When the user explicitly asks to open/create/update a PR, complete the PR action and obtain the PR URL before the final response unless blocked; if blocked, state the blocker and the exact command/result.
- Read PR templates and existing PR bodies before editing; preserve human content, screenshots, artifacts, checklist state, related links, and prose.
- Before editing any existing PR/issue title or body, MUST read the current title and body from GitHub first (for example `gh pr view --json title,body` or `gh issue view --json title,body`) and base the edit on that current content.
- Patch existing PR bodies minimally; save the current body first. Do not regenerate sections when a targeted patch is enough. For an existing PR, do not replace the body from a newly drafted full-body file; only edit a copy of the saved current body and inspect a body-only diff that preserves human prose, checklists, artifacts, screenshots, and generated blocks before submitting.
- Before creating/updating PR bodies, run task-specific `gh search issues`/`gh search prs`, add discovered related links, and remove generic filler. Also link the known source PR/branch/commit when the work is a follow-up or regression from it, even if search misses it. Do not mention absent search results in PR bodies or comments; omit the section instead of writing phrases like `no related issues were found`.
- If a PR resolves an issue, put `close #NUMBER` before any full URL references; if the issue is an umbrella with open subissues that the PR should resolve, include closing keywords for those open subissues too because closing a parent issue does not close subissues.
- When opening PRs, be extremely terse: fill only required template fields with concrete bullets, omit optional filler, and keep summary/testing to the minimum needed.
- Avoid redundant prose covered by templates/checklists. Keep PR bodies terse; do not fill optional fields with meaningless text.
- When templates ask for testing/reviewer suggestions, include concrete steps and expected results beyond commands run.
- Before PR titles, read changelog/title guidelines and make subjects player-facing when required.
- For web UI PRs, attach `playwright-cli` screenshots.
- When asked to attach screenshots or recordings to a PR, use GitHub-hosted attachments or existing external artifact URLs in the PR body/comment; never add media files to the repository unless the user explicitly asks to commit those assets.
- If formatter setup is missing, configure the documented target-scoped workflow and rerun before PR updates.
- For PRs from external reports, link the report and rerun timed-out validation with sufficient timeout before calling it unverified.
- Treat `CHANGES_REQUESTED`, `still broken`, `does not work`, and follow-up screenshots as a new bug report: inspect the latest review/comment and attachments, reproduce or cover the exact reported symptom, and do not claim verified/fixed from build/tests/CI alone.
- When watching Cataclysm-BN PR checks, poll at a 3-minute interval, e.g. `gh pr checks --watch --interval 180`, unless actively inspecting a failing job.
- Do not watch PR checks after metadata-only PR operations such as title/body/checklist/comment edits unless the user explicitly asks; treat metadata-only edits as outside any `after updating PR` check-watch rule. PR check watching applies after opening a PR or pushing branch/code changes.
- For CI permission/auth failures, compare the same workflow step on recent comparable PRs before calling the failure PR-specific.
- Update PR body/checklist after follow-up changes affecting implementation, compatibility, or validation.
- When updating an existing PR body, keep the patch terse: replace stale cumulative bullets instead of appending repeated explanations, omit optional sections instead of filling them with `N/A`, and keep Testing to concise non-CI-redundant evidence.

## Coding conventions

- Prefer FP, TypeScript options objects for 3+ args, C++ structs, single-line arrow functions, and ternaries.
- YAML: use inline syntax for short maps/lists, e.g. `env: { FOO: bar }`, `foo: [1, 2, 3]`.