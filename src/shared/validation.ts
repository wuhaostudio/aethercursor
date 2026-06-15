export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly issues: readonly ValidationIssue[];
}

export type Validator<T> = (value: unknown) => value is T;

export function createValidationResult(issues: readonly ValidationIssue[]): ValidationResult {
  return {
    valid: issues.length === 0,
    issues
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasString(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === "string" && value[key].length > 0;
}

export function hasNullableString(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === "string" || value[key] === null;
}

export function hasBoolean(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === "boolean";
}

export function hasFiniteNumber(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === "number" && Number.isFinite(value[key]);
}

export function hasStringArray(value: Record<string, unknown>, key: string): boolean {
  const candidate = value[key];

  return Array.isArray(candidate) && candidate.every((item) => typeof item === "string");
}

export function pushRequiredIssue(
  issues: ValidationIssue[],
  condition: boolean,
  path: string,
  expected: string
): void {
  if (!condition) {
    issues.push({ path, message: `Expected ${expected}.` });
  }
}
