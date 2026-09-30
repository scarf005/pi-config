---
name: deno-script
description: Create or modify Deno TypeScript automation scripts. Use for repository scripts, generators, migrations, documentation tooling, and Deno configuration.
---

# Deno Scripts

- Implement automation in TypeScript with Deno unless the user explicitly requests another runtime
- Use `deno fmt`; configure `semiColons: false` in `deno.json` or `deno.jsonc`
- Run scripts with the narrowest required `--allow-*` permissions; do not use `-A` unless the task requires unrestricted access
- Prefer maintained libraries over hand-written equivalents: `@std/*` for common utilities and tests, `valibot` for
  runtime validation, `@david/dax` for subprocesses and shell workflows, and established CLI/prompt libraries for
  argument parsing and hidden input. Do not reinvent functionality these libraries already provide
- Prefer JSR packages where available; use npm packages when appropriate. Declare reused imports in the repository
  Deno config
- A self-contained single-file script may import dependencies directly with versioned JSR/npm specifiers; it should
  not require companion source or config files. Avoid imports only when the user explicitly requests no dependencies
- Add focused Deno tests for nontrivial parsing, generation, or calculation logic
- Validate with `deno fmt --check`, `deno check`, and the relevant `deno test` command
