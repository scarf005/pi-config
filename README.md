# pi config

Personal pi coding agent configuration.

SPDX-License-Identifier: AGPL-3.0-only

## GPT profile

[Settings](agent/settings.json) start new sessions with `openai-codex/gpt-6-astra` and medium thinking.
Other enabled models and subagent model/fallback assignments are preserved. Use `/model` to switch an existing
session; restart Pi to pick up the complete configuration. Transport, caching, retries, and compaction keep Pi's defaults.

[Global rules](agent/AGENTS.md) retain the task contract, ownership, validation, and language preferences without
repeated gates. The investigation skill excludes ordinary questions and routine implementation inspection.
User-owned changes require permission before a separate checkpoint commit. A nonexistent local package entry was removed;
installed extensions were not removed.

### Policy validation

```sh
# Installed SDK/catalog and global skill discovery; no model requests.
PI_OFFLINE=1 node tests/policy.mjs --baseline=b56ae7a

# Sends tool-free evaluation requests to Astra and Terra using configured authentication.
# PI_OFFLINE prevents startup/catalog networking, not these explicitly requested completions.
PI_OFFLINE=1 node tests/policy.mjs --baseline=b56ae7a --live
```

[Recorded results](evals/policy-results.json), Pi 0.85.1, UTF-8 bytes:

| Scope | Before | After | Reduction |
|---|---:|---:|---:|
| Global `AGENTS.md` | 7,235 | 5,706 | 21.1% |
| Assembled global prompt | 16,626 | 15,090 | 9.2% |

The assembled prompt includes Pi's built-in instructions, global rules, and 18 discovered skill descriptions;
it excludes extension-added instructions and tool schemas. The evaluation also includes this repository's rules.
Both Astra and Terra passed all 14 checks before and after: read-only scope, clarification, exact contracts, ownership,
validation claims, generation, delegation, skill selection, Korean negative answers, and JSON values.
This is a single batched decision smoke test per model/revision, not an end-to-end tool-use, speed, or coding-quality benchmark.
Other enabled models were not live-tested. Re-run after policy or SDK changes; installed resources affect prompt size.

## Godot MCP + isolated computer-use (game desktop)

Launches a dedicated Xvfb display, session DBus and AT-SPI accessibility bus,
openbox, the Godot MCP server, and Pi's computer-use tools
(`@injaneity/pi-computer-use`). Requires system `xvfb-run openbox xdotool
xdpyinfo` and `at-spi-bus-launcher`, `at-spi2-registryd`; Godot 4.7.2 is
pinned under `agent/bin/godot-4.7.2` (ignored) and chromium under Playwright's
cache.

### Launch

```sh
~/.config/pi/bin/pi-game           # Pi with computer-use + Godot MCP inside the isolated desktop
```

`bin/godot-mcp` refuses to start outside the isolated desktop
(`PI_GAME_DESKTOP=1` with a real `DISPLAY` and session DBus). This marker guard
is advisory only, not a security sandbox.

### Validation

```sh
# Integration: loads real Pi SDK extensions, no LLM tokens; verifies Godot MCP
# handshake/version, project run, native window discovery + screenshot,
# coordinate click + R key reaching Godot, managed-browser input and WebGL2.
timeout 170 ~/.config/pi/bin/game-desktop node ~/.config/pi/tests/game-tools.mjs

# Launcher boundaries: outside-display rejection, exit-code propagation,
# inherited display/bus scrub, runtime-dir cleanup.
node ~/.config/pi/tests/launcher.mjs
```

### Known residuals

- Xvfb is GPU-less: Godot uses llvmpipe/software GL (audio falls back to the
  dummy driver; VSync warning is expected). Managed chromium is launched via
  `bin/pi-chrome` with `--enable-unsafe-swiftshader` for WebGL2.
- `agent/models-store.json` is generated/user-owned and left untracked.
- Godot MCP `npm audit` reports a DNS-rebinding advisory on its pinned SDK;
  the server is stdio-only with no HTTP listener, so it is not exploitable
  through this setup.
