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

The `Update OpenClaw SDK Surface` workflow checks `openclaw@latest` every 10
minutes. When a new version changes the public plugin surface, it regenerates
the pinned dependency, lockfile, manifest, hooks, registrars, and SDK import
fixture files, runs the static and runtime plugin-inspector checks, opens an
automation PR, and squash-merges it after those checks pass.

Dependabot still watches npm dependencies, but `openclaw` surface updates should
flow through the generated updater because a package-only bump leaves the
generated fixture files stale.

## Why Generated Files Exist

[Crabpot](https://github.com/openclaw/crabpot) and [plugin-inspector](https://github.com/openclaw/plugin-inspector) rely on static source evidence. The generated files
therefore contain explicit calls such as `api.registerTool(...)` and
`api.on("before_prompt_build", ...)` instead of dynamic loops.
