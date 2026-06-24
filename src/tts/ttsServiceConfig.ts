export interface TtsServiceConfig {
  readonly endpoint: string;
  readonly api_key: string;
  readonly voice: string;
  readonly rate: number;
  readonly pitch: number;
  readonly enabled: boolean;
}

const defaultConfig: TtsServiceConfig = {
  endpoint: "https://api.openai.com/v1/audio/speech",
  api_key: "",
  voice: "alloy",
  rate: 1.0,
  pitch: 1.0,
  enabled: false
};

let currentConfig: TtsServiceConfig = { ...defaultConfig };

export function getTtsServiceConfig(): TtsServiceConfig {
  return { ...currentConfig };
}

export function setTtsServiceConfig(partial: Partial<TtsServiceConfig>): TtsServiceConfig {
  const endpoint = partial.endpoint !== undefined ? partial.endpoint.trim() : currentConfig.endpoint;
  const apiKey = partial.api_key !== undefined ? partial.api_key.trim() : currentConfig.api_key;
  const voice = partial.voice !== undefined ? partial.voice.trim() : currentConfig.voice;
  const rate = partial.rate !== undefined ? partial.rate : currentConfig.rate;
  const pitch = partial.pitch !== undefined ? partial.pitch : currentConfig.pitch;
  const enabled = apiKey.length > 0;

  currentConfig = {
    endpoint,
    api_key: apiKey,
    voice,
    rate,
    pitch,
    enabled
  };

  return { ...currentConfig };
}

export function isCloudTtsAvailable(): boolean {
  return currentConfig.enabled && currentConfig.endpoint.length > 0 && currentConfig.api_key.length > 0;
}

export function isWebSpeechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function resetTtsServiceConfig(): void {
  currentConfig = { ...defaultConfig };
}
