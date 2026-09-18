import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { access, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Launcher boundary tests. Run from the host shell: `node tests/launcher.mjs`
// (no isolated desktop required). Exercises rejection, exit-code propagation,
// environment scrub, process-group teardown, and runtime-dir cleanup.

const config = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bin = (name) => join(config, "bin", name);
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const run = (file, args, options = {}) => {
  const result = spawnSync(file, args, { encoding: "utf8", timeout: 60000, ...options });
  assert.equal(result.error, undefined, `${file} spawn failed: ${result.error}`);
  return result;
};

const hostEnv = {
  ...process.env,
  DISPLAY: "sentinel-display",
  WAYLAND_DISPLAY: "sentinel-wayland",
  DBUS_SESSION_BUS_ADDRESS: "sentinel-session-bus",
  AT_SPI_BUS_ADDRESS: "sentinel-atspi-bus",
  SESSION_MANAGER: "sentinel-session-manager",
};
delete hostEnv.PI_GAME_DESKTOP;

const waitForGone = async (path, timeout = 8000) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      await access(path);
      await delay(100);
    } catch {
      return true;
    }
  }
  return false;
};

const processExists = (pid) => {
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch (error) {
    if (error.code === "ESRCH") return false;
    throw error;
  }
};

const processGroupPids = (pgid) => {
  const result = run("ps", ["-eo", "pid=,pgid="]);
  return result.stdout.trim().split("\n").filter(Boolean).flatMap((line) => {
    const [pid, group] = line.trim().split(/\s+/).map(Number);
    return group === Number(pgid) ? [pid] : [];
  });
};

const assignments = (output) => Object.fromEntries(output.trim().split("\n").map((line) => {
  const separator = line.indexOf("=");
  return [line.slice(0, separator), line.slice(separator + 1)];
}));

const launchAndSignal = (signal) => new Promise((resolve, reject) => {
  const child = spawn(bin("game-desktop"), [
    "sh", "-c", 'child=$$; pgid=$(ps -o pgid= -p "$$" | tr -d " "); printf "RUNTIME=%s\nCHILD=%s\nPGID=%s\n" "$XDG_RUNTIME_DIR" "$child" "$pgid"; sleep 30',
  ], { env: hostEnv, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  let signaled = false;
  const timer = setTimeout(() => {
    child.kill("SIGKILL");
    reject(new Error(`${signal} launcher test timed out\n${stderr}`));
  }, 30000);
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
    if (!signaled && stdout.includes("PGID=")) {
      signaled = true;
      setTimeout(() => child.kill(signal), 50);
    }
  });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.on("error", (error) => {
    clearTimeout(timer);
    reject(error);
  });
  child.on("close", (status, terminatingSignal) => {
    clearTimeout(timer);
    if (!signaled) {
      reject(new Error(`${signal} launcher exited before readiness: ${status}/${terminatingSignal}\n${stderr}`));
      return;
    }
    resolve({ status, stdout, stderr });
  });
});

// 1. Every part of the advisory isolated-desktop guard is required.
for (const overrides of [{}, { PI_GAME_DESKTOP: "1", DISPLAY: "" }, { PI_GAME_DESKTOP: "1", DBUS_SESSION_BUS_ADDRESS: "" }]) {
  const rejected = run(bin("godot-mcp"), [], { env: { ...hostEnv, ...overrides } });
  assert.equal(rejected.status, 1, "godot-mcp must exit 1 outside the isolated desktop");
  assert.match(rejected.stderr, /isolated desktop/);
}
console.log("PASS: bin/godot-mcp rejects missing desktop marker, display or session bus");

