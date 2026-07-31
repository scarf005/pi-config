---
name: rimworld
description: RimWorld mod XML definitions, patches, load order, C# and F# conventions, keyed localization, dependency setup, formatting, and build validation. Use whenever modifying or reviewing a RimWorld mod.
---

# RimWorld

## RimWorld 1.6 reference source

- Use the local RimWorld 1.6 decompiled reference clone at `/home/scarf/repo/rw/RimworldDecompile` to verify native APIs, implementation details, and efficient vanilla call patterns before guessing
- Reuse this clone instead of creating temporary duplicate clones; treat it as read-only reference material and do not copy decompiled game code into mods
- For performance work, inspect both the relevant native type and vanilla call sites using that API, then prefer cached managers, grids, region listers, and direct lists over broad enumerable scans

## XML compatibility and load order

- Before changing an XML compatibility definition, inspect the target-version source of every named parent `ThingDef`, required workbench, research, race definition, and patched list
- For `Could not find parent node` errors, inspect `XmlInheritance.GetBestParentFor`, the add-on's `ModsConfig.xml` position, and the provider mod's `About.xml` before changing Defs or `LoadFolders.xml`. A parent from another mod is eligible only when its `loadOrder` is less than or equal to the child mod's load order
- When a compatible parent exists but loads after the add-on, preserve the original conditional `LoadFolders.xml` entries and declare the parent package IDs in `<forceLoadAfter>`. Use `<loadAfter>` only when the author or evidence establishes that enforced ordering causes a conflict
- Do not duplicate existing Def XML into `PatchOperationAdd` as a workaround for a load-order issue. Copy or replace a parent-dependent Def only after target-version source proves that no compatible parent exists
- Treat a user-provided Workshop comment, issue, log, or mod link as primary evidence: inspect it before proposing a substitute mechanism

## .NET

- Use semantic named arguments for every interpolated keyed translation. Pass values with `Named("argumentName")` and use the exact matching `{argumentName}` placeholder in every language file; do not use positional placeholders such as `{0}`. For example, use `Good: {name}` with `value.Named("name")`, never `Bad: {0}`.
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

## Translation validation

Run the structure validator from the mod root:
```bash
deno run --allow-read ~/.config/pi/agent/skills/rimworld/scripts/validate-mod.ts
```

It catches `defInjected` lowercase, missing `About.xml`, and unrecognized `Languages/` subdirectories.

## DLL management (binary artifacts)

- **Never commit `.dll` files to the repository.** Compiled assemblies are build artifacts, not source.
- Every mod repository must include `*.dll` in its `.gitignore`. Also add `Source/**/bin/` and `Source/**/obj/`.
- If a repository already tracks `.dll` files, remove them with `git filter-repo --path <path> --invert-paths` and force-push.
- Distribute compiled DLLs via GitHub Releases, not via git history. Copy the reference CI workflow from `references/ci-build-release.yml` into `.github/workflows/release.yml` and adjust the env vars.
- The CI workflow: builds the .dll on tag push → packages the full mod tree (About/, Assemblies/, Defs/, Languages/, Patches/, Textures/) into a zip → attaches to a GitHub Release.

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

- Every new mod must include English and Korean translations. Add player-facing keyed strings in both `Languages/English/Keyed/` and `Languages/Korean (한국어)/Keyed/`; add both DefInjected translations when the mod introduces translatable defs.

- Folder: `Languages/[langFolderName]/DefInjected/[DefType]/` — `DefInjected` must use this exact case (capital D, capital I). RimWorld's `DefInjectionsFolderName` constant is `"DefInjected"` and the match is case-sensitive on Linux.
  `langFolderName` must match `Prefs.xml` `<langFolderName>` EXACTLY, including parentheses. Korean: `Languages/Korean (한국어)/DefInjected/`.
- Do not create the folder as `defInjected` — the lowercase variant will be silently ignored.
- Subdirectories named by Def type with trailing 's' (`DamageDefs`, `HediffDefs`, `ThingDefs`). RimWorld strips trailing 's' if exact type match fails, then retries.
- For custom Def types in custom namespaces, use the def type's full name as the folder (e.g. `CombatExtended.AmmoCategoryDef/`). Standard Verse defs use bare type names.
- Translation files are simple key-value XML; `LoadFolders.xml` does not need a Languages entry.

### Key format — path resolution

The translation key is a dot-separated path that RimWorld navigates through the def's object graph. Three patterns exist:

