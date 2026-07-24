---
name: rimworld
description: RimWorld mod C# and F# conventions, keyed localization, dependency setup, formatting, and build validation. Use whenever writing, modifying, reviewing, formatting, or building .NET code or keyed localization for a RimWorld mod.
---

# RimWorld

## RimWorld 1.6 reference source

- Use the local RimWorld 1.6 decompiled reference clone at `/home/scarf/repo/rw/RimworldDecompile` to verify native APIs, implementation details, and efficient vanilla call patterns before guessing
- Reuse this clone instead of creating temporary duplicate clones; treat it as read-only reference material and do not copy decompiled game code into mods
- For performance work, inspect both the relevant native type and vanilla call sites using that API, then prefer cached managers, grids, region listers, and direct lists over broad enumerable scans

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
- Only add `///` XML docstrings when they supply information the code does not already express: mathematical models, design intent, non-obvious side effects, contracts, or category groupings of large member lists. Never add docstrings that merely paraphrase a function name, its parameter names, its return type, or a self-documenting attribute such as `[<HarmonyPatch>]` or `[<StaticConstructorOnStartup>]`. A one-line private helper with a descriptive name and a self-explanatory body rarely needs a docstring.
- When a docstring references an uncommon concept (mathematical model, algorithm, domain-specific term), include a URL to the canonical reference so readers can learn more without guessing search terms.

## Build

1. Read the repository's build instructions and project files, then invoke the documented project command directly.
2. On this machine, when the repository does not pin a .NET SDK, build SDK-style RimWorld projects with:
   ```sh
   mise exec dotnet@8.0.422 -- dotnet build <path-to-project-file> -c Release
   ```
3. Do not change the global mise default merely because bare `dotnet` reports that no shim version is set.
4. Verify zero build errors and inspect the project-defined output path for the expected mod DLL. If the build fails, stop before installation and report the blocker.
5. Install only the exact DLL produced by the verified target-source build. Never patch, rewrite, decompile/recompile, or substitute a DLL to bypass a source build failure, including in a local test mod.
6. Do not copy or overwrite build artifacts (such as DLLs) in the Steam Workshop directory (`steamapps/workshop/content/...`). This directory is managed automatically by Steam. Mod installation, local testing, and debugging must only target the local RimWorld `Mods` directory (`steamapps/common/RimWorld/Mods/...`) or user-managed directories. A running game does not prohibit copying a verified build into a local mod; it continues using its already loaded DLL until restart. Do not require exit merely to install that DLL.

## Local runtime paths

- RimWorld install: `/media/scarf/@steam/SteamLibrary/steamapps/common/RimWorld`
- Mods directory: `/media/scarf/@steam/SteamLibrary/steamapps/common/RimWorld/Mods`
- Player log: `/home/scarf/.config/unity3d/Ludeon Studios/RimWorld by Ludeon Studios/Player.log`
- Mods config: `/home/scarf/.config/unity3d/Ludeon Studios/RimWorld by Ludeon Studios/Config/ModsConfig.xml`
- Prefs (language, resolution): `/home/scarf/.config/unity3d/Ludeon Studios/RimWorld by Ludeon Studios/Config/Prefs.xml`
- CE Steam Workshop: `/media/scarf/@steam/SteamLibrary/steamapps/workshop/content/294100/2890901044`
- RimWorld 1.6 reference decompile: `/home/scarf/repo/rw/RimworldDecompile`

## Translations (DefInjected)

- Folder: `Languages/[langFolderName]/DefInjected/[DefType]/` — `DefInjected` must use this exact case (capital D, capital I). RimWorld's `DefInjectionsFolderName` constant is `"DefInjected"` and the match is case-sensitive on Linux.
  `langFolderName` must match `Prefs.xml` `<langFolderName>` EXACTLY, including parentheses. Korean: `Languages/Korean (한국어)/DefInjected/`.
