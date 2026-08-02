export const SHORT_VIN_PATTERN = /^[A-Z0-9]{6}$/;
export const FULL_VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{6,17}$/;

export function normalizeCarIdentifier(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}
