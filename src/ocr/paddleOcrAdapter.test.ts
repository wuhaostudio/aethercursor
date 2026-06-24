import { describe, it, expect, beforeEach } from "vitest";
import {
  extractOcrText,
  executePaddleOcrAgent,
  recognizeOcrFromImage,
  type OcrRecognitionResult
} from "./paddleOcrAdapter";
import { setOcrServiceConfig, resetOcrServiceConfig } from "./ocrServiceConfig";
import { sampleContext } from "../shared/fixtures";
import type { AgentManifest } from "../shared/agent";

const mockOcrManifest: AgentManifest = {
  id: "agent.local.ocr",
  name: "Local OCR",
  version: "0.1.0",
  description: "Test OCR manifest",
  capabilities: ["extract_text"],
  input_types: ["screen_region"],
  output_types: ["ocr_text"],
  execution_mode: "local",
  latency_level: "short",
  cost_level: "none",
  required_permissions: ["screen_region_read"],
  privacy_policy: {
    requires_upload: false,
    sensitive_data_allowed: true,
    user_confirmation: "never"
  }
};

describe("paddleOcrAdapter", () => {
  beforeEach(() => {
    resetOcrServiceConfig();
  });

  describe("extractOcrText", () => {
    it("joins multiple results with newlines", () => {
      const results: OcrRecognitionResult[] = [
        { text: "Hello", confidence: 0.95 },
        { text: "World", confidence: 0.92 }
      ];
      expect(extractOcrText(results)).toBe("Hello\nWorld");
    });

    it("returns empty string for empty results", () => {
      expect(extractOcrText([])).toBe("");
    });

    it("handles single result", () => {
      const results: OcrRecognitionResult[] = [
        { text: "Single line", confidence: 0.99 }
      ];
      expect(extractOcrText(results)).toBe("Single line");
    });
  });

  describe("recognizeOcrFromImage", () => {
    it("sends request to configured endpoint", async () => {
      const mockBlob = new Blob(["fake-image-data"], { type: "image/bmp" });
      let capturedUrl = "";

      const mockFetch = async (input: RequestInfo | URL) => {
        capturedUrl = typeof input === "string" ? input : input.toString();
        return new Response(
          JSON.stringify({
            status: "success",
            results: [{ text: "Test OCR result", confidence: 0.95 }]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      const results = await recognizeOcrFromImage(mockBlob, {
        endpoint: "http://test-ocr:9003/ocr",
        api_key: "test-api-key",
        fetchImpl: mockFetch as unknown as typeof fetch
      });

      expect(capturedUrl).toBe("http://test-ocr:9003/ocr");
      expect(results).toHaveLength(1);
      expect(results[0].text).toBe("Test OCR result");
      expect(results[0].confidence).toBe(0.95);
    });

    it("throws on non-200 response", async () => {
      const mockBlob = new Blob(["fake"], { type: "image/bmp" });
      const mockFetch = async () => {
        return new Response("Internal Server Error", { status: 500 });
      };

      await expect(
        recognizeOcrFromImage(mockBlob, {
          endpoint: "http://test:9003/ocr",
          api_key: "key",
          fetchImpl: mockFetch as unknown as typeof fetch
        })
      ).rejects.toThrow(/500/);
    });

    it("throws on error status in response", async () => {
      const mockBlob = new Blob(["fake"], { type: "image/bmp" });
      const mockFetch = async () => {
        return new Response(
          JSON.stringify({
            status: "error",
            message: "Invalid image format"
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      await expect(
        recognizeOcrFromImage(mockBlob, {
          endpoint: "http://test:9003/ocr",
          api_key: "key",
          fetchImpl: mockFetch as unknown as typeof fetch
        })
      ).rejects.toThrow("Invalid image format");
    });
  });

  describe("executePaddleOcrAgent", () => {
    it("returns error when OCR service is not configured", async () => {
      const context = sampleContext;
      const result = await executePaddleOcrAgent({
        manifest: mockOcrManifest,
        context,
        intent: "extract_text"
      });

      expect(result.status).toBe("error");
      expect(result.error?.code).toBe("ocr_service_disabled");
    });

    it("returns error when no image ref in context", async () => {
      setOcrServiceConfig({ api_key: "test-key" });
      const context = {
        ...sampleContext,
        content: {
          ...sampleContext.content,
          image_ref: null
        }
      };
      const result = await executePaddleOcrAgent({
        manifest: mockOcrManifest,
        context,
        intent: "extract_text"
      });

      expect(result.status).toBe("error");
      expect(result.error?.code).toBe("no_image");
    });

    it("returns success with OCR text when service is available", async () => {
      setOcrServiceConfig({ api_key: "test-key" });
      const context = {
        ...sampleContext,
        content: {
          ...sampleContext.content,
          image_ref: "local://capture/test.bmp"
        }
      };

      const mockBlob = new Blob(["fake-image"], { type: "image/bmp" });
      const mockReadImage = async () => mockBlob;
      const mockFetch = async () => {
        return new Response(
          JSON.stringify({
            status: "success",
            results: [
              { text: "Hello World", confidence: 0.95 },
              { text: "Second line", confidence: 0.9 }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      const result = await executePaddleOcrAgent(
        {
          manifest: mockOcrManifest,
          context,
          intent: "extract_text"
        },
        {
          fetchImpl: mockFetch as unknown as typeof fetch,
          readImageFile: mockReadImage
        }
      );

      expect(result.status).toBe("success");
      expect(result.output.text).toBe("Hello World\nSecond line");
      expect(result.output.ocr_text).toBe("Hello World\nSecond line");
      expect(result.runtime.model).toBe("paddleocr-local");
      expect(result.privacy.uploaded).toBe(false);
    });

    it("returns error when image file read fails", async () => {
      setOcrServiceConfig({ api_key: "test-key" });
      const context = {
        ...sampleContext,
        content: {
          ...sampleContext.content,
          image_ref: "local://capture/test.bmp"
        }
      };

      const mockReadImage = async () => null;

      const result = await executePaddleOcrAgent(
        {
          manifest: mockOcrManifest,
          context,
          intent: "extract_text"
        },
        {
          readImageFile: mockReadImage
        }
      );

      expect(result.status).toBe("error");
      expect(result.error?.code).toBe("image_read_failed");
    });
  });
});