- Do not create the folder as `defInjected` — the lowercase variant will be silently ignored.
- Subdirectories named by Def type with trailing 's' (`DamageDefs`, `HediffDefs`, `ThingDefs`). RimWorld strips trailing 's' if exact type match fails, then retries.
- Key format: `<defName.fieldName>translated text</defName.fieldName>` (e.g. `<CEOP_Barotrauma.label>기압손상</CEOP_Barotrauma.label>`)
- For custom Def types in custom namespaces, use the def type's full name as the folder (e.g. `CombatExtended.AmmoCategoryDef/`). Standard Verse defs use bare type names.
- Translation files are simple key-value XML; `LoadFolders.xml` does not need a Languages entry.

## CE-specific APIs

- `GenExplosionCE.DoExplosion` is a standalone static method (not an override of `GenExplosion`). Patch with `[<HarmonyPatch(typeof<GenExplosionCE>, nameof GenExplosionCE.DoExplosion)>]`.
- CE explosion armor penetration: `GetExplosionArmorPenetration()` = `damageAmountBase * ExplosiveArmorPenetrationMultiplier` where multiplier = 0.4f. This is blunt penetration in MPa.
- CE explosion damage may be scaled by the firing weapon's `RangedWeapon_DamageMultiplier` stat. Radius comes from XML `explosionRadius` unscaled.
- Thermobaric detection: check `DamageDef.isExplosive && typeof<DamageWorker_Flame>.IsAssignableFrom(damageDef.workerClass)`. CE's `Thermobaric` DamageDef inherits from `Bomb` and uses `DamageWorker_Flame`.
- Howitzer thermobaric shells: projectile uses `PrometheumFlame` (non-explosive) → CompExplosiveCE triggers secondary explosion with `explosiveDamageType=Thermobaric`. The overpressure postfix on `GenExplosionCE.DoExplosion` fires for the comp explosion.
- `RegionTraverser.BreadthFirstTraverse` accepts an `entryCondition` predicate (e.g. check `region.door == null || region.door.Open`) and a `regionProcessor`. Prefer over `map.mapPawns.AllPawnsSpawned`.
- `Region.ListerThings.ThingsInGroup(ThingRequestGroup.Pawn)` returns pawns in a region. Deduplicate with a pooled `HashSet<Pawn>` from `SimplePool<T>`.
- `Room.UsesOutdoorTemperature` is true when touching map edge or `OpenRoofCount >= ceil(CellCount * 0.25)`. Use as a proxy for enclosed-space detection.
- CE stores additional explosion stats in `ExplosionCE` (extends `Explosion`): `height`, `armorPenetration`, `damAmount`, `FalloffCurve`, `GetArmorPenetrationAtCE(IntVec3)`.

## Custom def creation

- Custom `DamageDef`: inherit from `BluntBase` or `Bomb` via `ParentName`. Override `workerClass` to `DamageWorker_AddInjury` to avoid vanilla Blunt stun/penetration mechanics when handling effects yourself. Set custom `<hediff>`, `<hediffSkin>`, `<hediffSolid>` to reference custom `HediffDef`s for distinguishable injuries.
- Custom `HediffDef` for injuries: inherit from `InjuryBase` (abstract, provides `hediffClass>Hediff_Injury</hediffClass>` and other base properties). Include `HediffCompProperties_TendDuration`, `HediffCompProperties_Infecter`, `HediffCompProperties_GetsPermanent` comps as needed. Set `injuryProps` with `painPerSeverity`, `bleedRate`, `canMerge`, `destroyedLabel`.
- Custom mod extension: subclass `DefModExtension` with mutable fields. Declare with `[<AllowNullLiteral>]`. Add via `<li Class="Namespace.ExtensionClass">` in XML or via `PatchOperationAddModExtension` in patches.
- Use `PatchOperationFindMod` with `<mods><li>Combat Extended</li></mods>` guard when patching CE defs.
- Use `PatchOperationAddModExtension` to add extensions to specific defs by xpath.

