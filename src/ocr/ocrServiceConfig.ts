export interface OcrServiceConfig {
  readonly endpoint: string;
  readonly api_key: string;
  readonly timeout_ms: number;
  readonly enabled: boolean;
}

const DEFAULT_ENDPOINT = "http://127.0.0.1:9003/ocr";
const DEFAULT_TIMEOUT_MS = 10000;

let runtimeConfig: OcrServiceConfig | null = null;

export function getOcrServiceConfig(): OcrServiceConfig {
  if (runtimeConfig) {
    return runtimeConfig;
  }

  const endpoint =
    (globalThis as unknown as { __AETHERCURSOR_OCR_ENDPOINT?: string }).__AETHERCURSOR_OCR_ENDPOINT ??
    DEFAULT_ENDPOINT;

  const api_key =
    (globalThis as unknown as { __AETHERCURSOR_OCR_API_KEY?: string }).__AETHERCURSOR_OCR_API_KEY ??
    "";

  const enabled = api_key.length > 0;

  return {
    endpoint,
    api_key,
    timeout_ms: DEFAULT_TIMEOUT_MS,
    enabled
  };
}

export function setOcrServiceConfig(config: Partial<OcrServiceConfig>): void {
  const current = getOcrServiceConfig();
  const merged = {
    ...current,
    ...config
  };
  runtimeConfig = {
    ...merged,
    enabled: merged.api_key.length > 0
  };
}

export function resetOcrServiceConfig(): void {
  runtimeConfig = null;
}

export function isOcrServiceAvailable(): boolean {
  const config = getOcrServiceConfig();
  return config.enabled && config.endpoint.length > 0 && config.api_key.length > 0;
}
