# OpenClaw Kitchen Sink Plugin

Credential-free OpenClaw plugin fixture that intentionally touches the public
plugin API surface.

This repo is both:

- a readable example for plugin authors
- a dummy compatibility fixture for [Crabpot](https://github.com/openclaw/crabpot) and [plugin-inspector](https://github.com/openclaw/plugin-inspector)

The runtime handlers are no-op probes. They should not call external services,
read secrets, spawn processes, or require live credentials.

## API Surface Sync

The generated files under `src/generated-*` are derived from the installed
`openclaw` package:

```sh
npm install
npm run sync:surface
npm test
```

When Dependabot bumps `openclaw`, `npm test` verifies that this fixture still
covers every discovered hook, registrar, manifest contract key, and plugin SDK
export path for that package version.

## Why Generated Files Exist

[Crabpot](https://github.com/openclaw/crabpot) and [plugin-inspector](https://github.com/openclaw/plugin-inspector) rely on static source evidence. The generated files
therefore contain explicit calls such as `api.registerTool(...)` and
`api.on("before_prompt_build", ...)` instead of dynamic loops.
