/**
 * Test helpers for E2E tests
 */

export function generateTestEmail(): string {
  return `pw-${Date.now()}@example.com`;
}

export function generateTestMessage(): string {
  return `Test enquiry message ${Date.now()}`;
}
