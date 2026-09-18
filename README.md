# pi config

Personal pi coding agent configuration.

SPDX-License-Identifier: AGPL-3.0-only

## Maintenance

- `agent/` contains settings, agent personas, and task-triggered skills; installed packages and runtime state are not source.
- `bin/` contains user-facing launchers; `libexec/` contains their internal lifecycle scripts.
- `tests/support.mjs` shares repository paths, lazy SDK loading, and tool invocation across SDK checks. Keep resource loading
  and session setup in each test so their different discovery and permission boundaries remain explicit.
- `tests/policy-cases.mjs` contains decision scenarios; `tests/policy.mjs` assembles prompts and evaluates responses.

```sh
node --test tests/support.test.mjs # Shared helpers and scenario integrity; no model calls
```

Launcher, SDK, and optional live validation commands are listed with their features below. SDK checks use the globally
installed Pi SDK (`npm root -g`) and the packages installed under `agent/npm`.

## GPT profile

[Settings](agent/settings.json) start new sessions with `openai-codex/gpt-6-astra` and medium thinking.
Other enabled models and subagent model/fallback assignments are preserved. Use `/model` to switch an existing
session; restart Pi to pick up the complete configuration. Transport, caching, retries, and compaction keep Pi's defaults.

[Global rules](agent/AGENTS.md) retain the task contract, ownership, validation, and language preferences without
repeated gates. The investigation skill excludes ordinary questions and routine implementation inspection.
In this repository, implementation starts by checkpointing existing tracked changes separately without asking again.
This standing authorization excludes untracked/generated files and does not apply to other repositories or override an
explicit no-commit request. A nonexistent local package entry was removed; installed extensions were not removed.

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

## Subagents

[Settings](agent/settings.json) load `@parke.dev/pi-subagent@0.8.0` instead of `pi-subagents`.
Restart Pi or use `/reload` after changing packages; already-running sessions retain their loaded tools until then.

[Agent definitions](agent/agents) preserve the configured models, thinking levels, and Terra fallback:
`planner` uses the explore profile, `oracle` and `reviewer` use review, and `worker` uses general.
Explore/review agents have only read/grep/find/ls. The parent supplies git diffs and runs validation commands.
Workers retain bash/edit/write. All four personas disable further delegation and have a 30-minute timeout.

Use `subagent { action: "status" }` for the catalog, `tasks` for parallel work, and `async: true` with
`subagent_wait { id }` for background work. Sequential stages use separate calls, not the old `chain` parameter.
Pass `context: "fork"` explicitly when a single child needs the parent conversation; use `resume` for a child session.
The old supervisor/intercom bridge is not carried over: children return blockers, and the parent can resume them.
Existing Nico transcripts remain on disk; its run IDs are not migrated to the new inspector.

```sh
PI_OFFLINE=1 node tests/subagent.mjs        # SDK loading, personas, and permission guards; no model calls
PI_OFFLINE=1 node tests/subagent.mjs --live # Real parallel children, background wait, and session resume
```

The live smoke test uses disposable data and existing model authentication. It does not exercise worktree
apply/discard, interactive rendering, or provider-failure retries.

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

### Implementation

- `bin/game-desktop` owns the private runtime directory, environment, display-selection lock, and process-group teardown.
- `libexec/game-desktop/supervisor.sh` starts Xvfb and session DBus inside that process group.
- `libexec/game-desktop/session.sh` starts and stops the window manager and accessibility helpers around the command.

The `libexec` scripts are internal entry points invoked by the launcher, not standalone commands.

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