1. **Direct def fields** — fields on the def class itself (e.g. `label`, `labelNoun`, `description`, `prettyLabel`):
   `<defName.fieldName>text</defName.fieldName>`
   e.g. `<CEOP_Barotrauma.description>폭발 충격파로 인한 내부 장기 손상입니다.</CEOP_Barotrauma.description>`

2. **Nested object fields** — fields on sub-objects referenced directly by the def (e.g. `injuryProps.destroyedLabel`, `injuryProps.destroyedOutLabel`):
   `<defName.parentField.childField>text</defName.parentField.childField>`
   e.g. `<CEOP_Barotrauma.injuryProps.destroyedLabel>파열됨</CEOP_Barotrauma.injuryProps.destroyedLabel>`

3. **Comp properties** — fields inside list elements in the `comps` list, accessed via `[TranslationHandle]`:
   `<defName.comps.handleFieldName.propertyName>text</defName.comps.handleFieldName.propertyName>`
   e.g. `<CEOP_Barotrauma.comps.HediffComp_GetsPermanent.permanentLabel>만성 압력손상</CEOP_Barotrauma.comps.HediffComp_GetsPermanent.permanentLabel>`
   
   **Crucially, the handle is determined by `[TranslationHandle]` on `HediffCompProperties.compClass` (a `Type` field), so the handle value is the runtime comp class name** (e.g. `HediffComp_GetsPermanent`, `HediffComp_TendDuration`), **not** the properties class name (`HediffCompProperties_GetsPermanent`).
   
   Common comp properties and their correct paths:
   | Property | Properties class | Runtime comp (handle) | Full path |
   |---|---|---|---|
   | `permanentLabel` | `HediffCompProperties_GetsPermanent` | `HediffComp_GetsPermanent` | `{defName}.comps.HediffComp_GetsPermanent.permanentLabel` |
   | `instantlyPermanentLabel` | `HediffCompProperties_GetsPermanent` | `HediffComp_GetsPermanent` | `{defName}.comps.HediffComp_GetsPermanent.instantlyPermanentLabel` |
   | `labelTendedWell` | `HediffCompProperties_TendDuration` | `HediffComp_TendDuration` | `{defName}.comps.HediffComp_TendDuration.labelTendedWell` |
   | `labelTendedWellInner` | `HediffCompProperties_TendDuration` | `HediffComp_TendDuration` | `{defName}.comps.HediffComp_TendDuration.labelTendedWellInner` |
   | `labelSolidTendedWell` | `HediffCompProperties_TendDuration` | `HediffComp_TendDuration` | `{defName}.comps.HediffComp_TendDuration.labelSolidTendedWell` |

   ❌ **Wrong**: `<CEOP_Barotrauma.permanentLabel>만성 압력손상</CEOP_Barotrauma.permanentLabel>` — RimWorld cannot find `permanentLabel` on the def class itself and silently discards the translation (logs an error).
   ✅ **Correct**: `<CEOP_Barotrauma.comps.HediffComp_GetsPermanent.permanentLabel>만성 압력손상</CEOP_Barotrauma.comps.HediffComp_GetsPermanent.permanentLabel>`

   To verify correct paths, run the game's language report or inspect the `DefInjectionUtility.ForEachPossibleDefInjectionInDefRecursive` traversal — it enumerates every translatable field with its suggested key path.

### Diagnostic: Checking translation key validity

