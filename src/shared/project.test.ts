import { describe, expect, it } from "vitest";
import { getPhaseZeroModuleNames, phaseZeroModules } from "./project";

describe("phase zero module boundaries", () => {
  it("keeps the initial framework modules explicit", () => {
    expect(getPhaseZeroModuleNames()).toEqual([
      "输入模块",
      "覆盖层",
      "捕获模块",
      "策略模块",
      "路由模块",
      "运行时"
    ]);
  });

  it("includes descriptions for the debug window", () => {
    expect(phaseZeroModules.every((module) => module.description.length > 5)).toBe(true);
  });
});
