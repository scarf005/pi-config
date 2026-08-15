---
name: tdd-workflow
description: Test-driven bug fixes and reproductions. Use when the user requests TDD, asks to begin with a reproducer, or a bugfix explicitly starts by adding a failing test.
---

# TDD workflow

- Add a focused behavior test that reproduces the requested failure
- Run it and verify the expected failure before investigating or implementing
- Immediately commit the red test as a separate atomic commit; the expected failing result is required evidence, not a
  reason to skip the commit
- Implement the general fix, then rerun the same focused test and relevant adjacent tests
- Cover boundaries, negative paths, relevant state combinations, and adjacent regressions without bloating fixtures
