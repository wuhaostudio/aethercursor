import {
  createValidationResult,
  hasBoolean,
  hasFiniteNumber,
  hasNullableString,
  hasString,
  hasStringArray,
  isRecord,
  pushRequiredIssue,
  type ValidationIssue,
  type ValidationResult
} from "./validation";

export const contextTypes = [
  "text",
  "ocr_text",
  "image_region",
  "screen_region",
  "app_metadata"
] as const;

export type ContextType = (typeof contextTypes)[number];

export interface ContextSource {
  readonly app_name: string | null;
  readonly window_title: string | null;
  readonly url: string | null;
}

export interface SelectionBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ContextSelection {
  readonly type: ContextType;
  readonly bounds: SelectionBounds;
  readonly display_scale: number;
}

export interface ContextContent {
  readonly selected_text: string | null;
  readonly ocr_text: string | null;
  readonly image_ref: string | null;
}

export interface ContextMetadata {
  readonly language: string;
  readonly content_guess: readonly string[];
  readonly confidence: number;
}

export interface ContextPrivacy {
  readonly cloud_allowed: boolean;
  readonly contains_sensitive_guess: boolean;
  readonly user_confirmed_upload: boolean;
}

export interface ContextProtocol {
  readonly context_id: string;
  readonly created_at: string;
  readonly source: ContextSource;
  readonly selection: ContextSelection;
  readonly content: ContextContent;
  readonly metadata: ContextMetadata;
  readonly privacy: ContextPrivacy;
}

export function validateContextProtocol(value: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return createValidationResult([{ path: "$", message: "Expected object." }]);
  }

  pushRequiredIssue(issues, hasString(value, "context_id"), "$.context_id", "non-empty string");
  pushRequiredIssue(issues, hasString(value, "created_at"), "$.created_at", "date-time string");

  validateSource(value.source, issues);
  validateSelection(value.selection, issues);
  validateContent(value.content, issues);
  validateMetadata(value.metadata, issues);
  validatePrivacy(value.privacy, issues);

  return createValidationResult(issues);
}

export function isContextProtocol(value: unknown): value is ContextProtocol {
  return validateContextProtocol(value).valid;
}

function validateSource(value: unknown, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path: "$.source", message: "Expected object." });
    return;
  }

  pushRequiredIssue(issues, hasNullableString(value, "app_name"), "$.source.app_name", "string or null");
  pushRequiredIssue(
    issues,
    hasNullableString(value, "window_title"),
    "$.source.window_title",
    "string or null"
  );
  pushRequiredIssue(issues, hasNullableString(value, "url"), "$.source.url", "string or null");
}

function validateSelection(value: unknown, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path: "$.selection", message: "Expected object." });
    return;
  }

  pushRequiredIssue(
    issues,
    contextTypes.includes(value.type as ContextType),
    "$.selection.type",
    "known context type"
  );
  pushRequiredIssue(
    issues,
    hasFiniteNumber(value, "display_scale") && Number(value.display_scale) > 0,
    "$.selection.display_scale",
    "positive number"
  );
  validateBounds(value.bounds, issues);
}

function validateBounds(value: unknown, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path: "$.selection.bounds", message: "Expected object." });
    return;
  }

  pushRequiredIssue(issues, hasFiniteNumber(value, "x"), "$.selection.bounds.x", "number");
  pushRequiredIssue(issues, hasFiniteNumber(value, "y"), "$.selection.bounds.y", "number");
  pushRequiredIssue(
    issues,
    hasFiniteNumber(value, "width") && Number(value.width) >= 0,
    "$.selection.bounds.width",
    "non-negative number"
  );
  pushRequiredIssue(
    issues,
    hasFiniteNumber(value, "height") && Number(value.height) >= 0,
    "$.selection.bounds.height",
    "non-negative number"
  );
}

function validateContent(value: unknown, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path: "$.content", message: "Expected object." });
    return;
  }

  pushRequiredIssue(
    issues,
    hasNullableString(value, "selected_text"),
    "$.content.selected_text",
    "string or null"
  );
  pushRequiredIssue(issues, hasNullableString(value, "ocr_text"), "$.content.ocr_text", "string or null");
  pushRequiredIssue(issues, hasNullableString(value, "image_ref"), "$.content.image_ref", "string or null");
}

function validateMetadata(value: unknown, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path: "$.metadata", message: "Expected object." });
    return;
  }

  pushRequiredIssue(issues, hasString(value, "language"), "$.metadata.language", "non-empty string");
  pushRequiredIssue(
    issues,
    hasStringArray(value, "content_guess"),
    "$.metadata.content_guess",
    "string array"
  );
  pushRequiredIssue(
    issues,
    hasFiniteNumber(value, "confidence") && Number(value.confidence) >= 0 && Number(value.confidence) <= 1,
    "$.metadata.confidence",
    "number from 0 to 1"
  );
}

function validatePrivacy(value: unknown, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path: "$.privacy", message: "Expected object." });
    return;
  }

  pushRequiredIssue(issues, hasBoolean(value, "cloud_allowed"), "$.privacy.cloud_allowed", "boolean");
  pushRequiredIssue(
    issues,
    hasBoolean(value, "contains_sensitive_guess"),
    "$.privacy.contains_sensitive_guess",
    "boolean"
  );
  pushRequiredIssue(
    issues,
    hasBoolean(value, "user_confirmed_upload"),
    "$.privacy.user_confirmed_upload",
    "boolean"
  );
}
