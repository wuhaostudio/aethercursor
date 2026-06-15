export interface PhaseZeroModule {
  readonly name: string;
  readonly description: string;
}

export const phaseZeroModules = [
  {
    name: "Input",
    description: "Activation, pointer events, and future gesture boundaries."
  },
  {
    name: "Overlay",
    description: "Transparent desktop surfaces for selection, menus, and results."
  },
  {
    name: "Capture",
    description: "Local context creation from explicit user-selected regions."
  },
  {
    name: "Policy",
    description: "Privacy levels, permission prompts, and cloud upload gates."
  },
  {
    name: "Router",
    description: "Intent-to-agent matching through manifest-declared capabilities."
  },
  {
    name: "Runtime",
    description: "Local, cloud, and mock agent execution behind one contract."
  }
] as const satisfies readonly PhaseZeroModule[];

export function getPhaseZeroModuleNames(): string[] {
  return phaseZeroModules.map((module) => module.name);
}
