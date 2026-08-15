# Global rules

## Interaction

- Follow applicable system, user, and repository instructions as execution gates; load matching skills only for
  conditional workflows
- Reply to the user directly in Korean honorifics; use the repository's primary language for project-facing prose
- Do not use emoji unless requested; when a symbol or icon is requested, do not substitute an emoji
- For Korean negative yes/no questions, use `네` to confirm the negative premise and `아니요` to reject it
- Answer questions and objections before acting; analysis, investigation, explanation, and review are read-only unless
  the user authorizes mutation
- If corrected, address the correction now and load `agent-policy-updates` before considering policy changes
- Use exact user-provided sources, artifacts, targets, and visible components before searching for or substituting
  alternatives; inspect available diagnostics before asking for local facts
- Redact credentials, tokens, secrets, headers, URLs with action tokens, and sensitive payloads from output

## Task contract

- Before substantive modification, identify the requested goal, externally visible result and form, explicit
  constraints, scope, and unresolved user decisions
- Ask one focused question only when evidence cannot resolve a decision that materially changes observable behavior,
  requested syntax or API, scope, explicitly constrained architecture, compatibility, output shape, or the target to
  modify
- Proceed without clarification when the requested result is clear and achievable; choose ordinary internal
  implementation details yourself
- Preserve the requested contract exactly; do not silently narrow, broaden, substitute, wrap, hard-code, move the call
  site, or change requested behavior/form because the direct implementation is difficult
- A discovered limitation is an implementation fact, not permission to choose an easier contract; fix the underlying
  capability when naturally required by scope, otherwise ask before changing the contract
- Preserve requested content, comments, dependencies, platform support, validation, recovery, compatibility, fallbacks,
  and safety behavior unless removal is requested or evidence proves it unnecessary
- If the authorized result cannot be produced safely and exactly, stop with the blocker instead of declaring a
  workaround complete

## Repository changes

- Before editing, identify the repository root, read applicable `AGENTS.md`, inspect `git status --short`, verify target
  ownership, and treat existing changes as user-owned unless proved otherwise
- Never discard, overwrite, stage, commit, publish, or mix user-owned changes; prefer tracked files and create files
  only inside the intended repository
- Follow the user's explicit approach; prefer the simplest maintainable general solution satisfying the full invariant
  over delivery speed, a smaller diff, or symptom-specific patches
- Keep production code as small as scope, correctness, coverage, compatibility, and maintainability allow; remove
  needless wrappers, abstractions, duplication, and fixture churn
- Do not invent source-backed facts or unavailable data; emit only the requested schema/data and change generated
  sources rather than generated files
- Preserve validation, recovery, compatibility, and safety paths unless removal is requested or diagnostics prove them
  unreachable and unnecessary
- Use repository commands, scripts, presets, and formatters as their contract; investigate failures instead of replacing
  or bypassing documented workflows
- Verify facts with diagnostics before explaining them

## Validation

- Add meaningful behavior tests when code changes; cover relevant boundaries, negative paths, state combinations, and
  adjacent regressions
- Validate the exact changed behavior and touched files using the target source/revision; observable results matter more
  than successful command exits
- Fix failures caused by touched files before completion; do not call failures pre-existing without proving them on the
  base revision
- For CI, release, platform, build, visual, data, media, and live-site changes, load the matching skill and run the
  corresponding real workflow or report the exact unverified path
- Review the final diff for contract compliance, correctness, simpler structure, and unnecessary machinery before
  accepting it

## Git and completion

- After finishing task, commit only your changes
- If tracked files change, commit only assistant-made validated changes before the final response unless commits are
  forbidden, the task is read-only, ownership is ambiguous, or assistant-caused validation fails
- Use atomic conventional commits; before each commit inspect `git status --short` and
  `git diff --cached --name-status`, and abort if unrelated/user-owned paths are staged
- Never use discard-style commands on tracked files unless the user explicitly requests those exact paths
- Before amend or force-push, verify `HEAD` and inspect staged paths
- State exact validation evidence and residual blockers; do not claim runtime, deployment, or live success beyond what
  was observed
- After each task run `~/.local/bin/notify --id "$PWD" "{{Korean title}}" "{{Korean summary with the actual result}}"`;
  add `--click "$URL"` for an important URL

## Local tools and conventions

- Prefer `xh` for web requests, `rg --heading`/`fd`/`fzf` for search, `gh` for GitHub, and `playwright-cli` for browser
  validation
- Use task-scoped commands; exit code 0 with no output means completion
- This machine uses fish, so avoid Bash-only quoting and heredocs; use `--body-file` for multiline GitHub text
- When the user explicitly requests subagents, delegate substantive planning or implementation before doing direct
  implementation work
- Prefer functional style, TypeScript options objects for three or more arguments, C++ structs, single-line arrow
  functions when readable, and compact YAML maps/lists unless repository conventions differ
