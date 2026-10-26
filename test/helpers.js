import assert from "node:assert/strict";

/** Asserts that two numbers agree to a relative tolerance (default 1e-9). */
export function assertClose(actual, expected, rel = 1e-9, message) {
  const scale = Math.max(Math.abs(expected), Number.MIN_VALUE);
  assert.ok(
    Math.abs(actual - expected) / scale <= rel,
    message || `expected ${expected}, got ${actual} (relative tolerance ${rel})`,
  );
}

/** Values of a normative table (array of { value } rows), in table order. */
export const values = (rows) => rows.map((r) => r.value);
