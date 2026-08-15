---
name: project-prose
description: Project-facing Markdown and prose for documentation, issues, PRs, changelogs, release notes, and player-facing text. Use when writing or editing repository-facing prose.
---

# Project prose

- Use the repository's primary language and existing style
- Keep prose terse and actionable; link source configs/tools instead of copying them and remove obvious metadata or
  statistics unless requested or justified by measured performance
- Include direct related URLs when relevant; omit an empty related-links section rather than announcing that none were
  found
- Lead bug reports with the concrete symptom and related link, then reproduction, environment, and logs/backtrace; omit
  template filler, speculative diagnosis, and polished framing
- Do not include research/process provenance unless requested; use references as inputs rather than self-reporting
  content
- For player-facing docs, lead with visible consequences and omit developer provenance, fork/implementation history, and
  contributor workflow unless requested
- Preserve requested schema and content; do not add explanatory wrapper fields, source lists, validation notes, or
  commentary unless the consumer requires them
- Apply loaded task-specific style rules to the final text
