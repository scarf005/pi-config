---
name: rimworld
description: RimWorld mod C# conventions, keyed localization, and build validation. Use whenever writing, modifying, reviewing, or building C# code or keyed localization text for a RimWorld mod.
---

# RimWorld

## C#

- Use K&R braces: place each opening brace on the same line as its declaration, control statement, or object initializer, and keep `else`, `catch`, and `finally` on the same line as the preceding closing brace.
- Use `var` for every local variable whose type the compiler can infer. Keep explicit types for members, parameters, return types, and declarations where inference is unavailable.
- Use semantic named arguments for every interpolated keyed translation. Pass values with `Named("argumentName")` and use the exact matching `{argumentName}` placeholder in every language file; do not use positional placeholders such as `{0}`.
- Keep placeholder names stable across translations and verify every affected `Translate(...)` call against its keyed XML entry.

## Build

1. Read the repository's build instructions and project files, then invoke the documented project command directly.
2. On this machine, when the repository does not pin a .NET SDK, build SDK-style RimWorld projects with:
   ```sh
   mise exec dotnet@8.0.422 -- dotnet build <path-to-project.csproj> -c Release
   ```
3. Do not change the global mise default merely because bare `dotnet` reports that no shim version is set.
4. Verify zero build errors and inspect the project-defined output path for the expected mod DLL.

## First-party mod justfile

- Every mod authored in its own repository must include a tracked root `justfile`. Once present, treat its recipes as the project contract instead of invoking their underlying commands separately.
- Provide these public recipes:
  - `just build`: compile the mod and produce every runtime assembly in its project-defined version directory.
  - `just install`: depend on `build`, then synchronize the complete runtime mod tree into a dedicated directory under the local RimWorld `Mods` directory. Exclude repository and development-only files, and constrain deletion to that dedicated destination.
  - `just install-enable`: depend on `install`, then idempotently add the `packageId` from `About/About.xml` to `activeMods` in `ModsConfig.xml`. Preserve every existing entry and its order, never add a duplicate, and leave valid XML.
- Make local paths environment-overridable and use these defaults on this machine:
  - RimWorld: `/media/scarf/@steam/SteamLibrary/steamapps/common/RimWorld`
  - Config: `/home/scarf/.config/unity3d/Ludeon Studios/RimWorld by Ludeon Studios/Config/ModsConfig.xml`
- Do not edit `ModsConfig.xml` while RimWorld is running because the game can overwrite it on exit.
- Validate a new justfile with `just --list` and `just build`. Run `just install` or `just install-enable` only when the task explicitly requests the corresponding local state change.
