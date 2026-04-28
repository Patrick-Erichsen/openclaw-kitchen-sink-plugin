import {
  DEFAULT_IMAGE_MODEL,
  DEFAULT_MEDIA_MODEL,
  DEFAULT_TEXT_MODEL,
  IMAGE_PROVIDER_ID,
  MEDIA_PROVIDER_ID,
  PLUGIN_ID,
  TEXT_PROVIDER_ID,
  WEB_FETCH_PROVIDER_ID,
  WEB_SEARCH_PROVIDER_ID,
  createKitchenScenarioRuntime,
  createKitchenSinkImageAsset,
  createKitchenTextStream,
  extractInteractiveText,
  kitchenImageDescription,
  kitchenPromptGuidance,
  kitchenSearchSchema,
  kitchenTextModelDefinition,
  kitchenTextProviderConfig,
  kitchenToolSchema,
  readPrompt,
  readQuery,
  readUrl,
  runKitchenCommand,
  runKitchenFetch,
  runKitchenImageTool,
  runKitchenSearch,
  shouldHandleKitchenText,
  stripDataUrl,
} from "./scenarios.js";

export { createKitchenSinkImageAsset, kitchenPromptGuidance, shouldHandleKitchenText };

export function registerKitchenSinkRuntime(api, options = {}) {
  const runtime = createKitchenSinkRuntime(options);

  optionalRegister(api, "registerCommand", () => api.registerCommand(buildKitchenCommand(runtime)));
  optionalRegister(api, "registerCommand", () => api.registerCommand(buildKitchenSinkCommand(runtime)));
  optionalRegister(api, "registerInteractiveHandler", () =>
    api.registerInteractiveHandler(buildKitchenInteractiveHandler(runtime)),
  );
  optionalRegister(api, "registerTool", () => api.registerTool(buildKitchenImageTool(runtime)));
  optionalRegister(api, "registerTool", () => api.registerTool(buildKitchenTextTool(runtime)));
  optionalRegister(api, "registerTool", () => api.registerTool(buildKitchenSearchTool()));
  optionalRegister(api, "registerProvider", () => api.registerProvider(buildKitchenTextProvider()));
  optionalRegister(api, "registerImageGenerationProvider", () =>
    api.registerImageGenerationProvider(buildKitchenImageProvider(runtime)),
  );
  optionalRegister(api, "registerMediaUnderstandingProvider", () =>
    api.registerMediaUnderstandingProvider(buildKitchenMediaProvider()),
  );
  optionalRegister(api, "registerWebSearchProvider", () =>
    api.registerWebSearchProvider(buildKitchenWebSearchProvider()),
  );
  optionalRegister(api, "registerWebFetchProvider", () =>
    api.registerWebFetchProvider(buildKitchenWebFetchProvider()),
  );
  optionalRegister(api, "registerMemoryPromptSupplement", () =>
    api.registerMemoryPromptSupplement(async () => kitchenPromptGuidance().join("\n")),
  );

  return runtime;
}

export function createKitchenSinkRuntime(options = {}) {
  return createKitchenScenarioRuntime(options);
}

