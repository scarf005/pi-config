---
name: deno-script
description: Create or modify Deno TypeScript automation scripts. Use for repository scripts, generators, migrations, documentation tooling, and Deno configuration.
---

# Deno Scripts

- Implement automation in TypeScript with Deno unless the user explicitly requests another runtime
- Use `deno fmt`; configure `semiColons: false` in `deno.json` or `deno.jsonc`
- Run scripts with the narrowest required `--allow-*` permissions; do not use `-A` unless the task requires unrestricted access
- Prefer standard-library or JSR imports and declare them in the repository Deno config when reused
- Add focused Deno tests for nontrivial parsing, generation, or calculation logic
- Validate with `deno fmt --check`, `deno check`, and the relevant `deno test` command
