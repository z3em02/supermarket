const { test, expect } = require('@playwright/test');
const { FIXTURES } = require('../env.cjs');
const db = require('../helpers/db.cjs');

// Poll the database for an OTP the backend just generated (email/phone/2FA).
const waitForOtp = async (read, arg) => {
  for (let i = 0; i < 20; i++) {
    const code = await read(arg);
    if (code) return code;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('OTP was not found in the database in time');
};

test.afterAll(async () => { await db.prisma.$disconnect().catch(() => {}); });

// One run through the whole customer + admin lifecycle in a real browser:
// register -> verify email + phone -> place an order -> admin accepts and
// marks it delivered. Replaces the manual "one full run" of the go-live
// checklist (README §4.9).
test('register -> order -> accept -> deliver', async ({ page }) => {
  const { customer, admin, product, driverName } = FIXTURES;

  // The first-visit legal-consent modal (components/LegalConsentModal.jsx)
  // overlays the storefront (fixed inset-0 z-50) and would intercept clicks on
  // /register and /shop. Mark it already accepted so it never renders.
  // addInitScript runs before the app's scripts on every navigation, so the
  // key (mirrors LegalConsentModal's STORAGE_KEY) is set before React reads it.
  await page.addInitScript(() => {
    try { localStorage.setItem('hajar.legalConsent.v1', '1'); } catch {}
  });

  // --- Register (step 1 of the register page) ---------------------------
  await test.step('register a new customer', async () => {
    await page.goto('/register');
    await page.fill('input[name="name"]', customer.name);
    await page.fill('input[name="phone"]', customer.phone);
    await page.fill('input[name="email"]', customer.email);
    await page.fill('input[name="password"]', customer.password);
    await page.fill('input[name="street"]', customer.street);
    await page.fill('input[name="houseNumber"]', customer.houseNumber);
    await page.fill('input[name="postalCode"]', customer.postalCode);
    await page.fill('input[name="city"]', customer.city);
    await page.click('button[type="submit"]'); // "Weiter zur Verifizierung"
    // Register moves to step 2 inline: the email-code input appears.
    await expect(page.locator('input[placeholder="123456"]').first()).toBeVisible({ timeout: 15_000 });
  });

  // --- Verify email + phone (codes read from the DB) --------------------
  await test.step('verify email', async () => {
    const code = await waitForOtp(db.emailOtp, customer.email); // generated at register
    await page.locator('input[placeholder="123456"]').first().fill(code);
    await page.getByRole('button', { name: /^Bestätigen$/ }).first().click();
    await expect(page.getByText(/Verifiziert/i).first()).toBeVisible();
  });

  await test.step('verify phone', async () => {
    // Phone code is only sent on request (WhatsApp); send it, then read it.
    await page.getByRole('button', { name: /Code per SMS senden|Erneut senden/i }).first().click();
    const code = await waitForOtp(db.phoneOtp, customer.email);
    // Email is verified now, so the remaining 123456 input is the phone one.
    await page.locator('input[placeholder="123456"]').first().fill(code);
    await page.getByRole('button', { name: /^Bestätigen$/ }).first().click();
    await expect(page.getByText(/Verifiziert/i).nth(1)).toBeVisible();
  });

  // --- Place an order ---------------------------------------------------
  await test.step('add the product to the cart and check out', async () => {
    await page.goto('/shop');
    await page.locator('button[title="In den Warenkorb"]').first().click();
    const placeOrder = page.getByRole('button', { name: /Jetzt verbindlich für Lieferung bestellen/i });
    // The cart drawer may auto-open on add; only click the cart button if not.
    if (!(await placeOrder.isVisible().catch(() => false))) {
      await page.getByRole('button', { name: 'Warenkorb', exact: true }).first().click();
    }
    // Wait for the offline distance/fee calculation to settle before ordering.
    await expect(page.getByText(/Berechne/i)).toBeHidden({ timeout: 15_000 }).catch(() => {});
    await placeOrder.click();
    await expect(page.getByText(/erfolgreich eingegangen/i)).toBeVisible({ timeout: 20_000 });
  });

  // --- Admin: log in (password + emailed 2FA), accept, deliver ----------
  const ADMIN = '/console-eb68a2f3';
  await test.step('admin logs in with 2FA', async () => {
    await page.goto(`${ADMIN}/login`);
    await page.fill('input[type="email"]', admin.email);
    await page.fill('input[type="password"]', admin.password);
    await page.click('button[type="submit"]'); // step 1: password -> sends 2FA code
    const code = await waitForOtp(db.adminTwoFactorOtp, admin.email);
    await page.locator('input[inputmode="numeric"]').fill(code);
    await page.click('button[type="submit"]'); // step 2: verify the code
    await expect(page).toHaveURL(new RegExp(`${ADMIN}/(dashboard|orders)`), { timeout: 15_000 });
  });

  await test.step('accept the order and mark it delivered', async () => {
    await page.goto(`${ADMIN}/orders`);
    // Accept the pending order -> opens the "assign driver" modal.
    await page.getByRole('button', { name: 'Annehmen', exact: true }).first().click();
    const modal = page.getByRole('dialog');
    await modal.getByLabel(/Fahrer/).selectOption(driverName);
    await modal.getByRole('button', { name: /Annehmen & zuweisen/ }).click();
    // Quick-actions step the status: accepted -> preparing -> out -> delivered.
    // The step buttons carry stable title attributes (their text alone is
    // ambiguous with the status-filter tabs).
    // exact:true so these match the card's action button, not the status-
    // filter tab of the same label (whose accessible name includes a count).
    await page.getByRole('button', { name: 'Wird vorbereitet', exact: true }).first().click();
    await page.getByRole('button', { name: 'Als in Zustellung markieren', exact: true }).first().click();
    await page.getByRole('button', { name: 'Als geliefert markieren', exact: true }).first().click();
    // Assert against the database — the single order reaches 'delivered'.
    await expect.poll(async () => {
      const order = await db.prisma.order.findFirst({ orderBy: { createdAt: 'desc' } });
      return order?.status;
    }, { timeout: 15_000 }).toBe('delivered');
  });
});
