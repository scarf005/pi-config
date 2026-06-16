---
name: performance-pr-evidence
description: Use when writing or updating PRs, issues, release notes, or reports that compare performance, cache effectiveness, benchmark results, CI timing, runtime timing, build speed, throughput, or memory usage.
---

# Performance PR Evidence

- Include a compact before/after table with the measured baseline and result.
- Show both absolute values and relative improvement when timing, throughput, cache hits, memory, or size changes.
  - Timing: include percent less/more time and speedup/slowdown multiplier when useful.
  - Cache effectiveness: include hit counts/rates when available.
- Link evidence without widening tables:
  - Prefer linking row labels such as `[Before](...)` and `[After](...)`.
  - Avoid raw URLs and separate evidence URL columns unless the table needs multiple links per row.
- Keep methodology terse; include only enough context for reviewers to trust and reproduce the measurement.
- Do not claim broad performance wins from one noisy sample; label narrow CI/job measurements as that exact job/result.
