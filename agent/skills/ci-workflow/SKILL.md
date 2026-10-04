---
name: ci-workflow
description: CI/CD workflow rules. Use when creating or modifying GitHub Actions, scheduled workflows, cron jobs, build/test/release automation, or Deno setup in CI.
---

# CI Workflow

- Match existing workflow style, permissions, triggers, package manager, local scripts, and release/platform event class
  before adding patterns
- Treat repository presets, package-manager scripts, and CI jobs as the contract; invoke them directly, use
  fresh/reconfigure options for stale state, and validate observable outputs instead of duplicating cache
  variables/options
- When CI fails after an intentional behavior change, verify whether expectations or fixtures are stale before changing
  intended implementation behavior
- Run the matching local workflow when feasible and state exact unverified event/platform/release paths
- Before adding runtime permissions, enumerate required paths, executables, and environment variables; scope grants and
  verify an out-of-scope operation is denied. Do not describe unrestricted grants as minimal. Subprocess permissions
  bypass the runtime sandbox; report that boundary explicitly.
- When using `denoland/setup-deno@v2`, use `with: { cache: true }`.
- If a project needs a scheduled GitHub Actions cron job, add `gautamkrishnar/keepalive-workflow@v2` so inactive
  repositories keep scheduled workflows enabled; `scarf005/sangiyo` is an example case.
- Prefer keepalive API mode in a separate job with `permissions: { actions: write }`, `actions/checkout@v4`, and no
  dummy commits.
- Use `workflow_files` when a dedicated keepalive workflow maintains other scheduled workflow files.
