import {
  DEFAULT_IMAGE_MODEL,
  DEFAULT_MEDIA_MODEL,
  DEFAULT_TEXT_MODEL,
  CHANNEL_ACCOUNT_ID,
  CHANNEL_ID,
  COMPACTION_PROVIDER_ID,
  DEFAULT_EMBEDDING_MODEL,
  IMAGE_PROVIDER_ID,
  MEDIA_PROVIDER_ID,
  MEMORY_EMBEDDING_PROVIDER_ID,
  MUSIC_PROVIDER_ID,
  PLUGIN_ID,
  REALTIME_TRANSCRIPTION_PROVIDER_ID,
  REALTIME_VOICE_PROVIDER_ID,
  SPEECH_PROVIDER_ID,
  TEXT_PROVIDER_ID,
  VIDEO_PROVIDER_ID,
  WEB_FETCH_PROVIDER_ID,
  WEB_SEARCH_PROVIDER_ID,
  createKitchenCompaction,
  createKitchenEmbedding,
  createKitchenMemorySearch,
  createKitchenChannelDelivery,
  createKitchenMusicResult,
  createKitchenScenarioRuntime,
  createKitchenSinkImageAsset,
  createKitchenSpeechAsset,
  createKitchenTextStream,
  createKitchenTranscription,
  createKitchenVideoResult,
  extractInteractiveText,
  kitchenChannelAccount,
  kitchenImageDescription,
  kitchenPromptGuidance,
  kitchenSearchSchema,
  kitchenTextModelDefinition,
  kitchenTextProviderConfig,
  kitchenToolSchema,
  normalizeKitchenTarget,
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
  optionalRegister(api, "registerChannel", () => api.registerChannel(buildKitchenChannel()));
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
  optionalRegister(api, "registerSpeechProvider", () => api.registerSpeechProvider(buildKitchenSpeechProvider()));
  optionalRegister(api, "registerRealtimeTranscriptionProvider", () =>
    api.registerRealtimeTranscriptionProvider(buildKitchenRealtimeTranscriptionProvider()),
  );
  optionalRegister(api, "registerRealtimeVoiceProvider", () =>
    api.registerRealtimeVoiceProvider(buildKitchenRealtimeVoiceProvider()),
  );
  optionalRegister(api, "registerVideoGenerationProvider", () =>
    api.registerVideoGenerationProvider(buildKitchenVideoProvider()),
  );
  optionalRegister(api, "registerMusicGenerationProvider", () =>
    api.registerMusicGenerationProvider(buildKitchenMusicProvider()),
  );
  optionalRegister(api, "registerWebSearchProvider", () =>
    api.registerWebSearchProvider(buildKitchenWebSearchProvider()),
  );
  optionalRegister(api, "registerWebFetchProvider", () =>
    api.registerWebFetchProvider(buildKitchenWebFetchProvider()),
  );
  optionalRegister(api, "registerDetachedTaskRuntime", () =>
    api.registerDetachedTaskRuntime(buildKitchenDetachedTaskRuntime()),
  );
  optionalRegister(api, "registerMemoryEmbeddingProvider", () =>
    api.registerMemoryEmbeddingProvider(buildKitchenMemoryEmbeddingProvider()),
  );
  optionalRegister(api, "registerMemoryCorpusSupplement", () =>
    api.registerMemoryCorpusSupplement(buildKitchenMemoryCorpusSupplement()),
  );
  optionalRegister(api, "registerCompactionProvider", () =>
    api.registerCompactionProvider(buildKitchenCompactionProvider()),
  );
  optionalRegister(api, "registerAgentToolResultMiddleware", () =>
    api.registerAgentToolResultMiddleware(buildKitchenToolResultMiddleware(), {
      runtimes: ["pi", "codex", "cli"],
    }),
  );
  optionalRegister(api, "registerService", () => api.registerService(buildKitchenService()));
  optionalRegister(api, "registerHttpRoute", () => api.registerHttpRoute(buildKitchenHttpRoute()));
  optionalRegister(api, "registerGatewayMethod", () =>
    api.registerGatewayMethod("kitchen.status", buildKitchenGatewayMethod()),
  );
  optionalRegister(api, "registerCli", () => api.registerCli(buildKitchenCliRegistrar(), buildKitchenCliMetadata()));
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

function buildKitchenChannel() {
  return {
    id: CHANNEL_ID,
    meta: {
      id: CHANNEL_ID,
      label: "Kitchen Sink",
      selectionLabel: "Kitchen Sink",
      docsPath: "/plugins/kitchen-sink",
      docsLabel: "Kitchen Sink",
      blurb: "Credential-free channel fixture for deterministic Kitchen Sink conversations.",
      aliases: ["kitchen", "kitchen-sink"],
      exposure: { configured: true, setup: true, docs: true },
      showConfigured: true,
      showInSetup: true,
    },
    capabilities: {
      chatTypes: ["direct", "group", "channel"],
      media: true,
      nativeCommands: true,
      reply: true,
      threads: true,
    },
    config: {
      listAccountIds: () => [CHANNEL_ACCOUNT_ID],
      defaultAccountId: () => CHANNEL_ACCOUNT_ID,
      resolveAccount: (cfg, accountId) => kitchenChannelAccount(accountId || CHANNEL_ACCOUNT_ID, cfg),
      isEnabled: (cfg) => cfg?.disabled !== true,
      isConfigured: (cfg) => cfg?.configured !== false,
      describeAccount: (account) => kitchenChannelAccount(account.accountId, account),
      resolveDefaultTo: () => "kitchen",
    },
    status: {
      defaultRuntime: kitchenChannelAccount(),
      probeAccount: async ({ account }) => ({
        ok: true,
        accountId: account.accountId,
        scenarioId: "channel.probe",
      }),
      buildAccountSnapshot: ({ account }) => kitchenChannelAccount(account.accountId),
    },
    outbound: {
      deliveryMode: "direct",
      textChunkLimit: 2000,
      sendText: async (ctx) =>
        createKitchenChannelDelivery({ kind: "text", text: ctx?.text, to: ctx?.to }),
      sendMedia: async (ctx) =>
        createKitchenChannelDelivery({ kind: "media", text: ctx?.mediaUrl || ctx?.text, to: ctx?.to }),
    },
    messaging: {
      normalizeTarget: (raw) => normalizeKitchenTarget(raw),
      parseExplicitTarget: ({ raw }) => ({
        to: normalizeKitchenTarget(raw),
        chatType: "direct",
      }),
      inferTargetChatType: () => "direct",
      resolveOutboundSessionRoute: ({ agentId, target, threadId }) => {
        const to = normalizeKitchenTarget(target);
        return {
          sessionKey: `kitchen:${agentId || "agent"}:${to}`,
          baseSessionKey: `kitchen:${agentId || "agent"}:${to}`,
          peer: { kind: "direct", id: to },
          chatType: "direct",
          from: CHANNEL_ACCOUNT_ID,
          to,
          threadId: threadId || undefined,
        };
      },
    },
    agentPrompt: {
      messageToolHints: () => kitchenPromptGuidance(),
      messageToolCapabilities: () => [
        "Kitchen Sink channel accepts deterministic dry messages prefixed with kitchen.",
        "Kitchen Sink channel can deliver text and media without external credentials.",
      ],
    },
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
        model: req?.model,
      });
      if (result.error) {
        throw kitchenProviderError(result);
      }
      return {
        images: [stripDataUrl(result.image)],
        model: req?.model || DEFAULT_IMAGE_MODEL,
        metadata: {
          kitchenSink: true,
          job: result.job,
          asset: result.image.metadata,
          provider: IMAGE_PROVIDER_ID,
          pluginId: PLUGIN_ID,
          scenarioId: result.scenarioId,
          route: result.route,
          request: {
            prompt: req?.prompt,
            size: req?.size,
            aspectRatio: req?.aspectRatio,
            count: req?.count || 1,
          },
        },
      };
    },
  };
}

