const PLUGIN_ID = "openclaw-kitchen-sink";
const IMAGE_PROVIDER_ID = "kitchen-sink-image";
const MEDIA_PROVIDER_ID = "kitchen-sink-media";
const TEXT_PROVIDER_ID = "kitchen-sink-llm";
const WEB_SEARCH_PROVIDER_ID = "kitchen-sink-search";
const WEB_FETCH_PROVIDER_ID = "kitchen-sink-fetch";
const DEFAULT_IMAGE_MODEL = "kitchen-sink-image-v1";
const DEFAULT_MEDIA_MODEL = "kitchen-sink-vision-v1";
const DEFAULT_TEXT_MODEL = "kitchen-sink-text-v1";
const DEFAULT_IMAGE_DELAY_MS = 10_000;

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
  const delayMs = normalizeDelayMs(options.delayMs);
  const sleep = typeof options.sleep === "function" ? options.sleep : defaultSleep;
  const now = typeof options.now === "function" ? options.now : () => new Date();

  return {
    delayMs,
    async runImageJob(input = {}) {
      const prompt = normalizePrompt(input.prompt, "a kitchen sink fixture image");
      const job = createKitchenJob("image", prompt, now(), delayMs);
      await sleep(delayMs);
      const asset = createKitchenSinkImageAsset({ prompt, jobId: job.id });
      return {
        job: { ...job, status: "completed", completedAt: now().toISOString() },
        image: asset,
      };
    },
    async runTextJob(input = {}) {
      const prompt = normalizePrompt(input.prompt, "explain the kitchen sink fixture");
      const job = createKitchenJob("text", prompt, now(), 0);
      return {
        job: { ...job, status: "completed", completedAt: now().toISOString() },
        text: kitchenTextResponse(prompt),
      };
    },
  };
}

export function createKitchenSinkImageAsset({ prompt, jobId }) {
  const svg = renderKitchenSinkSvg({ prompt, jobId });
  const buffer = Buffer.from(svg, "utf8");
  return {
    buffer,
    mimeType: "image/svg+xml",
    fileName: `${jobId}.svg`,
    dataUrl: `data:image/svg+xml;base64,${buffer.toString("base64")}`,
    revisedPrompt: `Kitchen sink fixture image for: ${prompt}`,
    metadata: {
      kitchenSink: true,
      jobId,
      prompt,
    },
  };
}

export function shouldHandleKitchenText(text) {
  return /^kitchen(?:\s|$)/i.test(String(text ?? "").trim());
}

