---
name: rimworld-csharp
description: RimWorld C# coding conventions. Use whenever writing, modifying, or reviewing C# code or keyed localization text for a RimWorld mod.
---

# RimWorld C#

- Use `var` for every local variable whose type the compiler can infer. Keep explicit types for members, parameters, return types, and declarations where inference is unavailable.
- Use semantic named arguments for every interpolated keyed translation. Pass values with `Named("argumentName")` and use the exact matching `{argumentName}` placeholder in every language file; do not use positional placeholders such as `{0}`.
- Keep placeholder names stable across translations and verify every affected `Translate(...)` call against its keyed XML entry.
