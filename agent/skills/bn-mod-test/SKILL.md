---
name: bn-mod-test
description: "Cataclysm: Bright Nights mod validation. Use when running BN mod checks, --check-mods, --jsonverify, or validating CBN/Sky Island mod loading/runtime against local BN builds."
---

# BN Mod Test

Use the local source-tree BN binary for all BN mod validation:

```sh
/home/scarf/repo/cata/Cataclysm-BN/out/build/linux-full/src/cataclysm-bn-tiles
```

Rules:

- Do not use Flatpak, desktop launchers, distro packages, or unrelated installed BN binaries for mod validation.
- Before relying on validation, verify the binary exists and is executable.
- Put global options before `--check-mods`.
- Run the binary from `/home/scarf/repo/cata/Cataclysm-BN` so it can find `data/`.
- For the local Sky Island user-mod symlink, use:

```sh
cd /home/scarf/repo/cata/Cataclysm-BN && \
  out/build/linux-full/src/cataclysm-bn-tiles \
    --userdir /home/scarf/.local/share/cataclysm-bn \
    --dont-debugmsg \
    --check-mods CBN_Sky_Island
```

- If this binary is missing, stale, or fails before loading the target mod, report the validation as blocked instead of substituting another BN installation.