export function kitchenPromptGuidance() {
  return [
    "Kitchen Sink fixture plugin:",
    "- Use the kitchen_sink_image_job tool when the user asks for a kitchen sink image without selecting an image provider.",
    "- Use provider kitchen-sink-image for image generation when the configured image provider is Kitchen Sink.",
    "- Use kitchen_sink_search for deterministic search fixture queries.",
    "- Use kitchen_sink_text for deterministic text fixture responses.",
  ];
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
    handler: async (input) => runtime.runTextJob({ prompt: readPrompt(input) }),
    run: async (input) => runtime.runTextJob({ prompt: readPrompt(input) }),
    execute: async (input) => runtime.runTextJob({ prompt: readPrompt(input) }),
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
      const result = await runtime.runImageJob({ prompt: req?.prompt });
      return {
        images: [stripDataUrl(result.image)],
        model: req?.model || DEFAULT_IMAGE_MODEL,
        metadata: {
          kitchenSink: true,
          job: result.job,
          provider: IMAGE_PROVIDER_ID,
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
    credentialPath: "plugins.openclaw-kitchen-sink.search",
    getCredentialValue: () => "fixture",
    setCredentialValue: (target, value) => {
      target.fixture = value;
    },
    applySelectionConfig: (config) => config,
    resolveRuntimeMetadata: async () => ({ provider: WEB_SEARCH_PROVIDER_ID }),
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
    credentialPath: "plugins.openclaw-kitchen-sink.fetch",
    getCredentialValue: () => "fixture",
    setCredentialValue: (target, value) => {
      target.fixture = value;
    },
    applySelectionConfig: (config) => config,
    resolveRuntimeMetadata: async () => ({ provider: WEB_FETCH_PROVIDER_ID }),
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

async function runKitchenCommand(runtime, args) {
  const phrase = String(args ?? "").trim();
  if (/\b(image|picture|draw|generate)\b/i.test(phrase)) {
    const result = await runtime.runImageJob({ prompt: phrase || "kitchen sink image" });
    return kitchenImageReply(result);
  }
  if (/\b(search|find|lookup|web)\b/i.test(phrase)) {
    const result = await runKitchenSearch(phrase);
    return { text: renderSearchText(result), channelData: { kitchenSink: result } };
  }
  const result = await runtime.runTextJob({ prompt: phrase || "kitchen status" });
  return {
    text: result.text,
    channelData: { kitchenSink: result },
  };
}

async function runKitchenImageTool(runtime, input) {
  const result = await runtime.runImageJob({ prompt: readPrompt(input) });
  return {
    ...result,
    mediaUrl: result.image.dataUrl,
  };
}

async function runKitchenSearch(query) {
  const normalized = normalizePrompt(query, "kitchen sink");
  return {
    provider: WEB_SEARCH_PROVIDER_ID,
    query: normalized,
    results: [
      {
        title: "Kitchen Sink image fixture",
        url: "https://github.com/openclaw/kitchen-sink#image-fixture",
        snippet: `Deterministic image job route for "${normalized}".`,
      },
      {
        title: "Kitchen Sink dry command route",
        url: "https://github.com/openclaw/kitchen-sink#dry-command-route",
        snippet: "The kitchen prefix works without live LLM credentials.",
      },
      {
        title: "Kitchen Sink provider route",
        url: "https://github.com/openclaw/kitchen-sink#provider-route",
        snippet: "The image, media, text, fetch, and search providers are registered by the plugin.",
      },
    ],
  };
}

async function runKitchenFetch(url) {
  const target = normalizePrompt(url, "kitchen://fixture/readme");
  return {
    provider: WEB_FETCH_PROVIDER_ID,
    url: target,
    title: "Kitchen Sink fixture document",
    content:
      `Kitchen Sink fetched "${target}". This deterministic document proves plugin web-fetch routing without network access.`,
  };
}

function kitchenImageReply(result) {
  return {
    text:
      `kitchen image job ${result.job.id} completed after ${Math.round(result.job.delayMs / 1000)}s. ` +
      `provider=${IMAGE_PROVIDER_ID} model=${DEFAULT_IMAGE_MODEL}`,
    mediaUrl: result.image.dataUrl,
    presentation: {
      title: "Kitchen Sink Image",
      tone: "success",
      blocks: [
        { type: "text", text: `job: ${result.job.id}` },
        { type: "context", text: result.image.revisedPrompt },
      ],
    },
    channelData: {
      kitchenSink: result,
    },
  };
}

function kitchenTextProviderConfig() {
  return {
    baseUrl: "kitchen-sink://local",
    apiKey: "kitchen-sink-local-fixture",
    auth: "token",
    api: "kitchen-sink",
    models: [kitchenTextModelDefinition()],
  };
}

function kitchenTextModelDefinition() {
  return {
    id: DEFAULT_TEXT_MODEL,
    name: "Kitchen Sink Text Fixture",
    api: "kitchen-sink",
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 8192,
    maxTokens: 2048,
    description: "Deterministic OpenClaw plugin text-provider fixture.",
  };
}

function createKitchenTextStream(model, context) {
  const stream = createAssistantMessageEventStream();
  queueMicrotask(() => {
    const text = kitchenTextResponse(extractLastUserPrompt(context));
    const message = {
      role: "assistant",
      content: [{ type: "text", text }],
      api: model?.api || "kitchen-sink",
      provider: TEXT_PROVIDER_ID,
      model: model?.id || DEFAULT_TEXT_MODEL,
      usage: zeroUsage(),
      stopReason: "stop",
      timestamp: Date.now(),
    };
    stream.push({ type: "start", partial: { ...message, content: [] } });
    stream.push({ type: "text_start", contentIndex: 0, partial: { ...message, content: [] } });
    stream.push({ type: "text_delta", contentIndex: 0, delta: text, partial: message });
    stream.push({ type: "text_end", contentIndex: 0, content: text, partial: message });
    stream.push({ type: "done", reason: "stop", message });
    stream.end(message);
  });
  return stream;
}

function kitchenTextResponse(prompt) {
  return [
    "kitchen sink text fixture:",
    `prompt="${prompt}"`,
    "routes: direct prefix, registered tools, image provider, media understanding, web search, web fetch, and text provider catalog.",
  ].join(" ");
}

function createAssistantMessageEventStream() {
  const queue = [];
  const waiters = [];
  let done = false;
  let finalResult;
  let resolveResult;
  const resultPromise = new Promise((resolve) => {
    resolveResult = resolve;
  });

  return {
    push(event) {
      if (done) {
        return;
      }
      if (event.type === "done" || event.type === "error") {
        finalResult = event.type === "done" ? event.message : event.error;
        done = true;
        resolveResult(finalResult);
      }
      const waiter = waiters.shift();
      if (waiter) {
        waiter({ value: event, done: false });
      } else {
        queue.push(event);
      }
    },
    end(result) {
      if (result !== undefined && finalResult === undefined) {
        finalResult = result;
        resolveResult(result);
      }
      done = true;
      while (waiters.length > 0) {
        waiters.shift()({ value: undefined, done: true });
      }
    },
    async *[Symbol.asyncIterator]() {
      while (true) {
        if (queue.length > 0) {
          yield queue.shift();
        } else if (done) {
          return;
        } else {
          const next = await new Promise((resolve) => waiters.push(resolve));
          if (next.done) {
            return;
          }
          yield next.value;
        }
      }
    },
    result() {
      return resultPromise;
    },
  };
}

function extractLastUserPrompt(context) {
  const messages = Array.isArray(context?.messages) ? context.messages : [];
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== "user") {
      continue;
    }
    if (typeof message.content === "string") {
      return message.content;
    }
    if (Array.isArray(message.content)) {
      const text = message.content
        .filter((item) => item?.type === "text" && typeof item.text === "string")
        .map((item) => item.text)
        .join(" ")
        .trim();
      if (text) {
        return text;
      }
    }
  }
  return "kitchen sink text inference";
}

function zeroUsage() {
  return {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 0,
    cost: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      total: 0,
    },
  };
}

