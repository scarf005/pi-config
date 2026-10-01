export interface Target {
  repository: string;
  runId: number;
}

export interface Run {
  id: number;
  status: string;
  conclusion: string | null;
  run_attempt: number;
  html_url: string;
}

export interface Watch extends Target {
  run: Run;
  active: boolean;
}

export function validateTarget(target: Target): void {
  if (
    !/^[\w.-]+\/[\w.-]+$/.test(target.repository) ||
    !Number.isSafeInteger(target.runId) || target.runId < 1
  ) {
    throw new Error("Expected owner/repository and a positive run ID");
  }
}

export function parseRun(value: unknown, target: Target): Run {
  const run = value as Partial<Run> | null;
  if (
    !run || run.id !== target.runId || !Number.isSafeInteger(run.run_attempt) ||
    run.run_attempt! < 1 ||
    typeof run.status !== "string" || !/^[a-z_]+$/.test(run.status) ||
    !(run.conclusion === null ||
      typeof run.conclusion === "string" && /^[a-z_]+$/.test(run.conclusion)) ||
    run.html_url !==
      `https://github.com/${target.repository}/actions/runs/${target.runId}`
  ) {
    throw new Error("GitHub returned an invalid workflow run");
  }
  return {
    id: run.id,
    status: run.status,
    conclusion: run.conclusion,
    run_attempt: run.run_attempt!,
    html_url: run.html_url,
  };
}

interface Options {
  readRun: (target: Target, signal: AbortSignal) => Promise<Run>;
  changed: (watch: Watch) => void;
  failed: (target: Target) => void;
  saved: (watches: Watch[]) => void;
  watches?: Watch[];
  minIntervalMs?: number;
}

interface Pending {
  timer?: ReturnType<typeof setTimeout>;
  running: boolean;
  dirty: boolean;
  lastRead: number;
}

export class RunMonitor {
  private watches = new Map<string, Watch>();
  private pending = new Map<string, Pending>();
  private controller = new AbortController();
  private options: Options;

  constructor(options: Options) {
    this.options = options;
    for (const watch of options.watches ?? []) {
      validateTarget(watch);
      parseRun(watch.run, watch);
      this.watches.set(this.key(watch), { ...watch });
    }
  }

  private key(target: Target): string {
    return `${target.repository.toLowerCase()}:${target.runId}`;
  }

  list(): Watch[] {
    return [...this.watches.values()].map((watch) => ({
      ...watch,
      run: { ...watch.run },
    }));
  }

  async add(target: Target): Promise<Watch> {
    validateTarget(target);
    const run = parseRun(
      await this.options.readRun(target, this.controller.signal),
      target,
    );
    if (this.controller.signal.aborted) throw new Error("Monitor stopped");
    const watch = { ...target, run, active: run.status !== "completed" };
    this.stop(target);
    this.watches.set(this.key(target), watch);
    this.pending.set(this.key(target), {
      running: false,
      dirty: false,
      lastRead: Date.now(),
    });
    this.options.saved(this.list());
    return watch;
  }

  stop(target: Target): void {
    const key = this.key(target);
    clearTimeout(this.pending.get(key)?.timer);
    this.pending.delete(key);
    this.watches.delete(key);
    this.options.saved(this.list());
  }

  receive(message: string): void {
    // Relay payloads are untrusted wake hints, never state or model instructions.
    if (message.length > 1_000_000) return;
    try {
      const event = JSON.parse(message);
      if (event["x-github-event"] !== "workflow_run") return;
      const target = {
        repository: event.body?.repository?.full_name,
        runId: event.body?.workflow_run?.id,
      };
      validateTarget(target);
      this.schedule(this.key(target));
    } catch { /* Ignore malformed and unrelated relay events. */ }
  }

  reconcile(): void {
    for (const key of this.watches.keys()) this.schedule(key);
  }

  private schedule(key: string): void {
    if (this.controller.signal.aborted || !this.watches.get(key)?.active) {
      return;
    }
    const pending = this.pending.get(key) ??
      { running: false, dirty: false, lastRead: -Infinity };
    this.pending.set(key, pending);
    if (pending.running) {
      pending.dirty = true;
      return;
    }
    if (pending.timer) return;
    const delay = Math.max(
      0,
      pending.lastRead + (this.options.minIntervalMs ?? 30_000) - Date.now(),
    );
    pending.timer = setTimeout(() => {
      pending.timer = undefined;
      void this.refresh(key, pending);
    }, delay);
    pending.timer.unref?.();
  }

  private async refresh(key: string, pending: Pending): Promise<void> {
    const watch = this.watches.get(key);
    if (!watch?.active || this.controller.signal.aborted) return;
    pending.running = true;
    pending.lastRead = Date.now();
    try {
      const run = parseRun(
        await this.options.readRun(watch, this.controller.signal),
        watch,
      );
      if (this.controller.signal.aborted || this.watches.get(key) !== watch) {
        return;
      }
      const previous = watch.run;
      watch.run = run;
      watch.active = run.status !== "completed";
      this.options.saved(this.list());
      if (
        previous.status !== run.status ||
        previous.conclusion !== run.conclusion ||
        previous.run_attempt !== run.run_attempt
      ) {
        this.options.changed({ ...watch, run: { ...run } });
      }
    } catch {
      if (!this.controller.signal.aborted && this.watches.get(key) === watch) {
        watch.active = false;
        this.options.saved(this.list());
        this.options.failed(watch);
      }
    } finally {
      pending.running = false;
      if (pending.dirty) {
        pending.dirty = false;
        this.schedule(key);
      }
    }
  }

  close(): void {
    this.controller.abort();
    for (const pending of this.pending.values()) clearTimeout(pending.timer);
    this.pending.clear();
  }
}