## Mod Settings (player-facing configuration)

- When the user asks for a toggle or setting that the **player** should control at runtime (e.g. enable logging, adjust thresholds), implement `Mod` + `ModSettings` — never bury it as an XML def field that requires manual file edits.
- XML def fields (`OverpressureSettingsDef`, `ThingDef`, etc.) are for **mod developer** tuning, not player configuration. They ship with reasonable defaults and are only changed when recalibrating the mod itself.
- Pattern:
  - Subclass `Mod(content: ModContentPack)` with `override SettingsCategory()` and `override DoSettingsWindowContents(Rect)`.
  - Subclass `ModSettings()` with `let mutable` fields, public members, and `override ExposeData()` calling `Scribe_Values.Look`.
  - In F#, place `ModSettings` subclass **before** `Mod` subclass in the same file (F# type ordering). Use `let mutable` + property wrappers instead of `[<DefaultValue>] val mutable` to avoid CLR init issues.
  - Do not call `GetSettings<T>()` from the constructor body; defer to `LongEventHandler.ExecuteWhenFinished`.

## CE stats calibration

- CE explosion `damageAmountBase` and `explosionRadius` are game-design values, not physical quantities. Do not treat them as direct TNT/kg mappings without calibration.
- For HE artillery/mortar rounds, a log-linear power-law model `tntKg = k · damage^a · radius^b` fits real-world data with R² ≈ 0.96. Airburst variants (same filler, wider radius) help disentangle damage vs radius contributions.
- Thermobaric weapons have CE stats that are inconsistent with real blast yields — a separate regression model fails (R² ≈ 0.40). Use explicit per-weapon `tntEquivalentKg` override values instead.
- Small-caliber thermobarics (30-40mm) produce ~0.03-0.05 kg TNT blast equivalent; RPG-7 thermobaric ~1.8-3.0 kg; howitzer thermobaric comp explosions ~4-9 kg.
- HE regression-derived coefficients for `OverpressureSettingsDef`: `damagePerKgTnt ≈ 236`, `damageYieldWeight ≈ 0.82`, `YieldExponent ≈ 1.60`, `RadiusMetresPerKgTnt = 2.0`.
- CE caliber multiplier: damage may be scaled by `RangedWeapon_DamageMultiplier` stat on the firing weapon. Radius is not scaled. Always verify in-game values via UI or debug log before using in calibration.

## First-party mod justfile

- Every mod authored in its own repository must include a tracked root `justfile`. Once present, treat its recipes as the project contract instead of invoking their underlying commands separately.
- Provide these public recipes:
  - `just fmt`: format all source using tracked configuration—K&R via `dotnet format` for C#, or a repository-pinned Fantomas tool for F#.
  - `just build`: compile the mod and produce every runtime assembly in its project-defined version directory.
  - `just install`: depend on `build`, then synchronize the complete runtime mod tree into a dedicated directory under the local RimWorld `Mods` directory. Exclude repository and development-only files, and constrain deletion to that dedicated destination.
  - `just enable`: depend on `install`, then idempotently add the `packageId` from `About/About.xml` to `activeMods` in `ModsConfig.xml`. Preserve every existing entry and its order, never add a duplicate, and leave valid XML.
- Make local paths environment-overridable and use these defaults on this machine:
  - RimWorld: `/media/scarf/@steam/SteamLibrary/steamapps/common/RimWorld`
  - Config: `/home/scarf/.config/unity3d/Ludeon Studios/RimWorld by Ludeon Studios/Config/ModsConfig.xml`
  - Log: `/home/scarf/.config/unity3d/Ludeon Studios/RimWorld by Ludeon Studios/Player.log`
- Do not edit `ModsConfig.xml` while RimWorld is running because the game can overwrite it on exit.
- Validate a new justfile with `just --list`, `just fmt`, and `just build`; run `just fmt` a second time to verify idempotence. Run `just install` or `just install-enable` only when the task explicitly requests the corresponding local state change.
