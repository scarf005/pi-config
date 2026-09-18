import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const agentDir = join(root, "agent");
export const sdkDir = join(execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim(), "@earendil-works/pi-coding-agent");

// Import only after the caller sets extension-specific environment variables.
export const loadSdk = () => import(pathToFileURL(join(sdkDir, "dist/index.js")));

export const textContent = (result, separator = "\n") => result.content
  .filter((block) => block.type === "text").map((block) => block.text).join(separator);

// Negative-path tests need raw error results; integration tests may reject them.
export const createToolCaller = ({ session, timeoutMs, assertSuccess = false }) => async (name, args) => {
  const tool = session.agent.state.tools.find((entry) => entry.name === name);
  assert.ok(tool, `Registered tool: ${name}`);
  const result = await tool.execute(randomUUID(), args, AbortSignal.timeout(timeoutMs));
  if (assertSuccess) assert.ok(!result.isError, JSON.stringify(result));
  return result;
};
