#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { plugin } from "../src/index.js";

const registrations = {};
const api = new Proxy(
  {
    id: "openclaw-kitchen-sink-fixture",
    registrationMode: "full",
    config: {},
    logger: console,
  },
  {
    get(target, property) {
      if (property in target) {
        return target[property];
      }
      if (property === "on") {
        return (...args) => capture("on", args);
      }
      if (typeof property !== "string" || !property.startsWith("register")) {
        return undefined;
      }
      return (...args) => capture(property, args);
    },
  },
);

plugin.register(api);

const beforeToolCall = findHook("before_tool_call");
const llmInput = findHook("llm_input");
const llmOutput = findHook("llm_output");
const agentEnd = findHook("agent_end");

const probes = {
  beforeToolCall: {
    allow: await beforeToolCall(toolEvent("generate a kitchen image"), { providerId: "kitchen-sink-image" }),
    block: await beforeToolCall(toolEvent("kitchen block image generation"), { providerId: "kitchen-sink-image" }),
    approval: await beforeToolCall(toolEvent("kitchen image generation needs approval"), {
      providerId: "kitchen-sink-image",
    }),
  },
  conversationPrivacy: {
    input: await llmInput(secretEvent("kitchen explain the fixture"), secretContext()),
    output: await llmOutput(secretEvent("kitchen image result"), secretContext()),
    end: await agentEnd(secretEvent("kitchen final answer"), secretContext()),
  },
  channel: await captureChannelProbe(),
  runtimeRegistrations: registrationSummary(),
};

assert.equal(probes.beforeToolCall.allow.decision, "allow");
assert.equal(probes.beforeToolCall.allow.params.args.kitchenSinkScenario, "image.generate");
assert.equal(probes.beforeToolCall.block.block, true);
assert.equal(probes.beforeToolCall.block.terminal, true);
assert.equal(probes.beforeToolCall.approval.decision, "approval");
assert.equal(probes.beforeToolCall.approval.requireApproval.pluginId, "openclaw-kitchen-sink-fixture");

for (const result of Object.values(probes.conversationPrivacy)) {
  assert.equal(result.privacy.boundary, "conversation-observer");
  assert.equal(result.privacy.storesRawPayload, false);
  assert.equal(result.privacy.exposesRawPayload, false);
  assert.ok(result.privacy.redactedFields.length >= 2);
  assert.ok(result.privacy.secretPatternCount >= 1);
}

for (const method of [
  "registerChannel",
  "registerCommand",
  "registerGatewayMethod",
  "registerHttpRoute",
  "registerInteractiveHandler",
  "registerService",
]) {
  assert.ok(probes.runtimeRegistrations[method]?.count > 0, `${method} was not captured`);
}

assert.equal(probes.channel.account.statusState, "ready");
assert.equal(probes.channel.delivery.deliveryStatus, "sent");
assert.equal(probes.channel.route.peer.kind, "direct");

mkdirSync("reports", { recursive: true });
writeFileSync("reports/kitchen-contract-probes.json", `${JSON.stringify(probes, null, 2)}\n`);
writeFileSync("reports/kitchen-contract-probes.md", renderMarkdown(probes));

console.log(
  `Kitchen contract probes OK: ${Object.keys(probes.runtimeRegistrations).length} registration methods, before_tool_call allow/block/approval, conversation privacy, channel envelope`,
);

function capture(method, args) {
  registrations[method] ??= [];
  registrations[method].push(args);
}

function findHook(name) {
  const entry = registrations.on?.find(([hookName]) => hookName === name);
  assert.ok(entry, `hook ${name} registered`);
  return entry[1];
}

function registrationSummary() {
  return Object.fromEntries(
    Object.entries(registrations)
      .filter(([method]) => method !== "on")
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([method, entries]) => [
        method,
        {
          count: entries.length,
          ids: entries.map((args) => idForRegistration(method, args)).filter(Boolean).sort(),
        },
      ]),
  );
}

function idForRegistration(method, args) {
  const [value, second] = args;
  if (method === "registerGatewayMethod" && typeof value === "string") {
    return value;
  }
  if (method === "registerCli" && second?.descriptors?.length > 0) {
    return second.descriptors.map((descriptor) => descriptor.name).join(", ");
  }
  if (value?.id || value?.name) {
    return value.id || value.name;
  }
  if (typeof second === "string") {
    return second;
  }
  const slug = method.slice("register".length).replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  return `kitchen-sink-${slug}`;
}

async function captureChannelProbe() {
  const channel = registrations.registerChannel?.map(([value]) => value).find((value) => value.id === "kitchen-sink-channel");
  assert.ok(channel, "kitchen-sink-channel registered");
  return {
    account: channel.config.resolveAccount({}, "local"),
    delivery: await channel.outbound.sendText({ to: "kitchen demo", text: "kitchen generate image" }),
    route: await channel.messaging.resolveOutboundSessionRoute({
      agentId: "fixture-agent",
      target: "kitchen demo",
      threadId: "thread-1",
    }),
  };
}

function toolEvent(prompt) {
  return {
    toolId: "kitchen_sink_image_job",
    args: { prompt },
  };
}

function secretEvent(prompt) {
  return {
    prompt,
    apiKey: "sk-local-secret-not-stored",
    token: "fixture-token-not-stored",
  };
}

function secretContext() {
  return {
    providerId: "kitchen-sink-llm",
    authorization: "Bearer fixture-secret-not-stored",
  };
}

function renderMarkdown(report) {
  const methods = Object.entries(report.runtimeRegistrations)
    .map(([method, summary]) => `| ${method} | ${summary.count} | ${summary.ids.join(", ")} |`)
    .join("\n");
  return [
    "# Kitchen Sink Contract Probes",
    "",
    "Generated: deterministic",
    "Status: PASS",
    "",
    "## Covered Inspector Gaps",
    "",
    "- before_tool_call allow/block/approval semantics",
    "- llm_input, llm_output, and agent_end privacy-boundary probes",
    "- runtime registrar capture for service, route, gateway, command, interactive handler, and channel surfaces",
    "- channel account, envelope, and outbound route probes",
    "",
    "## Runtime Registrations",
    "",
    "| Method | Count | IDs |",
    "| ------ | ----- | --- |",
    methods,
    "",
  ].join("\n");
}
