/** Types for scripts/check-guest-flags.mjs (used by tests/unit/launch-flags.test.ts). */
export const GUARDED_FLAGS: readonly string[];
export function stripJsonComments(text: string): string;
export function flagProblems(vars: Record<string, unknown> | undefined, where: string): string[];
export function checkGuestFlags(input: { wranglerJsonc: string; builtJson?: string }): string[];
