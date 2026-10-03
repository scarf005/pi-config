---
name: github-workflow
description: GitHub issue, pull request, branch, worktree, commit metadata, checks, review follow-up, and external contribution workflow. Use when creating or updating GitHub issues/PRs, preparing branches/worktrees, watching checks, or responding to reviews.
---

# GitHub workflow

- Use `gh`; do not comment unless requested
- For external reports about bundled components, identify whether the fix belongs upstream or in the host repository
  before branching or opening a PR
- Branch from `upstream/main` when available, otherwise `origin/main`; name branches
  `{type}/{issue-number}/{issue-slug}` or `{type}/{slug}`
- For requested new worktrees, use `https://github.com/coderabbitai/git-worktree-runner`
- Before retiring a worktree, recheck ownership, HEAD, index and local changes at the mutation boundary. Verify the
  actual tracked payload's content/modes against retained Git objects; earlier clean status or filesystem stats alone
  cannot prove preservation. Preserve unexpected local changes outside disposable storage before proceeding, unless
  their discard was explicitly authorized. Keep the requested Trash/permanent-deletion boundary.
- Dependency clearance must record inspected scope, limits and read failures. Only explicitly optional missing paths
  count as absent; permission/I/O failures and uninspected required scope block an absence claim.
- Inspect the specific PR/commit file list and diff before claiming whether it changed a file
- Read repository PR templates, title/changelog guidelines, and existing comparable PRs before drafting
- Before editing an existing issue or PR, fetch its current title and body with `gh`; patch a saved copy minimally and
  inspect a body-only diff that preserves human prose, artifacts, screenshots, generated blocks, checklist state, and
  links
- Before creating or updating a PR body, run task-specific issue/PR searches and add direct related links when found;
  include known source issues/PRs/branches/commits even when search misses them
- Put `close #NUMBER` before full URL references when the PR resolves an issue; close applicable open subissues
  explicitly
- Keep PR titles and bodies terse and concrete; omit optional filler and CI-redundant testing prose
- When a template asks for testing or reviewer guidance, include concrete steps and expected results
- For web UI PRs, upload `playwright-cli` screenshots to a GitHub gist and link raw gist URLs; do not commit media
  unless requested
- For external reports, link the report and rerun timed-out validation with sufficient timeout
- Treat `CHANGES_REQUESTED`, `still broken`, `does not work`, and follow-up screenshots as a new bug report: inspect the
  latest review/comment and artifact, reproduce the exact symptom, and do not rely on build/tests/CI alone
- Watch Cataclysm-BN checks at 10-minute intervals unless inspecting a failure; do not watch checks after metadata-only
  edits unless requested
- For CI permission/auth failures, compare the same step on recent comparable PRs before calling it PR-specific
- After follow-up implementation changes, replace stale cumulative PR bullets and update relevant
  compatibility/testing/checklist details
- After opening a PR, do not push follow-up commits or force-push unless the user explicitly asks to update the remote
  branch
