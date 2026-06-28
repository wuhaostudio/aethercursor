import { describe, expect, it } from "vitest";
import type { AgentManifest } from "../shared/agent";
import {
  CAPABILITY_SETTINGS_STORAGE_KEY,
  createCapabilitySettings,
  filterEnabledManifests,
  loadEnabledCapabilityIds,
  saveEnabledCapabilityIds,
  toggleCapabilityId
} from "./capabilitySettings";

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => {
      values.set(key, value);
    }
  };
}

function createManifest(id: string, name: string): AgentManifest {
  return {
    id,
    name,
    version: "0.1.0",
    description: name,
    capabilities: ["extract_text"],
    input_types: ["screen_region"],
    output_types: ["plain_text"],
    execution_mode: id.includes("cloud") ? "cloud" : "local",
    latency_level: "short",
    cost_level: "none",
    required_permissions: [],
    privacy_policy: {
      requires_upload: id.includes("cloud"),
      sensitive_data_allowed: true,
      user_confirmation: id.includes("cloud") ? "first_time" : "never"
    }
  };
}

const manifests = [
  createManifest("agent.local.ocr", "OCR"),
  createManifest("agent.cloud.explain", "Explain")
] as const;

describe("capability settings", () => {
  it("defaults to local OCR without requiring startup setup", () => {
    expect(loadEnabledCapabilityIds(createMemoryStorage())).toEqual(["agent.local.ocr"]);
  });

  it("loads and deduplicates persisted capability ids", () => {
    const storage = createMemoryStorage();
    storage.setItem(CAPABILITY_SETTINGS_STORAGE_KEY, JSON.stringify(["agent.local.ocr", "agent.local.ocr"]));

    expect(loadEnabledCapabilityIds(storage)).toEqual(["agent.local.ocr"]);
  });

  it("saves enabled capability ids", () => {
    const storage = createMemoryStorage();

    saveEnabledCapabilityIds(["agent.cloud.explain"], storage);

    expect(loadEnabledCapabilityIds(storage)).toEqual(["agent.cloud.explain"]);
  });

  it("filters manifests to enabled capabilities", () => {
    expect(filterEnabledManifests(manifests, ["agent.cloud.explain"]).map((manifest) => manifest.id)).toEqual([
      "agent.cloud.explain"
    ]);
  });

  it("creates settings rows for all manifests", () => {
    expect(createCapabilitySettings(manifests, ["agent.local.ocr"])).toEqual([
      { manifest: manifests[0], enabled: true },
      { manifest: manifests[1], enabled: false }
    ]);
  });

  it("toggles capability ids", () => {
    expect(toggleCapabilityId(["agent.local.ocr"], "agent.cloud.explain")).toEqual([
      "agent.local.ocr",
      "agent.cloud.explain"
    ]);
    expect(toggleCapabilityId(["agent.local.ocr"], "agent.local.ocr")).toEqual([]);
  });
});
