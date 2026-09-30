// The order flows against a real Postgres database, through the real server
// (routes, auth, controllers, transactions): placing, changing and cancelling
// orders, and what each does to stock, totals and coupon usage. Every test
// starts from empty tables. Setup and safety rules: ./harness.cjs.
//
// Keep database tests in this one file (or give another file its own
// database): node --test runs files in parallel, and every test empties the
// tables.
const { describe, test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const h = require('./harness.cjs');
const { roundMoney } = require('../../utils/money');

describe('order flows (database)', { skip: h.skipReason || false }, () => {
  let server;
  let api;
  let admin;
  let adminAuth;

  const stockOf = async (product) => (await h.prisma.product.findUnique({ where: { id: product.id } })).stock;
  const orderById = (id) => h.prisma.order.findUnique({ where: { id }, include: { orderItems: true } });
  const placeOrder = (token, items, extra = {}) =>
    api('POST', '/api/orders', { token, body: { items: items.map(([product, quantity]) => ({ productId: product.id, quantity })), ...extra } });
  const setStatus = (id, status, extra = {}, token = adminAuth) =>
    api('PUT', `/api/orders/${id}/status`, { token, body: { status, ...extra } });

  before(async () => {
    h.migrateDatabase();
    server = await h.startServer();
    api = h.client(server.base);
  });

  after(async () => {
    server?.stop();
    await h.prisma?.$disconnect();
  });

  beforeEach(async () => {
    await h.resetDatabase();
    await h.seedStore();
    admin = await h.createAdmin();
    adminAuth = h.adminToken(admin);
  });

  describe('placing an order', () => {
    test('takes the items out of stock and stores DB prices and consistent totals', async () => {
      const milk = await h.createProduct({ name: 'Milch 1L', price: 2.5, stock: 10 });
      const bread = await h.createProduct({ name: 'Brot', price: 1.2, stock: 5 });
      const customer = await h.createCustomer();

      // A client-sent price is ignored; the DB price counts.
      const res = await api('POST', '/api/orders', {
        token: h.customerToken(customer),
        body: { items: [{ productId: milk.id, quantity: 2, price: 0.01 }, { productId: bread.id, quantity: 3 }] }
      });
      assert.strictEqual(res.status, 201, JSON.stringify(res.body));

      assert.strictEqual(await stockOf(milk), 8);
      assert.strictEqual(await stockOf(bread), 2);
      const order = await orderById(res.body.id);
      assert.strictEqual(order.status, 'pending');
      assert.strictEqual(order.customerId, customer.id);
      assert.strictEqual(order.itemsSubtotal, 8.6); // 2 × 2.50 + 3 × 1.20
      assert.ok(order.deliveryFee > 0, 'a delivery fee is charged below the free-delivery threshold');
      assert.strictEqual(order.totalAmount, roundMoney(order.itemsSubtotal + order.deliveryFee));
      assert.deepStrictEqual(
        order.orderItems.map((i) => [i.productId, i.quantity, i.price]).sort(),
        [[milk.id, 2, 2.5], [bread.id, 3, 1.2]].sort()
      );
      // The customer snapshot is encrypted at rest.
      assert.ok(order.customerName.startsWith('enc:v1:'));
      assert.strictEqual(res.body.customerName, customer.name);
    });

    test('more than the stock is refused, and nothing changes', async () => {
      const milk = await h.createProduct({ name: 'Milch 1L', price: 2.5, stock: 1 });
      const customer = await h.createCustomer();
      const res = await placeOrder(h.customerToken(customer), [[milk, 2]]);
      assert.strictEqual(res.status, 400);
      assert.match(res.body.error, /Insufficient stock/);
      assert.strictEqual(await stockOf(milk), 1);
      assert.strictEqual(await h.prisma.order.count(), 0);
    });

    // Ten at once, so several read "3 in stock" before any has taken one:
    // only the atomic decrement inside the transaction (decrementStockOrThrow)
    // stops overselling then. With two requests, whether they overlap
    // depends on timing, and the earlier plain stock check can hide a bug.
    test('ten customers racing for the last three items: exactly three get one', async () => {
      const milk = await h.createProduct({ name: 'Milch 1L', price: 2.5, stock: 3 });
      const customers = [];
      for (let i = 0; i < 10; i++) customers.push(await h.createCustomer());
      const results = await Promise.all(customers.map((c) => placeOrder(h.customerToken(c), [[milk, 1]])));
      const statuses = results.map((r) => r.status);
      assert.strictEqual(statuses.filter((s) => s === 201).length, 3, `statuses: ${statuses}`);
      assert.strictEqual(statuses.filter((s) => s === 400).length, 7, `statuses: ${statuses}`);
      assert.strictEqual(await stockOf(milk), 0);
      assert.strictEqual(await h.prisma.order.count(), 3);
    });

    test('a coupon lowers the total, counts as used, and works only once per customer', async () => {
      const milk = await h.createProduct({ name: 'Milch 1L', price: 5, stock: 10 });
      const customer = await h.createCustomer();
      const coupon = await h.createCoupon({ code: 'SAVE10', discountType: 'PERCENTAGE', discountValue: 10 });
      const token = h.customerToken(customer);

      const first = await placeOrder(token, [[milk, 2]], { couponCode: 'save10' });
      assert.strictEqual(first.status, 201, JSON.stringify(first.body));
      const order = await orderById(first.body.id);
      assert.strictEqual(order.itemsSubtotal, 10);
      assert.strictEqual(order.couponDiscount, 1);
      assert.strictEqual(order.couponCode, 'SAVE10');
      assert.strictEqual(order.totalAmount, roundMoney(10 - 1 + order.deliveryFee));
      assert.strictEqual((await h.prisma.coupon.findUnique({ where: { id: coupon.id } })).usedCount, 1);
      assert.strictEqual(await h.prisma.couponUsage.count({ where: { couponId: coupon.id, customerId: customer.id } }), 1);

      const second = await placeOrder(token, [[milk, 2]], { couponCode: 'SAVE10' });
      assert.strictEqual(second.status, 400);
      assert.strictEqual(await stockOf(milk), 8, 'the refused order took no stock');
      assert.strictEqual((await h.prisma.coupon.findUnique({ where: { id: coupon.id } })).usedCount, 1);
    });

    test('maintenance mode blocks customer orders but not an admin taking a phone order', async () => {
      await h.prisma.storeSettings.update({ where: { id: 'default' }, data: { maintenanceMode: true } });
      const milk = await h.createProduct({ name: 'Milch 1L', price: 2.5, stock: 10 });
      const customer = await h.createCustomer();

      const byCustomer = await placeOrder(h.customerToken(customer), [[milk, 1]]);
      assert.strictEqual(byCustomer.status, 503);
      assert.strictEqual(await stockOf(milk), 10);

      const byAdmin = await placeOrder(adminAuth, [[milk, 1]], { customerId: customer.id });
      assert.strictEqual(byAdmin.status, 201, JSON.stringify(byAdmin.body));
      assert.strictEqual(await stockOf(milk), 9);
    });

    test('a customer without a verified phone number cannot order', async () => {
      const milk = await h.createProduct({ name: 'Milch 1L', price: 2.5, stock: 10 });
      const customer = await h.createCustomer({ phoneVerified: false });
      const res = await placeOrder(h.customerToken(customer), [[milk, 1]]);
      assert.strictEqual(res.status, 403);
      assert.strictEqual(await stockOf(milk), 10);
      assert.strictEqual(await h.prisma.order.count(), 0);
    });
  });

  describe('changing the status', () => {
    test('declining gives stock and the coupon back; reactivating takes the stock again', async () => {
      const milk = await h.createProduct({ name: 'Milch 1L', price: 5, stock: 10 });
      const customer = await h.createCustomer();
      const coupon = await h.createCoupon();
      const placed = await placeOrder(h.customerToken(customer), [[milk, 3]], { couponCode: 'SAVE10' });
      assert.strictEqual(placed.status, 201, JSON.stringify(placed.body));
      assert.strictEqual(await stockOf(milk), 7);

      const declined = await setStatus(placed.body.id, 'declined');
      assert.strictEqual(declined.status, 200, JSON.stringify(declined.body));
      assert.strictEqual((await orderById(placed.body.id)).status, 'declined');
      assert.strictEqual(await stockOf(milk), 10);
      assert.strictEqual((await h.prisma.coupon.findUnique({ where: { id: coupon.id } })).usedCount, 0);
      assert.strictEqual(await h.prisma.couponUsage.count(), 0);

      const reopened = await setStatus(placed.body.id, 'pending');
      assert.strictEqual(reopened.status, 200, JSON.stringify(reopened.body));
      assert.strictEqual(await stockOf(milk), 7);
    });

    test('reactivating fails cleanly when the stock is gone by now', async () => {
      const milk = await h.createProduct({ name: 'Milch 1L', price: 2.5, stock: 2 });
      const customer = await h.createCustomer();
      const placed = await placeOrder(h.customerToken(customer), [[milk, 2]]);
      await setStatus(placed.body.id, 'declined');
      assert.strictEqual(await stockOf(milk), 2);
      // Meanwhile one was sold elsewhere.
      await h.prisma.product.update({ where: { id: milk.id }, data: { stock: 1 } });

      const res = await setStatus(placed.body.id, 'accepted');
      assert.strictEqual(res.status, 400);
      assert.strictEqual((await orderById(placed.body.id)).status, 'declined');
      assert.strictEqual(await stockOf(milk), 1);
    });

    test('a change based on an outdated view is refused (409) and changes nothing', async () => {
      const milk = await h.createProduct({ name: 'Milch 1L', price: 2.5, stock: 10 });
      const customer = await h.createCustomer();
      const placed = await placeOrder(h.customerToken(customer), [[milk, 1]]);

      const res = await setStatus(placed.body.id, 'accepted', { expectedUpdatedAt: '2000-01-01T00:00:00.000Z' });
      assert.strictEqual(res.status, 409);
      assert.strictEqual(res.body.code, 'STALE_ORDER');
      assert.strictEqual((await orderById(placed.body.id)).status, 'pending');
    });

    test('only allowed status changes go through (a delivered order stays delivered)', async () => {
      const milk = await h.createProduct({ name: 'Milch 1L', price: 2.5, stock: 10 });
      const customer = await h.createCustomer();
      const placed = await placeOrder(h.customerToken(customer), [[milk, 1]]);
      await h.prisma.order.update({ where: { id: placed.body.id }, data: { status: 'delivered' } });

      const back = await setStatus(placed.body.id, 'pending');
      assert.strictEqual(back.status, 400);
      assert.strictEqual(back.body.code, 'INVALID_STATUS_CHANGE');
      const synonym = await setStatus(placed.body.id, 'shipped');
      assert.strictEqual(synonym.status, 400, 'old synonyms no longer exist');
      assert.strictEqual((await orderById(placed.body.id)).status, 'delivered');
      assert.strictEqual(await stockOf(milk), 9);
      // Correcting a mis-click one step back is allowed.
      assert.strictEqual((await setStatus(placed.body.id, 'out_for_delivery')).status, 200);
      // A status filter that doesn't exist is a 400, not a server error.
      assert.strictEqual((await api('GET', '/api/orders?page=1&status=shipped', { token: adminAuth })).status, 400);
    });

    test('a driver can only move their own orders forward', async () => {
      const milk = await h.createProduct({ name: 'Milch 1L', price: 2.5, stock: 10 });
      const customer = await h.createCustomer();
      const ali = await h.createDriver('Ali');
      await h.createDriver('Berta');
      const mine = await placeOrder(h.customerToken(customer), [[milk, 1]]);
      const theirs = await placeOrder(h.customerToken(customer), [[milk, 1]]);
      await h.prisma.order.update({ where: { id: mine.body.id }, data: { status: 'accepted', assignedDriverName: 'Ali' } });
      await h.prisma.order.update({ where: { id: theirs.body.id }, data: { status: 'accepted', assignedDriverName: 'Berta' } });

      assert.strictEqual((await setStatus(mine.body.id, 'out_for_delivery', {}, ali)).status, 200);
      assert.strictEqual((await orderById(mine.body.id)).status, 'out_for_delivery');
      assert.strictEqual((await setStatus(mine.body.id, 'declined', {}, ali)).status, 403, 'drivers cannot decline');
      assert.strictEqual((await setStatus(theirs.body.id, 'out_for_delivery', {}, ali)).status, 404, "another driver's order");
      assert.strictEqual((await orderById(theirs.body.id)).status, 'accepted');
      assert.strictEqual(await stockOf(milk), 8);
    });
  });

  describe('admin customer management (/api/customers)', () => {
    test('lists and counts customers; deleting one keeps their orders, unlinked (§ 132 BAO)', async () => {
      const milk = await h.createProduct({ name: 'Milch 1L', price: 2.5, stock: 10 });
      const keep = await h.createCustomer();
      const gone = await h.createCustomer();
      const placed = await placeOrder(h.customerToken(gone), [[milk, 1]]);

      const list = await api('GET', '/api/customers', { token: adminAuth });
      assert.strictEqual(list.status, 200, JSON.stringify(list.body));
      assert.deepStrictEqual(list.body.map((c) => c.id).sort(), [keep.id, gone.id].sort());
      assert.deepStrictEqual((await api('GET', '/api/customers/count', { token: adminAuth })).body, { total: 2 });

      assert.strictEqual((await api('GET', '/api/customers', { token: h.customerToken(keep) })).status, 403, 'customers cannot list customers');

      const del = await api('DELETE', `/api/customers/${gone.id}`, { token: adminAuth });
      assert.strictEqual(del.status, 200, JSON.stringify(del.body));
      assert.strictEqual(await h.prisma.customer.count({ where: { id: gone.id } }), 0);
      const order = await orderById(placed.body.id);
      assert.ok(order, 'the order stays for the tax records');
      assert.strictEqual(order.customerId, null);
      assert.ok(order.customerName.startsWith('enc:v1:'), 'its encrypted order-time snapshot stays');
    });
  });

  describe('editing an order and the customer answer', () => {
    // Milk ×3, bread ×1 → admin edit: milk ×1, bread removed, eggs ×2.
    const placeAndEdit = async ({ coupon = false } = {}) => {
      const milk = await h.createProduct({ name: 'Milch 1L', price: 5, stock: 10 });
      const bread = await h.createProduct({ name: 'Brot', price: 2, stock: 5 });
      const eggs = await h.createProduct({ name: 'Eier 10 Stk', price: 4, stock: 3 });
      const customer = await h.createCustomer();
      if (coupon) await h.createCoupon();
      const placed = await placeOrder(h.customerToken(customer), [[milk, 3], [bread, 1]], coupon ? { couponCode: 'SAVE10' } : {});
      assert.strictEqual(placed.status, 201, JSON.stringify(placed.body));
      const before = await orderById(placed.body.id);

      const edited = await api('PUT', `/api/orders/${placed.body.id}/edit`, {
        token: adminAuth,
        body: {
          items: [{ productId: milk.id, quantity: 1 }, { productId: eggs.id, quantity: 2 }],
          modificationReason: 'Brot ist ausverkauft',
          expectedUpdatedAt: before.updatedAt
        }
      });
      assert.strictEqual(edited.status, 200, JSON.stringify(edited.body));
      return { milk, bread, eggs, customer, id: placed.body.id, before };
    };

    test('an admin edit moves stock by the difference and waits for the customer', async () => {
      const { milk, bread, eggs, id, before } = await placeAndEdit();
      assert.strictEqual(await stockOf(milk), 9); // 10 − 3 + 2
      assert.strictEqual(await stockOf(bread), 5); // given back
      assert.strictEqual(await stockOf(eggs), 1); // 3 − 2
      const order = await orderById(id);
      assert.strictEqual(order.status, 'pending_customer_approval');
      assert.strictEqual(order.modificationReason, 'Brot ist ausverkauft');
      assert.strictEqual(order.originalTotalAmount, before.totalAmount);
      assert.strictEqual(order.itemsSubtotal, 13); // 1 × 5 + 2 × 4
      assert.strictEqual(order.totalAmount, roundMoney(13 + order.deliveryFee));
      assert.deepStrictEqual(order.orderItems.map((i) => [i.productId, i.quantity]).sort(), [[milk.id, 1], [eggs.id, 2]].sort());
    });

    test('the customer accepts the edit: accepted, stock stays as edited', async () => {
      const { milk, eggs, customer, id } = await placeAndEdit();
      const res = await api('PUT', `/api/orders/${id}/customer-response`, { token: h.customerToken(customer), body: { action: 'accept' } });
      assert.strictEqual(res.status, 200, JSON.stringify(res.body));
      assert.strictEqual((await orderById(id)).status, 'accepted');
      assert.strictEqual(await stockOf(milk), 9);
      assert.strictEqual(await stockOf(eggs), 1);
    });

    test('the customer declines the edit: cancelled, all stock and the coupon given back', async () => {
      const { milk, bread, eggs, customer, id } = await placeAndEdit({ coupon: true });
      const res = await api('PUT', `/api/orders/${id}/customer-response`, { token: h.customerToken(customer), body: { action: 'decline' } });
      assert.strictEqual(res.status, 200, JSON.stringify(res.body));
      assert.strictEqual((await orderById(id)).status, 'declined');
      assert.deepStrictEqual([await stockOf(milk), await stockOf(bread), await stockOf(eggs)], [10, 5, 3]);
      const coupon = await h.prisma.coupon.findUnique({ where: { code: 'SAVE10' } });
      assert.strictEqual(coupon.usedCount, 0);
      assert.strictEqual(await h.prisma.couponUsage.count(), 0);
    });

    test("another customer can't answer the edit", async () => {
      const { id } = await placeAndEdit();
      const stranger = await h.createCustomer();
      const res = await api('PUT', `/api/orders/${id}/customer-response`, { token: h.customerToken(stranger), body: { action: 'decline' } });
      assert.strictEqual(res.status, 403);
      assert.strictEqual((await orderById(id)).status, 'pending_customer_approval');
    });
  });
});
