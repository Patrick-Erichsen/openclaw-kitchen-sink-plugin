import {
  extractInteractiveText,
  kitchenPromptGuidance,
  kitchenSearchSchema,
  kitchenToolSchema,
  readPrompt,
  readQuery,
  runKitchenCommand,
  runKitchenImageTool,
  runKitchenSearch,
  shouldHandleKitchenText,
} from "../scenarios.js";

export function buildKitchenCommand(runtime) {
  return {
    name: "kitchen",
    nativeNames: { default: "kitchen" },
    description: "Run deterministic Kitchen Sink fixture scenarios.",
    acceptsArgs: true,
    requireAuth: false,
    agentPromptGuidance: kitchenPromptGuidance(),
    handler: async (ctx) => runKitchenCommand(runtime, ctx?.args ?? ctx?.commandBody ?? ""),
  };
}

export function buildKitchenSinkCommand(runtime) {
  return {
    ...buildKitchenCommand(runtime),
    name: "kitchen-sink",
    nativeNames: { default: "kitchen-sink" },
  };
}

export function buildKitchenInteractiveHandler(runtime) {
  return {
    channel: "*",
    namespace: "kitchen-sink",
    handler: async (ctx) => {
      const text = extractInteractiveText(ctx);
      if (!shouldHandleKitchenText(text)) {
        return { handled: false };
      }
      return {
        handled: true,
        reply: await runKitchenCommand(runtime, text.replace(/^kitchen\b/i, "").trim()),
      };
    },
  };
}

export function buildKitchenImageTool(runtime) {
  return {
    id: "kitchen_sink_image_job",
    name: "kitchen_sink_image_job",
    description:
      "Generate a deterministic Kitchen Sink image fixture. Use when the user asks for a kitchen sink image, fixture image, or image-provider smoke test.",
    inputSchema: kitchenToolSchema("Prompt for the deterministic image fixture."),
    schema: kitchenToolSchema("Prompt for the deterministic image fixture."),
    parameters: kitchenToolSchema("Prompt for the deterministic image fixture."),
    handler: async (input) => runKitchenImageTool(runtime, input),
    run: async (input) => runKitchenImageTool(runtime, input),
    execute: async (input) => runKitchenImageTool(runtime, input),
  };
}

export function buildKitchenTextTool(runtime) {
  return {
    id: "kitchen_sink_text",
    name: "kitchen_sink_text",
    description:
      "Return a deterministic text inference fixture response for Kitchen Sink plugin smoke tests.",
    inputSchema: kitchenToolSchema("Prompt for the deterministic text fixture."),
    schema: kitchenToolSchema("Prompt for the deterministic text fixture."),
    parameters: kitchenToolSchema("Prompt for the deterministic text fixture."),
    handler: async (input) => runtime.runTextJob({ prompt: readPrompt(input), route: "tool:kitchen_sink_text" }),
    run: async (input) => runtime.runTextJob({ prompt: readPrompt(input), route: "tool:kitchen_sink_text" }),
    execute: async (input) => runtime.runTextJob({ prompt: readPrompt(input), route: "tool:kitchen_sink_text" }),
  };
}

export function buildKitchenSearchTool() {
  return {
    id: "kitchen_sink_search",
    name: "kitchen_sink_search",
    description: "Return deterministic Kitchen Sink search results for tool-routing smoke tests.",
    inputSchema: kitchenSearchSchema(),
    schema: kitchenSearchSchema(),
    parameters: kitchenSearchSchema(),
    handler: async (input) => runKitchenSearch(readQuery(input)),
    run: async (input) => runKitchenSearch(readQuery(input)),
    execute: async (input) => runKitchenSearch(readQuery(input)),
  };
}