// 2. Usage and command failures preserve their distinct exit codes.
const usage = run(bin("game-desktop"), [], { env: hostEnv });
assert.equal(usage.status, 2);
assert.match(usage.stderr, /Usage: game-desktop/);
const propagated = run(bin("game-desktop"), ["sh", "-c", "exit 7"], { env: hostEnv });
assert.equal(propagated.status, 7, `game-desktop must propagate inner exit code 7, got ${propagated.status}`);
const missing = run(bin("game-desktop"), ["sh", "-c", 'printf "RUNTIME=%s\\n" "$XDG_RUNTIME_DIR"; exec "$XDG_RUNTIME_DIR/missing-command"'], { env: hostEnv });
assert.equal(missing.status, 127, missing.stderr);
assert.equal(await waitForGone(assignments(missing.stdout).RUNTIME), true, "missing command left runtime resources");
console.log("PASS: game-desktop preserves usage and command failure statuses and cleans up");

// Arguments, stdin and caller cwd survive every shell boundary unchanged.
const commandArgs = ["", "two words", "quote'\"", "$HOME; $(false) *", "line\nbreak", "--flag", "한글"];
const input = "piped input\nsecond line\n";
const forwarded = run(bin("game-desktop"), [process.execPath, "-e", `
  const fs = require("node:fs");
  console.log("FORWARDED=" + JSON.stringify({ args: process.argv.slice(1), cwd: process.cwd(), input: fs.readFileSync(0, "utf8"), runtime: process.env.XDG_RUNTIME_DIR }));
`, "--", ...commandArgs], { cwd: "/tmp", env: hostEnv, input });
assert.equal(forwarded.status, 0, forwarded.stderr);
const forwardedFields = JSON.parse(assignments(forwarded.stdout).FORWARDED);
assert.deepEqual(forwardedFields.args, commandArgs);
assert.equal(forwardedFields.cwd, "/tmp");
assert.equal(forwardedFields.input, input);
assert.equal(await waitForGone(forwardedFields.runtime), true);
console.log("PASS: game-desktop preserves exact arguments, piped stdin and caller cwd");

// 3. Explicit inherited sentinels are replaced, accessibility stays private,
// and both the runtime directory and X authority file are removed.
const scrub = run(bin("game-desktop"), ["sh", "-c", 'printf "DISPLAY=%s\n" "$DISPLAY"; printf "AUTH=%s\n" "$XAUTHORITY"; printf "RUNTIME=%s\n" "$XDG_RUNTIME_DIR"; printf "WAYLAND=%s\n" "${WAYLAND_DISPLAY-unset}"; printf "SESSION=%s\n" "$XDG_SESSION_TYPE"; printf "PI=%s\n" "$PI_GAME_DESKTOP"; printf "DBUS=%s\n" "$DBUS_SESSION_BUS_ADDRESS"; printf "ATSPI=%s\n" "$AT_SPI_BUS_ADDRESS"'], { env: hostEnv });
assert.equal(scrub.status, 0, scrub.stderr);
const env = assignments(scrub.stdout);
assert.match(env.DISPLAY, /^:\d+$/);
assert.notEqual(env.DISPLAY, hostEnv.DISPLAY);
assert.equal(env.AUTH, `${env.RUNTIME}/Xauthority`);
assert.match(env.RUNTIME, /^\/tmp\/pi-game-desktop\./);
assert.equal(env.WAYLAND, "unset");
assert.equal(env.SESSION, "x11");
assert.equal(env.PI, "1");
assert.notEqual(env.DBUS, hostEnv.DBUS_SESSION_BUS_ADDRESS);
assert.ok(env.ATSPI.includes(env.RUNTIME), `AT-SPI address is not private: ${env.ATSPI}`);
assert.equal(await waitForGone(env.RUNTIME), true, `runtime dir still present after cleanup: ${env.RUNTIME}`);
assert.equal(await waitForGone(env.AUTH), true, `X authority file still present after cleanup: ${env.AUTH}`);
console.log("PASS: bin/game-desktop replaces display/bus sentinels and cleans auth/runtime resources");

