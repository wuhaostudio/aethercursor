export interface PhaseZeroModule {
  readonly name: string;
  readonly description: string;
}

export const phaseZeroModules = [
  {
    name: "输入模块",
    description: "激活方式、指针事件和未来手势边界。"
  },
  {
    name: "覆盖层",
    description: "用于选择、菜单和结果的透明桌面表面。"
  },
  {
    name: "捕获模块",
    description: "从用户明确选择的区域创建本地上下文。"
  },
  {
    name: "策略模块",
    description: "隐私级别、权限提示和云端上传门控。"
  },
  {
    name: "路由模块",
    description: "通过清单声明的能力进行意图到代理的匹配。"
  },
  {
    name: "运行时",
    description: "本地、云端和模拟代理执行遵循统一契约。"
  }
] as const satisfies readonly PhaseZeroModule[];

export function getPhaseZeroModuleNames(): string[] {
  return phaseZeroModules.map((module) => module.name);
}