function buildKitchenMediaProvider() {
  return {
    id: MEDIA_PROVIDER_ID,
    capabilities: ["image", "audio", "video"],
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
    transcribeAudio: async (req) => createKitchenTranscription({ audio: req?.audio, prompt: req?.prompt }),
    describeVideo: async (req) => ({
      text: "Kitchen Sink video fixture: three deterministic frames show the office sink asset, a close-up, and a fixture badge.",
      model: req?.model || DEFAULT_MEDIA_MODEL,
      metadata: { kitchenSink: true, provider: MEDIA_PROVIDER_ID, scenarioId: "media.video-describe" },
    }),
  };
}

function buildKitchenSpeechProvider() {
  return {
    id: SPEECH_PROVIDER_ID,
    label: "Kitchen Sink Speech",
    voices: ["kitchen-neutral", "kitchen-robot"],
    defaultVoice: "kitchen-neutral",
    isConfigured: () => true,
    synthesize: async (req) => createKitchenSpeechAsset({
      text: req?.text,
      voice: req?.voice,
      model: req?.model,
    }),
    speak: async (req) => createKitchenSpeechAsset({
      text: req?.text,
      voice: req?.voice,
      model: req?.model,
    }),
  };
}

function buildKitchenRealtimeTranscriptionProvider() {
  return {
    id: REALTIME_TRANSCRIPTION_PROVIDER_ID,
    label: "Kitchen Sink Realtime Transcription",
    isConfigured: () => true,
    createSession: (req = {}) => {
      const chunks = [];
      return {
        provider: REALTIME_TRANSCRIPTION_PROVIDER_ID,
        async connect() {
          req.onReady?.({ provider: REALTIME_TRANSCRIPTION_PROVIDER_ID });
          return { ok: true, provider: REALTIME_TRANSCRIPTION_PROVIDER_ID };
        },
        sendAudio(audio) {
          chunks.push(audio);
          req.onTranscript?.(`Kitchen Sink partial transcript ${chunks.length}.`);
        },
        async close() {
          const result = createKitchenTranscription({ audio: Buffer.concat(chunks.map(toBuffer)) });
          req.onTranscript?.(result.text);
          req.onClose?.({ code: 1000, reason: "kitchen sink complete" });
          return result;
        },
      };
    },
  };
}