// 4. Concurrent desktop sessions receive distinct automatically selected X displays.
const barrier = `/tmp/pi-game-desktop-launcher-barrier-${process.pid}`;
const launchUntilReleased = () => {
  let resolveReady;
  let rejectReady;
  let readyReported = false;
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  let resolveFinished;
  let rejectFinished;
  const finished = new Promise((resolve, reject) => { resolveFinished = resolve; rejectFinished = reject; });
  const child = spawn(bin("game-desktop"), ["sh", "-c", `printf "DISPLAY=%s\\n" "$DISPLAY"; while [ ! -e "${barrier}" ]; do sleep 0.05; done`], {
    env: hostEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
    if (!readyReported && stdout.includes("DISPLAY=")) {
      readyReported = true;
      resolveReady(assignments(stdout).DISPLAY);
    }
  });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.on("error", (error) => {
    rejectReady(error);
    rejectFinished(error);
  });
  child.on("close", (status) => {
    if (!readyReported) rejectReady(new Error(`concurrent launcher exited ${status}: ${stderr}`));
    if (status === 0) resolveFinished();
    else rejectFinished(new Error(`concurrent launcher exited ${status}: ${stderr}`));
  });
  return { ready, finished };
};
const concurrentLaunchers = [launchUntilReleased(), launchUntilReleased()];
try {
  const concurrentDisplays = await Promise.all(concurrentLaunchers.map(({ ready }) => ready));
  assert.ok(concurrentDisplays.every((display) => /^:\d+$/.test(display)));
  assert.notEqual(concurrentDisplays[0], concurrentDisplays[1], `concurrent launchers reused ${concurrentDisplays[0]}`);
  await writeFile(barrier, "release");
  await Promise.all(concurrentLaunchers.map(({ finished }) => finished));
} finally {
  await writeFile(barrier, "release");
  await Promise.allSettled(concurrentLaunchers.map(({ finished }) => finished));
  await rm(barrier, { force: true });
}
console.log("PASS: concurrent game-desktop launchers use distinct X displays");

// 5. A background setsid launcher preserves a PTY stdin for interactive Pi.
const pty = run("python3", ["-c", `
import errno
import os
import pty
import select
import subprocess
import sys
import time

master, slave = pty.openpty()
child = subprocess.Popen(
    [sys.argv[1], "sh", "-c", 'if [ -t 0 ]; then printf "TTY=1\\n"; else printf "TTY=0\\n"; fi; IFS= read -r line; printf "ECHO=%s\\n" "$line"'],
    stdin=slave, stdout=slave, stderr=slave, close_fds=True,
)
os.close(slave)
os.write(master, b"pty-input\\n")
output = b""
deadline = time.monotonic() + 60
while time.monotonic() < deadline:
    ready, _, _ = select.select([master], [], [], 0.2)
    if ready:
        try:
            output += os.read(master, 4096)
        except OSError as error:
            if error.errno == errno.EIO:
                break
            raise
    if child.poll() is not None:
        break
status = child.wait(timeout=10)
sys.stdout.buffer.write(output)
if status != 0 or b"TTY=1" not in output or b"ECHO=pty-input" not in output:
    raise SystemExit(1)
`, bin("game-desktop")], { env: hostEnv, timeout: 90000 });
assert.equal(pty.status, 0, `PTY launcher check failed: ${pty.stdout}${pty.stderr}`);
console.log("PASS: game-desktop preserves PTY stdin and interactive input");

// 6. Signals terminate the dedicated process group, reap the supervisor, and
// do not leave the command or X/DBus descendants running.
for (const [signal, status] of [["SIGTERM", 143], ["SIGINT", 130]]) {
  const result = await launchAndSignal(signal);
  const fields = assignments(result.stdout);
  assert.equal(result.status, status, `${signal} should produce ${status}, got ${result.status}: ${result.stderr}`);
  assert.equal(await waitForGone(fields.RUNTIME), true, `${signal} left runtime dir: ${fields.RUNTIME}`);
  const deadline = Date.now() + 8000;
  let survivors = processGroupPids(fields.PGID);
  while (survivors.length && Date.now() < deadline) {
    await delay(100);
    survivors = processGroupPids(fields.PGID);
  }
  assert.deepEqual(survivors, [], `${signal} left process-group members: ${survivors.join(", ")}`);
  assert.equal(processExists(fields.CHILD), false, `${signal} left command process ${fields.CHILD}`);
  console.log(`PASS: ${signal} tears down the isolated process group and runtime`);
}
