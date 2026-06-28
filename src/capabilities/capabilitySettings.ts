import type { AgentManifest } from "../shared/agent";

export const CAPABILITY_SETTINGS_STORAGE_KEY = "aethercursor.enabledCapabilities";
export const DEFAULT_ENABLED_CAPABILITY_IDS: readonly string[] = ["agent.local.ocr"];

export interface CapabilitySetting {
  readonly manifest: AgentManifest;
  readonly enabled: boolean;
}

export function loadEnabledCapabilityIds(storage: Storage | null = getDefaultStorage()): readonly string[] {
  if (!storage) {
    return DEFAULT_ENABLED_CAPABILITY_IDS;
  }

  const raw = storage.getItem(CAPABILITY_SETTINGS_STORAGE_KEY);

  if (!raw) {
    return DEFAULT_ENABLED_CAPABILITY_IDS;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === "string" && id.length > 0)) {
      return DEFAULT_ENABLED_CAPABILITY_IDS;
    }

    return Array.from(new Set(parsed));
  } catch {
    return DEFAULT_ENABLED_CAPABILITY_IDS;
  }
}

export function saveEnabledCapabilityIds(
  enabledIds: readonly string[],
  storage: Storage | null = getDefaultStorage()
): readonly string[] {
  const uniqueIds = Array.from(new Set(enabledIds));

  if (storage) {
    storage.setItem(CAPABILITY_SETTINGS_STORAGE_KEY, JSON.stringify(uniqueIds));
  }

  return uniqueIds;
}

export function filterEnabledManifests(
  manifests: readonly AgentManifest[],
  enabledIds: readonly string[]
): readonly AgentManifest[] {
  const enabledSet = new Set(enabledIds);
  return manifests.filter((manifest) => enabledSet.has(manifest.id));
}

export function createCapabilitySettings(
  manifests: readonly AgentManifest[],
  enabledIds: readonly string[]
): readonly CapabilitySetting[] {
  const enabledSet = new Set(enabledIds);

  return manifests.map((manifest) => ({
    manifest,
    enabled: enabledSet.has(manifest.id)
  }));
}

export function toggleCapabilityId(enabledIds: readonly string[], id: string): readonly string[] {
  if (enabledIds.includes(id)) {
    return enabledIds.filter((enabledId) => enabledId !== id);
  }

  return [...enabledIds, id];
}

function getDefaultStorage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}
