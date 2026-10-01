import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { homedir } from "node:os";
import { join } from "node:path";
import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import SmeeClient from "smee-client";
import {
  parseRun,
  RunMonitor,
  type Target,
  validateTarget,
  type Watch,
} from "./core.ts";

const exec = promisify(execFile);
const entryType = "ci-watch-state";
const configPath = join(
  process.env.XDG_STATE_HOME ?? join(homedir(), ".local/state"),
  "pi-ci-watch/config.json",
);

export default function (pi: ExtensionAPI) {
  if ((process.env.PI_SUBAGENT_DEPTH ?? "0") !== "0") return;
  let monitor: RunMonitor | undefined;
  let client: SmeeClient | undefined;
  let connecting: Promise<void> | undefined;
  let context: ExtensionContext | undefined;
  let config: { source: string; repository: string } | undefined;
  let generation = 0;

  const notify = (content: string, details: unknown) =>
    pi.sendMessage(
      { customType: "ci-watch", content, display: true, details },
      { triggerTurn: true, deliverAs: "followUp" },
    );
  const disconnect = async () => {
    const previous = client;
    client = undefined;
    await previous?.stop();
  };
  const shutdown = async () => {
    generation++;
    monitor?.close();
    monitor = undefined;
    context = undefined;
    await disconnect();
    connecting = undefined;
  };

  const connect = async () => {
    if (connecting) return connecting;
    if (!monitor?.list().some((watch) => watch.active) || client) return;
    const owner = monitor;
    const token = generation;
    const next = new SmeeClient({
      source: config!.source,
      target: "http://127.0.0.1/unused",
      forward: false,
      maxConnectionTimeout: 15_000,
      logger: { info: () => {}, error: () => {} },
    });
    client = next;
    next.onmessage = (event) => {
      if (token === generation) owner.receive(event.data);
    };
    next.onopen = () => {
      if (token !== generation) return;
      context?.ui.setStatus("ci-watch", "CI: listening");
      owner.reconcile();
    };
    next.onerror = () => {
      if (token === generation) {
        context?.ui.setStatus("ci-watch", "CI: reconnecting");
      }
    };
    const promise = next.start().then(() => {}).catch(async () => {
      if (client === next) client = undefined;
      await next.stop();
      throw new Error(
        "CI relay connection failed; no background monitoring started",
      );
    }).finally(() => {
      if (connecting === promise) connecting = undefined;
    });
    connecting = promise;
    await promise;
  };

  pi.on("session_start", async (_event, ctx) => {
    await shutdown();
    context = ctx;
    try {
      const value = JSON.parse(await readFile(configPath, "utf8"));
      validateTarget({ repository: value.repository, runId: 1 });
      const url = new URL(value.source);
      if (url.protocol !== "https:" || url.username || url.password) {
        throw new Error("Invalid relay URL");
      }
      config = { repository: value.repository, source: url.href };
      const restored = ctx.sessionManager.getBranch().findLast((entry) =>
        entry.type === "custom" && entry.customType === entryType
      );
      const watches = restored?.type === "custom"
        ? restored.data as Watch[]
        : [];
      if (
        !Array.isArray(watches) ||
        watches.some((watch) => watch.repository !== config!.repository)
      ) {
        throw new Error("Invalid saved CI watch state");
      }
      monitor = new RunMonitor({
        watches,
        readRun: async (target, signal) => {
          const { stdout } = await exec("gh", [
            "api",
            `repos/${target.repository}/actions/runs/${target.runId}`,
          ], {
            signal,
            timeout: 30_000,
            maxBuffer: 1_000_000,
          });
          return parseRun(JSON.parse(stdout), target);
        },
        saved: (state) => pi.appendEntry(entryType, state),
        changed: (watch) => {
          notify(
            `CI ${watch.repository} run ${watch.runId}: ${watch.run.status}${
              watch.run.conclusion ? ` / ${watch.run.conclusion}` : ""
            }\n${watch.run.html_url}\nRead failing job logs only if needed. This event does not authorize fixes, reruns, pushes, or other mutations.`,
            watch,
          );
          if (!monitor?.list().some((item) => item.active)) {
            ctx.ui.setStatus("ci-watch", undefined);
            void disconnect();
          }
        },
        failed: (target) => {
          notify(
            `CI monitoring stopped for ${target.repository} run ${target.runId}: GitHub state could not be read. The workflow outcome is unknown. Use ci_watch to restart after checking gh authentication/rate limits.`,
            target,
          );
          if (!monitor?.list().some((item) => item.active)) {
            ctx.ui.setStatus("ci-watch", undefined);
            void disconnect();
          }
        },
      });
      await connect();
    } catch (error) {
      const restoring = monitor?.list().some((watch) => watch.active);
      await shutdown();
      config = undefined;
      if (restoring) {
        notify(
          "CI monitoring could not resume. Workflow outcomes are unknown; check the relay connection and reload before restarting watches.",
          {},
        );
      }
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        ctx.ui.notify("CI watch setup or restoration failed", "error");
      }
    }
  });
  pi.on("session_shutdown", shutdown);

  const operate = async (action: string, runId?: number) => {
    if (!monitor || !config) {
      throw new Error(`CI watch is not configured; expected ${configPath}`);
    }
    if (action === "status") return monitor.list();
    if (!runId) throw new Error("A run ID is required");
    const target: Target = { repository: config.repository, runId };
    validateTarget(target);
    if (action === "stop") {
      monitor.stop(target);
      if (!monitor.list().some((watch) => watch.active)) {
        context?.ui.setStatus("ci-watch", undefined);
        await disconnect();
      }
      return monitor.list();
    }
    if (action !== "start") throw new Error("Expected start, stop, or status");
    const watch = await monitor.add(target);
    try {
      await connect();
    } catch (error) {
      monitor.stop(target);
      throw error;
    }
    return watch;
  };

  pi.registerTool({
    name: "ci_watch",
    label: "CI watch",
    description:
      "Start background event-driven GitHub Actions monitoring, inspect cached state, or stop it. Returns immediately after subscribing; state changes wake this session. No periodic GitHub polling. Scoped to the configured personal repository. Failed logs are not fetched automatically.",
    parameters: Type.Object({
      action: Type.Union([
        Type.Literal("start"),
        Type.Literal("status"),
        Type.Literal("stop"),
      ]),
      runId: Type.Optional(Type.Integer({ minimum: 1 })),
    }),
    execute: async (_id, params) => {
      const details = await operate(params.action, params.runId);
      return {
        content: [{ type: "text", text: JSON.stringify(details) }],
        details,
      };
    },
  });
  pi.registerCommand("ci-watch", {
    description:
      "Watch a CI run: /ci-watch <run-id>, /ci-watch status, /ci-watch stop <run-id>",
    handler: async (args, ctx) => {
      const [action, id] = args.trim().split(/\s+/);
      try {
        const result = await operate(
          action === "status" || action === "stop" ? action : "start",
          Number(id ?? action),
        );
        ctx.ui.notify(JSON.stringify(result), "info");
      } catch (error) {
        ctx.ui.notify((error as Error).message, "error");
      }
    },
  });
}
