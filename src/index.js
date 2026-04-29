import { registerAllHooks } from "./generated-hooks.js";
import { registerAllRegistrars } from "./generated-registrars.js";
import { registerKitchenSinkRuntime } from "./kitchen-runtime.js";

export const plugin = {
  id: "openclaw-kitchen-sink-fixture",
  name: "OpenClaw Kitchen Sink",
  version: "0.1.5",
  description: "Credential-free fixture covering OpenClaw plugin API seams.",
  register(api) {
    registerAllHooks(api);
    registerAllRegistrars(api);
    registerKitchenSinkRuntime(api);
  },
};

export function register(api) {
  plugin.register(api);
}

export default plugin;
