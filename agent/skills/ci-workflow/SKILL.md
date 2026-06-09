---
name: ci-workflow
description: CI/CD workflow rules. Use when creating or modifying GitHub Actions, scheduled workflows, cron jobs, build/test/release automation, or Deno setup in CI.
---

# CI Workflow

- Match existing workflow style, permissions, triggers, and package manager choices before adding new CI patterns.
- When using `denoland/setup-deno@v2`, use `with: { cache: true }`.
- If a project needs a scheduled GitHub Actions cron job, add `gautamkrishnar/keepalive-workflow@v2` so inactive repositories keep scheduled workflows enabled; `scarf005/sangiyo` is an example case.
- Prefer keepalive API mode in a separate job with `permissions: { actions: write }`, `actions/checkout@v4`, and no dummy commits.
- Use `workflow_files` when a dedicated keepalive workflow maintains other scheduled workflow files.
