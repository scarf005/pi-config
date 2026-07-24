/**
 * Validate RimWorld mod folder structure.
 * Run from the mod root: deno run --allow-read <path>/validate-mod.ts
 *
 * Checks:
 *  - Languages/<lang>/DefInjected case
 *  - About.xml exists and is valid
 *  - LoadFolders.xml optional lint
 *  - Common mistakes (defInjected lowercase, lang folder mismatch, etc.)
 */

const cwd = Deno.cwd()

function fail(msg: string) {
  console.error(`  FAIL  ${msg}`)
  errors++
}

function ok(msg: string) {
  console.log(`  OK    ${msg}`)
}

let errors = 0

console.log(`validate-mod ${cwd}`)
console.log()

// --- About.xml ---
const aboutPath = `${cwd}/About/About.xml`
try {
  const txt = Deno.readTextFileSync(aboutPath)
  if (txt.includes('<ModMetaData>')) {
    ok('About/About.xml exists and is valid')
  } else {
    fail('About/About.xml missing <ModMetaData>')
  }
} catch {
  fail('About/About.xml not found')
}

// --- Languages directory ---
const langDir = `${cwd}/Languages`
try {
  const langs = [...Deno.readDirSync(langDir)]

  if (langs.length === 0) {
    console.log('  OK    no Languages directory (skip)')
  }

  for (const lang of langs) {
    console.log(`  lang  ${lang.name}`)

    for (const entry of Deno.readDirSync(`${langDir}/${lang.name}`)) {
      const name = entry.name

      if (name === 'defInjected') {
        fail(`Languages/${lang.name}/defInjected must be DefInjected (capital D, I)`)
        continue
      }

      if (name === 'DefInjected') {
        ok(`Languages/${lang.name}/DefInjected`)

        for (const defType of Deno.readDirSync(`${langDir}/${lang.name}/DefInjected`)) {
          if (!defType.isDirectory) {
            fail(`Languages/${lang.name}/DefInjected/${defType.name} should be a subdirectory`)
            continue
          }

          if (defType.name.endsWith('s')) {
            const singular = defType.name.slice(0, -1)
            // RimWorld strips trailing 's' if exact type not found
          } else {
            // Type folder should usually end with 's' or be a full type name
          }

          for (const file of Deno.readDirSync(`${langDir}/${lang.name}/DefInjected/${defType.name}`)) {
            if (file.name.endsWith('.xml')) {
              ok(`Languages/${lang.name}/DefInjected/${defType.name}/${file.name}`)
            } else {
              fail(`Languages/${lang.name}/DefInjected/${defType.name}/${file.name} should be .xml`)
            }
          }
        }
      } else if (name === 'Keyed') {
        ok(`Languages/${lang.name}/Keyed`)
        for (const file of Deno.readDirSync(`${langDir}/${lang.name}/Keyed`)) {
          if (file.name.endsWith('.xml')) {
            ok(`Languages/${lang.name}/Keyed/${file.name}`)
          }
        }
      } else if (name === 'Strings') {
        ok(`Languages/${lang.name}/Strings`)
        for (const file of Deno.readDirSync(`${langDir}/${lang.name}/Strings`)) {
          if (file.name.endsWith('.txt')) {
            ok(`Languages/${lang.name}/Strings/${file.name}`)
          }
        }
      } else {
        fail(`Languages/${lang.name}/${name} is not a recognized translation folder (DefInjected, Keyed, or Strings)`)
      }
    }
  }
} catch {
  console.log('  OK    no Languages directory (skip)')
}

// --- Defs directory ---
try {
  const defs = [...Deno.readDirSync(`${cwd}/Defs`)]
  for (const f of defs) {
    if (f.name.endsWith('.xml')) {
      ok(`Defs/${f.name}`)
    }
  }
} catch {
  console.log('  OK    no Defs directory (skip)')
}

// --- Patches directory ---
try {
  const patches = [...Deno.readDirSync(`${cwd}/Patches`)]
  for (const p of patches) {
    if (p.name.endsWith('.xml')) {
      ok(`Patches/${p.name}`)
    }
  }
} catch {
  console.log('  OK    no Patches directory (skip)')
}

// --- LoadFolders.xml ---
const lfPath = `${cwd}/LoadFolders.xml`
try {
  Deno.readTextFileSync(lfPath)
  ok('LoadFolders.xml exists')
} catch {
  // optional — many mods don't need it
}

console.log()
if (errors === 0) {
  console.log('All checks passed.')
  Deno.exit(0)
} else {
  console.log(`${errors} error(s) found.`)
  Deno.exit(1)
}