function buildKitchenRealtimeVoiceProvider() {
  return {
    id: REALTIME_VOICE_PROVIDER_ID,
    label: "Kitchen Sink Realtime Voice",
    isConfigured: () => true,
    createBridge: (req = {}) => {
      let connected = false;
      const audio = [];
      return {
        supportsToolResultContinuation: true,
        async connect() {
          connected = true;
          req.onEvent?.({ type: "connected", provider: REALTIME_VOICE_PROVIDER_ID });
        },
        sendAudio(chunk) {
          audio.push(chunk);
          req.onTranscript?.("Kitchen Sink realtime voice heard audio.");
        },
        setMediaTimestamp(timestampMs) {
          req.onEvent?.({ type: "media_timestamp", timestampMs });
        },
        submitToolResult(result) {
          req.onEvent?.({ type: "tool_result", result });
        },
        acknowledgeMark(mark) {
          req.onEvent?.({ type: "mark", mark });
        },
        close() {
          connected = false;
          req.onEvent?.({ type: "closed", audioChunks: audio.length });
        },
        isConnected: () => connected,
      };
    },
  };
}

function buildKitchenVideoProvider() {
  return {
    id: VIDEO_PROVIDER_ID,
    label: "Kitchen Sink Video",
    defaultModel: "kitchen-sink-video-v1",
    capabilities: {
      generate: { maxVideos: 1, maxDurationSeconds: 3, supportsResolution: true },
      imageToVideo: { enabled: true, maxVideos: 1, maxInputImages: 1, maxDurationSeconds: 3 },
      videoToVideo: { enabled: false },
    },
    isConfigured: () => true,
    generateVideo: async (req) => createKitchenVideoResult({ prompt: req?.prompt, model: req?.model }),
  };
}

