#!/usr/bin/env node

import assert from "node:assert/strict";
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
        return (...args) => {
          registrations.on ??= [];
          registrations.on.push(args);
        };
      }
      if (typeof property !== "string" || !property.startsWith("register")) {
        return undefined;
      }
      return (...args) => {
        registrations[property] ??= [];
        registrations[property].push(args);
      };
    },
  },
);

plugin.register(api);

const commands = registrations.registerCommand?.map(([command]) => command) ?? [];
assert.ok(commands.some((command) => command.name === "kitchen"), "registers kitchen command");
assert.ok(commands.some((command) => command.name === "kitchen-sink"), "registers kitchen-sink command");

const imageProvider = findRegistration("registerImageGenerationProvider", "kitchen-sink-image");
assert.equal(imageProvider.defaultModel, "kitchen-sink-image-v1");

const sleeps = [];
const { PLUGIN_ID, runKitchenScenario } = await import("../src/scenarios.js");
const { createKitchenSinkRuntime } = await import("../src/kitchen-runtime.js");
const fastRuntime = createKitchenSinkRuntime({
  delayMs: 10_000,
  sleep: async (ms) => {
    sleeps.push(ms);
  },
  now: fixedNow(),
});
const imageResult = await fastRuntime.runImageJob({ prompt: "generate an image with kitchen sink" });
assert.deepEqual(sleeps, [10_000]);
assert.equal(imageResult.scenarioId, "image.generate");
assert.equal(imageResult.route, "provider:image");
assert.equal(imageResult.job.status, "completed");
assert.equal(imageResult.job.pluginId, "openclaw-kitchen-sink-fixture");
assert.equal(imageResult.image.metadata.pluginId, "openclaw-kitchen-sink-fixture");
assert.equal(imageResult.image.mimeType, "image/svg+xml");
assert.ok(imageResult.image.buffer.toString("utf8").includes("Kitchen Sink Fixture"));
assert.ok(imageResult.image.dataUrl.startsWith("data:image/svg+xml;base64,"));

const scenarioResult = await runKitchenScenario(fastRuntime, {
  scenario: "web.fetch",
  url: "kitchen://fixture/readme",
  route: "test:scenario-engine",
});
assert.equal(PLUGIN_ID, "openclaw-kitchen-sink-fixture");
assert.equal(scenarioResult.scenarioId, "web.fetch");
assert.equal(scenarioResult.route, "test:scenario-engine");
assert.match(scenarioResult.content, /deterministic document/);

const mediaProvider = findRegistration("registerMediaUnderstandingProvider", "kitchen-sink-media");
const mediaResult = await mediaProvider.describeImage({
  prompt: "what is in this image",
  model: "kitchen-sink-vision-v1",
});
assert.match(mediaResult.text, /Kitchen Sink media fixture/);

const searchProvider = findRegistration("registerWebSearchProvider", "kitchen-sink-search");
const searchTool = searchProvider.createTool({});
const searchResult = await searchTool.execute({ query: "kitchen sink image provider" });
assert.equal(searchResult.results.length, 3);
assert.equal(searchResult.provider, "kitchen-sink-search");

const textProvider = findRegistration("registerProvider", "kitchen-sink-llm");
const catalog = await textProvider.staticCatalog.run({ config: {}, env: {} });
assert.equal(catalog.provider.models[0].id, "kitchen-sink-text-v1");
assert.equal(catalog.provider.models[0].api, "kitchen-sink");
const streamFn = textProvider.createStreamFn({});
const stream = streamFn(catalog.provider.models[0], {
  messages: [{ role: "user", content: "kitchen explain text inference", timestamp: 0 }],
});
const streamEvents = [];
for await (const event of stream) {
  streamEvents.push(event.type);
}
const streamMessage = await stream.result();
assert.deepEqual(streamEvents, ["start", "text_start", "text_delta", "text_end", "done"]);
assert.match(streamMessage.content[0].text, /kitchen explain text inference/);

const imageTool = findRegistration("registerTool", "kitchen_sink_image_job");
assert.equal(typeof imageTool.execute, "function");

console.log("Kitchen runtime OK");

function findRegistration(method, id) {
  const entry = registrations[method]?.map(([value]) => value).find((value) => value?.id === id);
  assert.ok(entry, `${method} ${id} registered`);
  return entry;
}

function fixedNow() {
  let tick = 0;
  return () => new Date(Date.UTC(2026, 3, 28, 12, 0, tick++));
}
