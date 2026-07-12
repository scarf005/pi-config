---
name: rimworld
description: RimWorld mod C# and F# conventions, keyed localization, dependency setup, formatting, and build validation. Use whenever writing, modifying, reviewing, formatting, or building .NET code or keyed localization for a RimWorld mod.
---

# RimWorld

## .NET

- Use semantic named arguments for every interpolated keyed translation. Pass values with `Named("argumentName")` and use the exact matching `{argumentName}` placeholder in every language file; do not use positional placeholders such as `{0}`.
- Keep placeholder names stable across translations and verify every affected `Translate(...)` call against its keyed XML entry.

## C#

- Use K&R braces: place each opening brace on the same line as its declaration, control statement, or object initializer, and keep `else`, `catch`, and `finally` on the same line as the preceding closing brace.
- Use `var` for every local variable whose type the compiler can infer. Keep explicit types for members, parameters, return types, and declarations where inference is unavailable.

## F#

- Target `net472` for RimWorld 1.6 and explicitly order every source file with `<Compile Include="..." />` in the `.fsproj`.
- Pin the shared runtime ABI with `<PackageReference Update="FSharp.Core" Version="4.7.2" ExcludeAssets="runtime" />`. Declare `latta.fsharp.core` as both a mod dependency and `loadAfter` entry, and verify the mod output does not contain a duplicate `FSharp.Core.dll`.
- Use modules and functions by default. Use scoped `internal` extension members when repeated member syntax materially improves a .NET-facing API, follow .NET PascalCase naming for members, and do not hide type conversions behind property-like extensions.
- Define Harmony patch arguments in tupled form so they compile to ordinary CLR method parameters, and initialize `PatchAll()` from a `[<StaticConstructorOnStartup>]` type. Prefer RimWorld 1.6 native extension points such as `FloatMenuOptionProvider` when their selection and invocation gates satisfy the requested behavior; otherwise patch the narrowest gate that does.
- Preserve C# API behavior explicitly at interop boundaries. Use pattern matching and `Option` for nullable results in non-hot paths. F# can apply exact, type-directed `op_Implicit` conversions, but it does not chain every C# upcast-plus-conversion sequence; construct `LocalTargetInfo`, `LookTargets`, and similar targets explicitly when inference fails.
- Prefer idiomatic pipelines and clarity before speculative optimization. `Seq.filter`, `Seq.sortBy`, tuples, and options are appropriate for infrequent user-triggered paths; reserve direct loops, allocation avoidance, and single-pass selection for measured or per-tick hot paths.
- Pin Fantomas as a repository-local .NET tool, store its settings in `.editorconfig`, and use it for all `.fs`, `.fsi`, and `.fsx` formatting.

## Build

1. Read the repository's build instructions and project files, then invoke the documented project command directly.
2. On this machine, when the repository does not pin a .NET SDK, build SDK-style RimWorld projects with:
   ```sh
   mise exec dotnet@8.0.422 -- dotnet build <path-to-project-file> -c Release
   ```
3. Do not change the global mise default merely because bare `dotnet` reports that no shim version is set.
4. Verify zero build errors and inspect the project-defined output path for the expected mod DLL.

## First-party mod justfile

- Every mod authored in its own repository must include a tracked root `justfile`. Once present, treat its recipes as the project contract instead of invoking their underlying commands separately.
- Provide these public recipes:
  - `just fmt`: format all source using tracked configuration—K&R via `dotnet format` for C#, or a repository-pinned Fantomas tool for F#.
  - `just build`: compile the mod and produce every runtime assembly in its project-defined version directory.
  - `just install`: depend on `build`, then synchronize the complete runtime mod tree into a dedicated directory under the local RimWorld `Mods` directory. Exclude repository and development-only files, and constrain deletion to that dedicated destination.
  - `just install-enable`: depend on `install`, then idempotently add the `packageId` from `About/About.xml` to `activeMods` in `ModsConfig.xml`. Preserve every existing entry and its order, never add a duplicate, and leave valid XML.
- Make local paths environment-overridable and use these defaults on this machine:
  - RimWorld: `/media/scarf/@steam/SteamLibrary/steamapps/common/RimWorld`
  - Config: `/home/scarf/.config/unity3d/Ludeon Studios/RimWorld by Ludeon Studios/Config/ModsConfig.xml`
- Do not edit `ModsConfig.xml` while RimWorld is running because the game can overwrite it on exit.
- Validate a new justfile with `just --list`, `just fmt`, and `just build`; run `just fmt` a second time to verify idempotence. Run `just install` or `just install-enable` only when the task explicitly requests the corresponding local state change.
