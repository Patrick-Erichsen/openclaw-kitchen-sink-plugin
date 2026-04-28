import { registerAllHooks } from "./generated-hooks.js";
import { registerAllRegistrars } from "./generated-registrars.js";

export const plugin = {
  id: "openclaw-kitchen-sink-fixture",
  name: "OpenClaw Kitchen Sink",
  version: "0.1.3",
  description: "No-op plugin fixture covering OpenClaw plugin API seams.",
  register(api) {
    registerAllHooks(api);
    registerAllRegistrars(api);
  },
};

export function register(api) {
  plugin.register(api);
}

export default plugin;
