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

let currentConfig: CloudServiceConfig = { ...defaultConfig };

export function getCloudServiceConfig(): CloudServiceConfig {
  return { ...currentConfig };
}

export function setCloudServiceConfig(partial: Partial<CloudServiceConfig>): CloudServiceConfig {
  const endpoint = partial.endpoint !== undefined ? partial.endpoint.trim() : currentConfig.endpoint;
  const apiKey = partial.api_key !== undefined ? partial.api_key.trim() : currentConfig.api_key;
  const model = partial.model !== undefined ? partial.model.trim() : currentConfig.model;
  const timeoutMs = partial.timeout_ms !== undefined ? partial.timeout_ms : currentConfig.timeout_ms;
  const enabled = apiKey.length > 0;

  currentConfig = {
    endpoint,
    api_key: apiKey,
    model,
    timeout_ms: timeoutMs,
    enabled
  };

  return { ...currentConfig };
}

export function isCloudServiceAvailable(): boolean {
  return currentConfig.enabled && currentConfig.endpoint.length > 0 && currentConfig.api_key.length > 0;
}

export function resetCloudServiceConfig(): void {
  currentConfig = { ...defaultConfig };
}
