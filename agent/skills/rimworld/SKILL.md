---
name: rimworld
description: RimWorld mod C# conventions, keyed localization, and build validation. Use whenever writing, modifying, reviewing, or building C# code or keyed localization text for a RimWorld mod.
---

# RimWorld

## C#

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