If a translation does not appear in-game despite a seemingly correct XML entry:
- Check RimWorld's `Player.log` for `Couldn't inject` errors — these indicate path resolution failures.
- Verify the key format path: the game can navigate through to the exact field. Comp properties must use the `comps.CompClassName.propertyName` format because they live inside list elements, not on the def class.
- Run the RimWorld language report generator or compare against the output of `DefInjectionUtility.ForEachPossibleDefInjection` to list all valid translation keys for a def.

## Wound cause display (health tab tooltip)

- The "원인: ..." tooltip on hediffs in the health tab comes from `hediff.combatLogEntry` / `hediff.combatLogText`, which are set by `DamageResult.AssociateWithLog()` — never by `DamageInfo` alone.
- `DamageInfo.weapon` sets `Hediff_Injury.sourceLabel` / `sourceDef` for the bracketed label (e.g. "타박상 (볼레)"), but the full cause line requires a battle log entry.
- When applying damage outside the standard explosion/projectile pipeline (e.g. custom postfix damage), you must:
  1. Create a `BattleLogEntry_ExplosionImpact(instigator, recipient, weaponDef, projectileDef, damageDef)`
  2. `Find.BattleLog.Add(battleLogEntry)`
  3. Capture `pawn.TakeDamage(dinfo)` result and call `damageResult.AssociateWithLog(battleLogEntry)`
- `BattleLogEntry_ExplosionImpact` handles both Pawn and non-Pawn initiators (falls back to `initiatorThing = initiator.def`).
- `DamageResult.AssociateWithLog` sets `combatLogEntry` (WeakReference) and `combatLogText` (pre-generated string) on every hediff in the result. Without this, the cause tooltip will be empty regardless of `DamageInfo.weapon`.
- `Hediff_MissingPart` (destroyed body parts) is created inside `AddHediff`, not added to `DamageResult.hediffs`. `AssociateWithLog` only iterates `result.hediffs`, so destroyed parts won't get combat log info. After `AssociateWithLog`, check `pawn.health.hediffSet.PartIsMissing(part)` and manually set `combatLogEntry` / `combatLogText` on the matching `Hediff_MissingPart`.
- For CE-specific overpressure/explosion postfix damage: resolve the firing Pawn from the CE `instigator` parameter via `(instigator as ProjectileCE)?.launcher` before creating `BattleLogEntry_ExplosionImpact`, since CE passes the projectile object, not the Pawn.
- Reference: `DamageWorker.ExplosionDamageThing` in the decompiled source shows the canonical pattern.

## CE-specific APIs

- `GenExplosionCE.DoExplosion` is a standalone static method (not an override of `GenExplosion`). Patch with `[<HarmonyPatch(typeof<GenExplosionCE>, nameof GenExplosionCE.DoExplosion)>]`.
- CE explosion armor penetration: `GetExplosionArmorPenetration()` = `damageAmountBase * ExplosiveArmorPenetrationMultiplier` where multiplier = 0.4f. This is blunt penetration in MPa.
- CE explosion damage may be scaled by the firing weapon's `RangedWeapon_DamageMultiplier` stat. Radius comes from XML `explosionRadius` unscaled.
- Thermobaric detection: check `DamageDef.isExplosive && typeof<DamageWorker_Flame>.IsAssignableFrom(damageDef.workerClass)`. CE's `Thermobaric` DamageDef inherits from `Bomb` and uses `DamageWorker_Flame`.
- Howitzer thermobaric shells: projectile uses `PrometheumFlame` (non-explosive) → CompExplosiveCE triggers secondary explosion with `explosiveDamageType=Thermobaric`. The overpressure postfix on `GenExplosionCE.DoExplosion` fires for the comp explosion.
- `RegionTraverser.BreadthFirstTraverse` accepts an `entryCondition` predicate (e.g. check `region.door == null || region.door.Open`) and a `regionProcessor`. Prefer over `map.mapPawns.AllPawnsSpawned`.
- **Never mutate the map or apply damage inside a `RegionTraverser.BreadthFirstTraverse` callback.** `pawn.TakeDamage()`, `pawn.Kill()`, `thing.DeSpawn()`, and similar side effects can invalidate the region graph mid-traversal, corrupting the BFS worker's internal state and causing a native SIGSEGV crash. Collect pawns/things into a pooled collection during the traversal, then apply effects in a separate loop after traversal completes. This is the pattern used by vanilla `DamageWorker.ExplosionDamageThing` and every safe explosion handler.
- `Region.ListerThings.ThingsInGroup(ThingRequestGroup.Pawn)` returns pawns in a region. Deduplicate with a pooled `HashSet<Pawn>` from `SimplePool<T>`.
- `Room.UsesOutdoorTemperature` is true when touching map edge or `OpenRoofCount >= ceil(CellCount * 0.25)`. Use as a proxy for enclosed-space detection.
- CE stores additional explosion stats in `ExplosionCE` (extends `Explosion`): `height`, `armorPenetration`, `damAmount`, `weapon`, `projectile`, `FalloffCurve`, `GetArmorPenetrationAtCE(IntVec3)`.
- CE explosion `instigator` resolution: `CompExplosiveCE.Explode()` receives `instigator` from the caller — `ProjectileCE` passes `this` (the projectile itself, not the Pawn), `Projectile_FireTrail` passes `launcher` (the Pawn), `AmmoThing` passes `this`. When using the `instigator` parameter from a `GenExplosionCE.DoExplosion` postfix, resolve the actual Pawn via `(instigator as ProjectileCE)?.launcher` — `ProjectileCE.launcher: Thing` is the firing pawn/weapon.
- `GenExplosionCE.DoExplosion` sets `explosion.projectile = parent.def` from `CompExplosiveCE.Explode` (the explosive thing's ThingDef). The `weapon` parameter is explicitly null in typical calls. For battle log entries, use `projectile` (ThingDef) as both `weaponDef` and `projectileDef`.

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
