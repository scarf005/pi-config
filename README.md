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
Other enabled models were not live-tested. These are historical results, not measurements of the current prompt.
Re-run after policy or SDK changes; installed resources affect prompt size.

### Workflow regression checks

```sh
PI_OFFLINE=1 node tests/workflow.mjs                 # Loaded extension guidance and filesystem isolation; no model calls
PI_OFFLINE=1 node tests/workflow.mjs --live          # Actual tool loops with the configured default
PI_OFFLINE=1 node tests/workflow.mjs --live --matrix # Astra medium/high and Terra medium on the same cases
# Add --case=ci-scope (repeatable) for a focused rerun.
```

[Cases](tests/workflow-cases.mjs) check ordinary choices versus missing user decisions, answering then continuing,
explicit pauses, new-session handoff from `progress.md`, partial versus complete acceptance, CI scope, and reachable
versus artificially corrupted-state regressions. The agent maintains the worktree-local state document for long tasks;
users do not need to fill a template. Read-only reviewers require the actual diff, original request and inspectable
validation evidence, and must name unverified scope instead of treating missing evidence as approval.

The runner loads current extension guidance and reports the effective global prompt size plus serialized active tool
schema size separately. Model loops use production read/ls/edit/write tools restricted to disposable files, the real
ask-user schema with a simulated UI answer, and fixed repository checks. Reports and text/tool traces remain under
`/tmp/pi/workflow-eval-*`; source hashes identify the evaluated revision. These are bounded behavior checks, not a coding
quality benchmark, automatic-compaction test, interactive UI test, or real game/CI/reviewer execution. Model defaults
remain unchanged; a small fixture comparison cannot establish a generally better model.

[Recorded tool-use results](evals/workflow-results.json): Astra medium, Astra high and Terra medium each passed 10 outcome
checks in one trial per case. Trace inspection also found 0, 1 and 6 unrelated validator attempts respectively; outcome
passes do not mean every action was useful. Keep Astra medium rather than increasing reasoning globally. The measured
startup global prompt, including active extension guidance, was **20,750 UTF-8 bytes**; serialized active tool definitions
were **28,605 bytes** separately. Provider framing and per-turn hook changes are not included.

`ask_user` loads patched **0.14.0 source** from
`~/repo/etc/one-time-contribution/pi-ask-user-worktrees/fix-decision-gates`, based on upstream
`2de7e145227f7a527e995e323a50e7ee9bf88b0e`, with local fix `8e00b35`. Keep this source checkout when using these settings.
Like the other local packages, it must be provisioned on another machine; no installed `node_modules` file is patched. Its bundled skill
remains disabled. Reload Pi or start a new session to load the corrected tool guidance.

## Subagents

[Settings](agent/settings.json) pin [pi-subagents](https://github.com/nicobailon/pi-subagents) 0.74.0.
The previous `@parke.dev/pi-subagent` package is removed. Restart Pi or use `/reload`; existing sessions keep their old loaded tools until then.

[Agent definitions](agent/agents) preserve the five roles and their model/thinking selections:
`planner` plans, `investigator` gathers evidence, `oracle` checks decisions, `reviewer` reviews supplied diffs, and `worker` implements and validates.
Read-only roles use explicit read/grep/find/ls allowlists. `investigator` additionally loads pi-web-access and its four web tools inside the child, including foreground runs. Workers retain bash/edit/write and repository skill discovery.
Every role forbids descendant launches and defaults to a 30-minute timeout. Unsupported automatic model fallbacks are removed; failed launches must be handled explicitly, not silently switched to another model.

[Runtime config](agent/extensions/subagent/config.json) defaults to foreground result delivery and enables simple `tasks`/`chain` inputs instead of workflow scripts. Automatic missions, schedules, and the supervisor bridge are off; bundled agents are disabled so the existing role boundaries remain authoritative.

- Inspect roles with `subagent { action: "list", capabilities: true }` and `action: "get", agent: "reviewer"`.
- Delegate with `subagent { agent: "reviewer", task: "..." }`; the actual result returns inline by default.
- Parallel work uses `tasks: [{ agent, task }, ...], async: false`.
- For explicit background work, use `async: true`; `bg_wait { id, timeoutMs }` returns completion metadata and readable output-archive references. Read those references rather than treating the completion preview as the report.
- Use `context: "fork"` only when inherited conversation is needed. Resume with `action: "resume", id, message`, not the previous package's `resume` field.

Old transcripts and runtime directories are preserved; old package run IDs are not migrated. Foreground delivery avoids delayed completion turns, but no package guarantees that a model will produce a useful report. After steering, request a consolidated report, not an acknowledgment.

```sh
PI_OFFLINE=1 node tests/subagent.mjs        # Extension loading and resolved role/tool contracts; no model calls
PI_OFFLINE=1 node tests/subagent.mjs --live # Real foreground/parallel reads and background archive replay
```

The live smoke test uses disposable data and existing child-model authentication. Completion-triggered parent replies are stubbed to count wakes without spending parent-model tokens; children run real models. It checks actual read calls, separate parallel results, readable background output, replay, and no duplicate completion wake. Worktree operations, interactive rendering, resume, and provider-failure recovery are not covered.

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