function buildKitchenCommand(runtime) {
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

function buildKitchenSinkCommand(runtime) {
  return {
    ...buildKitchenCommand(runtime),
    name: "kitchen-sink",
    nativeNames: { default: "kitchen-sink" },
  };
}

function buildKitchenInteractiveHandler(runtime) {
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

function buildKitchenImageTool(runtime) {
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

function buildKitchenTextTool(runtime) {
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

function buildKitchenSearchTool() {
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

function buildKitchenImageProvider(runtime) {
  return {
    id: IMAGE_PROVIDER_ID,
    aliases: ["kitchen", "kitchen-sink", "openclaw-kitchen-sink"],
    label: "Kitchen Sink Image",
    defaultModel: DEFAULT_IMAGE_MODEL,
    models: [DEFAULT_IMAGE_MODEL],
    capabilities: {
      generate: {
        maxCount: 1,
        supportsSize: true,
        supportsAspectRatio: true,
        supportsResolution: true,
      },
      edit: {
        enabled: true,
        maxInputImages: 1,
        maxCount: 1,
      },
      geometry: {
        sizes: ["1024x1024"],
        aspectRatios: ["1:1"],
        resolutions: ["1K"],
      },
    },
    isConfigured: () => true,
    generateImage: async (req) => {
      const result = await runtime.runScenario({
        scenario: "image.generate",
        prompt: req?.prompt,
        route: "provider:image",
      });
      return {
        images: [stripDataUrl(result.image)],
        model: req?.model || DEFAULT_IMAGE_MODEL,
        metadata: {
          kitchenSink: true,
          job: result.job,
          provider: IMAGE_PROVIDER_ID,
          pluginId: PLUGIN_ID,
          scenarioId: result.scenarioId,
          route: result.route,
        },
      };
    },
  };
}

function buildKitchenMediaProvider() {
  return {
    id: MEDIA_PROVIDER_ID,
    capabilities: ["image"],
    defaultModels: { image: DEFAULT_MEDIA_MODEL },
    autoPriority: { image: 5 },
    describeImage: async (req) => ({
      text: kitchenImageDescription(req?.prompt, 1),
      model: req?.model || DEFAULT_MEDIA_MODEL,
    }),
    describeImages: async (req) => ({
      text: kitchenImageDescription(req?.prompt, Array.isArray(req?.images) ? req.images.length : 0),
      model: req?.model || DEFAULT_MEDIA_MODEL,
    }),
  };
}

function buildKitchenTextProvider() {
  return {
    id: TEXT_PROVIDER_ID,
    label: "Kitchen Sink LLM",
    docsPath: "/providers/models",
    aliases: ["kitchen-sink-text", "kitchen"],
    envVars: [],
    auth: [
      {
        id: "none",
        label: "No credentials",
        hint: "Deterministic local fixture provider.",
        kind: "custom",
        run: async () => ({
          profiles: [],
          defaultModel: `${TEXT_PROVIDER_ID}/${DEFAULT_TEXT_MODEL}`,
          notes: ["Kitchen Sink LLM is deterministic and does not call a network service."],
        }),
      },
    ],
    staticCatalog: {
      order: "simple",
      run: async () => ({
        provider: kitchenTextProviderConfig(),
      }),
    },
    catalog: {
      order: "simple",
      run: async () => ({
        provider: kitchenTextProviderConfig(),
      }),
    },
    resolveDynamicModel: ({ modelId }) =>
      modelId === DEFAULT_TEXT_MODEL ? kitchenTextModelDefinition() : undefined,
    resolveSyntheticAuth: () => ({
      apiKey: "kitchen-sink-local-fixture",
      source: "kitchen-sink fixture",
      mode: "token",
    }),
    createStreamFn: () => createKitchenTextStream,
    resolveSystemPromptContribution: () => ({
      stablePrefix: kitchenPromptGuidance().join("\n"),
    }),
  };
}

function buildKitchenWebSearchProvider() {
  return {
    id: WEB_SEARCH_PROVIDER_ID,
    label: "Kitchen Sink Search",
    hint: "Credential-free deterministic search fixture.",
    requiresCredential: false,
    envVars: [],
    placeholder: "no key required",
    signupUrl: "https://github.com/openclaw/kitchen-sink",
    docsUrl: "https://github.com/openclaw/kitchen-sink#readme",
    credentialPath: `${pluginConfigPath()}.search`,
    getCredentialValue: () => "fixture",
    setCredentialValue: (target, value) => {
      target.fixture = value;
    },
    applySelectionConfig: (config) => config,
    resolveRuntimeMetadata: async () => ({ provider: WEB_SEARCH_PROVIDER_ID, pluginId: PLUGIN_ID }),
    createTool: () => ({
      description: "Search the deterministic Kitchen Sink fixture corpus.",
      parameters: kitchenSearchSchema(),
      execute: async (args) => runKitchenSearch(readQuery(args)),
    }),
  };
}

function buildKitchenWebFetchProvider() {
  return {
    id: WEB_FETCH_PROVIDER_ID,
    label: "Kitchen Sink Fetch",
    hint: "Credential-free deterministic fetch fixture.",
    requiresCredential: false,
    envVars: [],
    placeholder: "no key required",
    signupUrl: "https://github.com/openclaw/kitchen-sink",
    docsUrl: "https://github.com/openclaw/kitchen-sink#readme",
    credentialPath: `${pluginConfigPath()}.fetch`,
    getCredentialValue: () => "fixture",
    setCredentialValue: (target, value) => {
      target.fixture = value;
    },
    applySelectionConfig: (config) => config,
    resolveRuntimeMetadata: async () => ({ provider: WEB_FETCH_PROVIDER_ID, pluginId: PLUGIN_ID }),
    createTool: () => ({
      description: "Fetch deterministic Kitchen Sink fixture documents.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          url: { type: "string", description: "Fixture URL or topic." },
        },
      },
      execute: async (args) => runKitchenFetch(readUrl(args)),
    }),
  };
}

function pluginConfigPath() {
  return `plugins.${PLUGIN_ID}`;
}

function optionalRegister(api, method, register) {
  if (typeof api?.[method] !== "function") {
    return;
  }
  register();
}
