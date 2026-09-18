import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";
import { createToolCaller, textContent } from "./support.mjs";
import { policyCases, reviewLoopCases } from "./policy-cases.mjs";

const sessionWith = (tools) => ({ agent: { state: { tools } } });

test("text extraction preserves block order and supports JSON fragments", () => {
  const result = { content: [
    { type: "text", text: "[1," },
    { type: "image", data: "not text" },
    { type: "text", text: "2]" },
  ] };
  assert.equal(textContent(result), "[1,\n2]");
  assert.deepEqual(JSON.parse(textContent(result, "")), [1, 2]);
  assert.equal(textContent({ content: [] }), "");
  assert.equal(textContent({ content: [{ type: "image" }] }), "");
});

test("tool calls forward arguments, unique IDs, deadlines and the exact result", async () => {
  const calls = [];
  const result = { content: [{ type: "text", text: "done" }], details: { id: 7 } };
  const session = sessionWith([{ name: "example", execute: async (...args) => { calls.push(args); return result; } }]);
  const call = createToolCaller({ session, timeoutMs: 1000, assertSuccess: true });
  const args = { nested: { value: "" }, items: [1, 2] };
  assert.equal(await call("example", args), result);
  assert.equal(await call("example", args), result);
  assert.notEqual(calls[0][0], calls[1][0]);
  for (const [id, forwarded, signal] of calls) {
    assert.match(id, /^[0-9a-f-]{36}$/);
    assert.equal(forwarded, args);
    assert.ok(signal instanceof AbortSignal);
    assert.equal(signal.aborted, false);
  }
});

test("tools are resolved at call time, including after extension binding", async () => {
  const session = sessionWith([]);
  const call = createToolCaller({ session, timeoutMs: 1000 });
  await assert.rejects(call("late", {}), /Registered tool: late/);
  const result = { content: [] };
  session.agent.state.tools = [{ name: "late", execute: async () => result }];
  assert.equal(await call("late", {}), result);
});

test("error results are preserved for negative tests and rejected in success-only mode", async () => {
  const result = { isError: true, content: [{ type: "text", text: "expected failure" }] };
  const session = sessionWith([{ name: "failure", execute: async () => result }]);
  const raw = createToolCaller({ session, timeoutMs: 1000 });
  const checked = createToolCaller({ session, timeoutMs: 1000, assertSuccess: true });
  assert.equal(await raw("failure", {}), result);
  await assert.rejects(checked("failure", {}), /expected failure/);
});

test("tool exceptions propagate without wrapping", async () => {
  const error = new Error("tool failure");
  const session = sessionWith([{ name: "throws", execute: async () => { throw error; } }]);
  const call = createToolCaller({ session, timeoutMs: 1000 });
  await assert.rejects(call("throws", {}), (actual) => actual === error);
});

test("each tool receives a signal that aborts at the configured deadline", async () => {
  const session = sessionWith([{ name: "wait", execute: (_id, _args, signal) => delay(1000, null, { signal }) }]);
  const call = createToolCaller({ session, timeoutMs: 5 });
  await assert.rejects(call("wait", {}), { name: "AbortError" });
});

test("policy cases have unique IDs and valid expected option indexes in both modes", () => {
  for (const cases of [policyCases, [...policyCases, ...reviewLoopCases]]) {
    assert.equal(new Set(cases.map(({ id }) => id)).size, cases.length);
    for (const { id, task, options, expected } of cases) {
      assert.ok(id && task && options.length >= 2, id);
      assert.ok(options.every((option) => typeof option === "string" && option.length > 0), id);
      assert.ok(Number.isInteger(expected) && expected >= 0 && expected < options.length, id);
    }
  }
});
