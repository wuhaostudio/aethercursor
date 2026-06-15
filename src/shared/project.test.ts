import { describe, expect, it } from "vitest";
import { getPhaseZeroModuleNames, phaseZeroModules } from "./project";

describe("phase zero module boundaries", () => {
  it("keeps the initial framework modules explicit", () => {
    expect(getPhaseZeroModuleNames()).toEqual([
      "Input",
      "Overlay",
      "Capture",
      "Policy",
      "Router",
      "Runtime"
    ]);
  });

  it("includes descriptions for the debug window", () => {
    expect(phaseZeroModules.every((module) => module.description.length > 20)).toBe(true);
  });
});
