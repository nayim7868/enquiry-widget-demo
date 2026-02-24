import { test, expect } from "@playwright/test";
import { generateTestEmail, generateTestMessage } from "./helpers";

test("public enquiry -> admin triage -> mark contacted", async ({ page }) => {
  const testEmail = generateTestEmail();
  const testMessage = generateTestMessage();
  const testName = "E2E Test User";

  // Step 1: Visit /contact and submit enquiry
  await page.goto("/contact");

  // Fill enquiry form (inputs are accessible by placeholder, not label)
  await page.getByPlaceholder("Your name").fill(testName);
  await page.getByPlaceholder("you@email.com").fill(testEmail);
  await page.getByPlaceholder("How can we help?").fill(testMessage);

  // Submit form
  await page.getByRole("button", { name: "Submit enquiry" }).click();

  // Wait for success message
  await expect(
    page.getByText("Thanks! Your enquiry has been submitted.")
  ).toBeVisible({ timeout: 10000 });

  // Step 2: Admin login
  await page.goto("/admin/login");

  // Use E2E_ADMIN_EMAIL first, fallback to ADMIN_EMAIL
  const adminEmail = process.env.E2E_ADMIN_EMAIL ?? process.env.ADMIN_EMAIL;
  const adminPassword = process.env.E2E_ADMIN_PASSWORD;

  if (!adminEmail) {
    throw new Error(
      "E2E_ADMIN_EMAIL (or ADMIN_EMAIL) is required for Playwright login.\n" +
      "PowerShell example:\n" +
      '  $env:E2E_ADMIN_EMAIL="nayimsalam118@gmail.com"\n' +
      "  npm run test:e2e"
    );
  }

  if (!adminPassword) {
    throw new Error(
      "E2E_ADMIN_PASSWORD is required for Playwright login.\n" +
      "PowerShell example:\n" +
      '  $env:E2E_ADMIN_PASSWORD="Bristol#2026"\n' +
      "  npm run test:e2e"
    );
  }

  // Fill login form
  await page.getByLabel("Email").fill(adminEmail);
  await page.getByLabel("Password").fill(adminPassword);

  // Wait for login API response before clicking (fail fast on auth errors)
  const loginResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/admin/login") &&
      response.request().method() === "POST"
  );

  // Click sign in
  await page.getByRole("button", { name: "Sign in" }).click();

  // Wait for and assert login API response
  const loginResponse = await loginResponsePromise;
  const loginResponseBody = await loginResponse.json().catch(() => ({}));

  if (!loginResponse.ok()) {
    const status = loginResponse.status();
    const errorMsg = loginResponseBody.error || "Unknown error";
    throw new Error(
      `Login API failed with status ${status}: ${errorMsg}. ` +
      `Check that ADMIN_EMAIL, ADMIN_PASSWORD_HASH_B64, and AUTH_SECRET are correctly configured. ` +
      `Password used: ${adminPassword.substring(0, 3)}*** (verify it matches the hash)`
    );
  }

  // Only after successful login, check redirect
  await expect(page).toHaveURL(/\/admin$/, { timeout: 10000 });
  await expect(page.getByRole("heading", { name: /Admin.*Enquiries/i })).toBeVisible();

  // Step 3: Find the newly created enquiry by email or message
  // Look for the enquiry row containing our test email or message
  // The table body contains the enquiry rows
  const enquiryRow = page
    .locator("tbody tr")
    .filter({ hasText: testEmail })
    .or(page.locator("tbody tr").filter({ hasText: testMessage }))
    .first();

  await expect(enquiryRow).toBeVisible({ timeout: 10000 });

  // Step 4: Change status to CONTACTED
  // Find the status select within this row (first select in the row is status)
  const statusSelect = enquiryRow.locator("select").first();

  // Verify initial status (should be NEW)
  await expect(statusSelect).toHaveValue("NEW");

  // Wait for PATCH request to complete when status changes
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/enquiries/") &&
      response.request().method() === "PATCH" &&
      response.status() === 200
  );

  // Change to CONTACTED
  await statusSelect.selectOption("CONTACTED");

  // Wait for the PATCH request to complete
  const response = await responsePromise;
  expect(response.ok()).toBe(true);

  // Step 5: Verify status is now CONTACTED
  await expect(statusSelect).toHaveValue("CONTACTED");

  // Also verify the row still contains our test data (confirms it's the right row)
  await expect(enquiryRow).toContainText(testEmail);
});