function kitchenImageDescription(prompt, count) {
  return [
    `Kitchen Sink media fixture described ${count || 1} image${count === 1 ? "" : "s"}.`,
    `Prompt: ${normalizePrompt(prompt, "describe kitchen sink image")}.`,
    "Visible content: a deterministic sink basin, faucet, job id label, and OpenClaw fixture badge.",
  ].join(" ");
}

function createKitchenJob(kind, prompt, date, delayMs) {
  const id = `ks_${kind}_${stableHash(`${kind}:${prompt}`).slice(0, 10)}`;
  return {
    id,
    kind,
    status: "running",
    prompt,
    delayMs,
    createdAt: date.toISOString(),
    pluginId: PLUGIN_ID,
  };
}

function renderKitchenSinkSvg({ prompt, jobId }) {
  const safePrompt = escapeXml(prompt).slice(0, 180);
  const safeJobId = escapeXml(jobId);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#f7f3ea"/>
  <rect x="96" y="150" width="832" height="724" rx="48" fill="#24313a"/>
  <rect x="154" y="248" width="716" height="530" rx="72" fill="#d8e7e5"/>
  <rect x="234" y="320" width="556" height="380" rx="54" fill="#f8fbf9"/>
  <path d="M342 416h340c38 0 68 30 68 68v66c0 82-66 148-148 148H422c-82 0-148-66-148-148v-66c0-38 30-68 68-68Z" fill="#b7d4d1"/>
  <path d="M464 388v-64c0-72 58-130 130-130h78v70h-78c-33 0-60 27-60 60v64h-70Z" fill="#5b707a"/>
  <rect x="620" y="190" width="144" height="74" rx="28" fill="#5b707a"/>
  <circle cx="512" cy="560" r="46" fill="#24313a"/>
  <circle cx="512" cy="560" r="22" fill="#8fa5a3"/>
  <text x="512" y="835" text-anchor="middle" font-family="Arial, sans-serif" font-size="44" font-weight="700" fill="#f7f3ea">Kitchen Sink Fixture</text>
  <text x="512" y="890" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#d8e7e5">${safeJobId}</text>
  <text x="512" y="940" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#24313a">${safePrompt}</text>
</svg>`;
}

function kitchenToolSchema(promptDescription) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      prompt: { type: "string", description: promptDescription },
    },
  };
}

function kitchenSearchSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      query: { type: "string", description: "Kitchen Sink fixture search query." },
    },
  };
}

function stripDataUrl(image) {
  const { dataUrl, ...asset } = image;
  return asset;
}

function renderSearchText(result) {
  return result.results.map((entry, index) => `${index + 1}. ${entry.title} - ${entry.snippet}`).join("\n");
}

function readPrompt(input) {
  return normalizePrompt(readString(input, "prompt") || readString(input, "input"), "kitchen sink fixture");
}

function readQuery(input) {
  return normalizePrompt(readString(input, "query") || readPrompt(input), "kitchen sink");
}

function readUrl(input) {
  return normalizePrompt(readString(input, "url") || readString(input, "query"), "kitchen://fixture/readme");
}

function readString(input, key) {
  if (input && typeof input === "object" && typeof input[key] === "string") {
    return input[key];
  }
  if (typeof input === "string" && key === "prompt") {
    return input;
  }
  return "";
}

function extractInteractiveText(ctx) {
  if (typeof ctx === "string") {
    return ctx;
  }
  if (!ctx || typeof ctx !== "object") {
    return "";
  }
  for (const key of ["text", "message", "body", "input", "content", "commandBody"]) {
    if (typeof ctx[key] === "string") {
      return ctx[key];
    }
  }
  if (ctx.message && typeof ctx.message === "object") {
    return extractInteractiveText(ctx.message);
  }
  return "";
}

function normalizePrompt(value, fallback) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function normalizeDelayMs(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return DEFAULT_IMAGE_DELAY_MS;
  }
  return Math.trunc(value);
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stableHash(input) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function optionalRegister(api, method, register) {
  if (typeof api?.[method] !== "function") {
    return;
  }
  register();
}
