export interface CloudServiceConfig {
  readonly endpoint: string;
  readonly api_key: string;
  readonly model: string;
  readonly timeout_ms: number;
  readonly enabled: boolean;
}

const defaultConfig: CloudServiceConfig = {
  endpoint: "https://api.openai.com/v1/chat/completions",
  api_key: "",
  model: "gpt-4o-mini",
  timeout_ms: 10000,
  enabled: false
};

let runtimeConfig: CloudServiceConfig | null = null;

export function getCloudServiceConfig(): CloudServiceConfig {
  if (runtimeConfig) {
    return { ...runtimeConfig };
  }

  const globals = globalThis as unknown as {
    __AETHERCURSOR_CLOUD_ENDPOINT?: string;
    __AETHERCURSOR_CLOUD_API_KEY?: string;
    __AETHERCURSOR_CLOUD_MODEL?: string;
    __AETHERCURSOR_CLOUD_TIMEOUT_MS?: number;
  };
  const apiKey = globals.__AETHERCURSOR_CLOUD_API_KEY?.trim() ?? defaultConfig.api_key;

  return {
    endpoint: globals.__AETHERCURSOR_CLOUD_ENDPOINT?.trim() ?? defaultConfig.endpoint,
    api_key: apiKey,
    model: globals.__AETHERCURSOR_CLOUD_MODEL?.trim() ?? defaultConfig.model,
    timeout_ms: globals.__AETHERCURSOR_CLOUD_TIMEOUT_MS ?? defaultConfig.timeout_ms,
    enabled: apiKey.length > 0
  };
}

export function setCloudServiceConfig(partial: Partial<CloudServiceConfig>): CloudServiceConfig {
  const currentConfig = getCloudServiceConfig();
  const endpoint = partial.endpoint !== undefined ? partial.endpoint.trim() : currentConfig.endpoint;
  const apiKey = partial.api_key !== undefined ? partial.api_key.trim() : currentConfig.api_key;
  const model = partial.model !== undefined ? partial.model.trim() : currentConfig.model;
  const timeoutMs = partial.timeout_ms !== undefined ? partial.timeout_ms : currentConfig.timeout_ms;
  const enabled = apiKey.length > 0;

  runtimeConfig = {
    endpoint,
    api_key: apiKey,
    model,
    timeout_ms: timeoutMs,
    enabled
  };

  return { ...runtimeConfig };
}

export function isCloudServiceAvailable(): boolean {
  const currentConfig = getCloudServiceConfig();
  return currentConfig.enabled && currentConfig.endpoint.length > 0 && currentConfig.api_key.length > 0;
}

export function resetCloudServiceConfig(): void {
  runtimeConfig = null;
}