function buildKitchenMusicProvider() {
  return {
    id: MUSIC_PROVIDER_ID,
    label: "Kitchen Sink Music",
    defaultModel: "kitchen-sink-music-v1",
    capabilities: {
      generate: { maxTracks: 1, maxDurationSeconds: 1 },
      edit: { enabled: true, maxInputAudio: 1, maxTracks: 1 },
    },
    isConfigured: () => true,
    generateMusic: async (req) => createKitchenMusicResult({ prompt: req?.prompt, model: req?.model }),
    generate: async (req) => createKitchenMusicResult({ prompt: req?.prompt, model: req?.model }),
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
          profiles: [
            {
              id: "kitchen-sink-local",
              label: "Kitchen Sink Local",
              configured: true,
              source: "fixture",
            },
          ],
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

function buildKitchenMemoryEmbeddingProvider() {
  return {
    id: MEMORY_EMBEDDING_PROVIDER_ID,
    label: "Kitchen Sink Memory Embeddings",
    model: DEFAULT_EMBEDDING_MODEL,
    dimensions: 8,
    isConfigured: () => true,
    embed: async (input) => ({
      provider: MEMORY_EMBEDDING_PROVIDER_ID,
      model: DEFAULT_EMBEDDING_MODEL,
      embedding: createKitchenEmbedding(typeof input === "string" ? input : input?.text),
    }),
    embedMany: async (input) => {
      const texts = Array.isArray(input) ? input : Array.isArray(input?.texts) ? input.texts : [input?.text ?? ""];
      return {
        provider: MEMORY_EMBEDDING_PROVIDER_ID,
        model: DEFAULT_EMBEDDING_MODEL,
        embeddings: texts.map((text) => createKitchenEmbedding(text)),
      };
    },
  };
}

function buildKitchenMemoryCorpusSupplement() {
  return {
    id: "kitchen-sink-memory-corpus",
    label: "Kitchen Sink Memory Corpus",
    search: async (query) => createKitchenMemorySearch(typeof query === "string" ? query : query?.query),
    read: async (id = "ks-memory-runtime-surfaces") => ({
      id,
      title: "Kitchen Sink runtime surfaces",
      text: "Kitchen Sink memory corpus fixture covering providers, channels, hooks, compaction, and tasks.",
      metadata: { kitchenSink: true, pluginId: PLUGIN_ID, scenarioId: "memory.read" },
    }),
    list: async () => ({
      items: [{ id: "ks-memory-runtime-surfaces", title: "Kitchen Sink runtime surfaces" }],
    }),
  };
}

function buildKitchenCompactionProvider() {
  return {
    id: COMPACTION_PROVIDER_ID,
    label: "Kitchen Sink Compaction",
    compact: async (input) => createKitchenCompaction(input),
    summarize: async (input) => createKitchenCompaction(input),
  };
}

function buildKitchenToolResultMiddleware() {
  return async (event = {}) => ({
    ...event,
    kitchenSink: true,
    pluginId: PLUGIN_ID,
    scenarioId: "tool-result.middleware",
    result: event.result,
    metadata: {
      ...(event.metadata || {}),
      kitchenSinkToolResultMiddleware: true,
    },
  });
}

function buildKitchenService() {
  return {
    id: "kitchen-sink-service",
    name: "Kitchen Sink Service",
    description: "Credential-free background service fixture.",
    start: async () => ({ ok: true, service: "kitchen-sink-service", state: "started" }),
    stop: async () => ({ ok: true, service: "kitchen-sink-service", state: "stopped" }),
    probe: async () => ({ ok: true, service: "kitchen-sink-service", state: "ready" }),
  };
}

function buildKitchenHttpRoute() {
  return {
    id: "kitchen-sink-http-status",
    path: "/kitchen-sink/status",
    auth: "gateway",
    match: "exact",
    handler: async (_req, res) => {
      const body = JSON.stringify({ ok: true, pluginId: PLUGIN_ID, scenarioId: "http.status" });
      if (res && typeof res === "object") {
        res.statusCode = 200;
        res.setHeader?.("content-type", "application/json");
        res.end?.(body);
      }
      return { ok: true, body };
    },
  };
}

function buildKitchenGatewayMethod() {
  return async () => ({
    ok: true,
    pluginId: PLUGIN_ID,
    providerIds: [
      SPEECH_PROVIDER_ID,
      REALTIME_TRANSCRIPTION_PROVIDER_ID,
      REALTIME_VOICE_PROVIDER_ID,
      VIDEO_PROVIDER_ID,
      MUSIC_PROVIDER_ID,
      MEMORY_EMBEDDING_PROVIDER_ID,
      COMPACTION_PROVIDER_ID,
    ],
  });
}

function buildKitchenCliRegistrar() {
  return async ({ program } = {}) => {
    program?.command?.("kitchen-sink")?.description?.("Run Kitchen Sink fixture commands.");
    return { ok: true, command: "kitchen-sink" };
  };
}

function buildKitchenCliMetadata() {
  return {
    descriptors: [
      {
        name: "kitchen-sink",
        description: "Run Kitchen Sink fixture commands.",
        hasSubcommands: true,
      },
    ],
  };
}

function buildKitchenDetachedTaskRuntime() {
  const tasks = new Map();

  function create(params, status) {
    const now = Date.now();
    const runId = params.runId || `ks_task_${Math.abs(hashTask(params.task || status))}`;
    const task = {
      taskId: runId,
      runId,
      runtime: params.runtime || "cli",
      taskKind: params.taskKind || "kitchen-sink",
      sourceId: params.sourceId || PLUGIN_ID,
      requesterSessionKey: params.requesterSessionKey || "kitchen-sink",
      ownerKey: params.ownerKey || PLUGIN_ID,
      scopeKind: params.scopeKind || "session",
      childSessionKey: params.childSessionKey,
      parentFlowId: params.parentFlowId,
      parentTaskId: params.parentTaskId,
      agentId: params.agentId,
      label: params.label || "Kitchen Sink task",
      task: params.task,
      status,
      deliveryStatus: params.deliveryStatus || "not_applicable",
      notifyPolicy: params.notifyPolicy || "done_only",
      createdAt: now,
      startedAt: status === "running" ? params.startedAt || now : params.startedAt,
      lastEventAt: params.lastEventAt || now,
      progressSummary: params.progressSummary || undefined,
    };
    tasks.set(runId, task);
    return task;
  }

  function update(runId, patch) {
    const current = tasks.get(runId);
    if (!current) {
      return [];
    }
    const cleanPatch = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
    const next = { ...current, ...cleanPatch };
    tasks.set(runId, next);
    return [next];
  }

  return {
    createQueuedTaskRun: (params) => create(params, "queued"),
    createRunningTaskRun: (params) => create(params, "running"),
    startTaskRunByRunId: (params) =>
      update(params.runId, {
        status: "running",
        runtime: params.runtime,
        requesterSessionKey: params.sessionKey,
        startedAt: params.startedAt || Date.now(),
        lastEventAt: params.lastEventAt || Date.now(),
        progressSummary: params.progressSummary || params.eventSummary || "Kitchen Sink task started.",
      }),
    recordTaskRunProgressByRunId: (params) =>
      update(params.runId, {
        runtime: params.runtime,
        requesterSessionKey: params.sessionKey,
        lastEventAt: params.lastEventAt || Date.now(),
        progressSummary: params.progressSummary || params.eventSummary || "Kitchen Sink task progressed.",
      }),
    finalizeTaskRunByRunId: (params) =>
      update(params.runId, {
        runtime: params.runtime,
        requesterSessionKey: params.sessionKey,
        status: params.status,
        endedAt: params.endedAt,
        lastEventAt: params.lastEventAt || params.endedAt,
        error: params.error,
        progressSummary: params.progressSummary || undefined,
        terminalSummary: params.terminalSummary || undefined,
        terminalOutcome: params.terminalOutcome || undefined,
      }),
    completeTaskRunByRunId: (params) =>
      update(params.runId, {
        runtime: params.runtime,
        requesterSessionKey: params.sessionKey,
        status: "succeeded",
        endedAt: params.endedAt,
        lastEventAt: params.lastEventAt || params.endedAt,
        progressSummary: params.progressSummary || undefined,
        terminalSummary: params.terminalSummary || "Kitchen Sink task completed.",
        terminalOutcome: params.terminalOutcome || "succeeded",
      }),
    failTaskRunByRunId: (params) =>
      update(params.runId, {
        runtime: params.runtime,
        requesterSessionKey: params.sessionKey,
        status: params.status || "failed",
        endedAt: params.endedAt,
        lastEventAt: params.lastEventAt || params.endedAt,
        error: params.error,
        progressSummary: params.progressSummary || undefined,
        terminalSummary: params.terminalSummary || "Kitchen Sink task failed.",
      }),
    setDetachedTaskDeliveryStatusByRunId: (params) =>
      update(params.runId, {
        runtime: params.runtime,
        requesterSessionKey: params.sessionKey,
        deliveryStatus: params.deliveryStatus,
        error: params.error,
      }),
    cancelDetachedTaskRunById: async ({ taskId }) => {
      const current = tasks.get(taskId);
      if (!current) {
        return { found: false, cancelled: false, reason: "not owned by Kitchen Sink" };
      }
      const task = {
        ...current,
        status: "cancelled",
        endedAt: Date.now(),
        lastEventAt: Date.now(),
        terminalSummary: "Kitchen Sink task cancelled.",
      };
      tasks.set(taskId, task);
      return { found: true, cancelled: true, task };
    },
    tryRecoverTaskBeforeMarkLost: ({ task }) => ({
      recovered: Boolean(task?.taskId && tasks.has(task.taskId)),
    }),
  };
}

function hashTask(input) {
  let hash = 0;
  for (const char of String(input)) {
    hash = Math.imul(31, hash) + char.charCodeAt(0);
  }
  return hash;
}

function pluginConfigPath() {
  return `plugins.${PLUGIN_ID}`;
}

function kitchenProviderError(result) {
  const error = new Error(result.error.message);
  error.name = "KitchenSinkProviderError";
  error.code = result.error.code;
  error.statusCode = result.error.statusCode;
  error.retryable = result.error.retryable;
  error.retryAfterMs = result.error.retryAfterMs;
  error.metadata = {
    kitchenSink: true,
    job: result.job,
    pluginId: PLUGIN_ID,
    provider: IMAGE_PROVIDER_ID,
    scenarioId: result.scenarioId,
    route: result.route,
  };
  return error;
}

function toBuffer(value) {
  if (Buffer.isBuffer(value)) {
    return value;
  }
  if (value instanceof Uint8Array) {
    return Buffer.from(value);
  }
  if (typeof value === "string") {
    return Buffer.from(value);
  }
  return Buffer.alloc(0);
}

function optionalRegister(api, method, register) {
  if (typeof api?.[method] !== "function") {
    return;
  }
  register();
}
