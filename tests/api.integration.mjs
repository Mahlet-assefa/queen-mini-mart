import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const base = process.env.API_URL || 'http://127.0.0.1:4000/api';
let session = '';
async function request(path, method = 'GET', body) {
  const response = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(session ? { Cookie: session } : {}) },
    body: body && JSON.stringify(body),
  });
  const cookie = response.headers.get('set-cookie');
  if (cookie) session = cookie.split(';')[0];
  return { status: response.status, data: response.status === 204 ? null : await response.json() };
}
async function authenticate(email, password, action) {
  const result = await request(`/auth/${action}`, 'POST', { email, password });
  assert.equal(result.status, action === 'signup' ? 201 : 200);
  return result.data;
}
test('dashboard, product, stock, finance, calendar, orders and role boundaries', async () => {
  assert.equal((await request('/health')).status, 200);
  await authenticate('admin@queenmart.com', process.env.TEST_ADMIN_PASSWORD, 'signin');
  const category = (await request('/categories')).data[0].name;
  const name = `Integration ${randomUUID().slice(0, 8)}`;
  const product = await request('/products', 'POST', {
    name,
    category,
    purchasedPrice: 1,
    sellingPrice: 3,
    stockQuantity: 3,
    minStockLevel: 2,
  });
  assert.equal(product.status, 201);
  const id = product.data.id;
  const disposable = await request('/products', 'POST', {
    name: `Disposable ${randomUUID().slice(0, 8)}`,
    category,
    purchasedPrice: 1,
    sellingPrice: 2,
    stockQuantity: 1,
    minStockLevel: 1,
  });
  assert.equal(disposable.status, 201);
  const changed = await request(`/products/${disposable.data.id}`, 'PUT', {
    name: 'Edited product',
    category,
    purchasedPrice: 1.5,
    sellingPrice: 2.5,
    minStockLevel: 3,
  });
  assert.equal(changed.status, 200);
  assert.equal(changed.data.name, 'Edited product');
  assert.equal((await request(`/products/${disposable.data.id}`, 'DELETE')).status, 204);
  assert.equal((await request('/dashboard')).data.inventoryCount >= 3, true);
  const restock = await request(`/products/${id}/movement`, 'POST', {
    type: 'ADD_STOCK',
    quantity: 2,
  });
  assert.equal(restock.status, 200);
  assert.equal(restock.data.stockQuantity, 5);
  const sale = await request(`/products/${id}/movement`, 'POST', { type: 'SALE', quantity: 4 });
  assert.equal(sale.status, 200);
  assert.equal(sale.data.stockQuantity, 1);
  assert.equal(sale.data.lowStock, true);
  assert.equal(
    (await request(`/products/${id}/movement`, 'POST', { type: 'SALE', quantity: 2 })).status,
    409,
  );
  assert.equal((await request('/products')).data.find((p) => p.id === id).stockQuantity, 1);
  const activity = await request('/transactions');
  assert.equal(activity.status, 200);
  assert.equal(
    activity.data.some((t) => t.name === name && t.type === 'ADD_STOCK'),
    true,
  );
  assert.equal(
    activity.data.some((t) => t.name === name && t.type === 'SALE'),
    true,
  );
  for (const [period, count] of [
    ['day', 1],
    ['week', 7],
    ['month', 12],
    ['year', 1],
  ]) {
    const finance = await request(`/finance?period=${period}`);
    assert.equal(finance.status, 200);
    assert.equal(finance.data.length, count);
    assert.equal(finance.data.reduce((sum, row) => sum + row.revenue, 0) >= 12, true);
    assert.equal(finance.data.reduce((sum, row) => sum + row.profit, 0) >= 8, true);
  }
  const order = await request('/orders', 'POST', {
    date: new Date().toISOString().slice(0, 10),
    items: [{ productName: name, quantity: 5 }],
  });
  assert.equal(order.status, 201);
  assert.equal(
    (await request('/orders')).data.some((o) => o.id === order.data.id),
    true,
  );
  assert.equal((await request('/orders/clear', 'POST')).status, 200);
  assert.deepEqual((await request('/orders')).data, []);
  const history = await request('/orders/history');
  assert.equal(history.status, 200);
  assert.equal(history.data[0].orders.find((o) => o.id === order.data.id).status, 'COMPLETED');
  assert.equal((await request('/orders/clear', 'POST')).status, 409);
  const nextOrder = await request('/orders', 'POST', {
    date: new Date().toISOString().slice(0, 10),
    items: [{ productName: name, quantity: 1 }],
  });
  assert.equal(nextOrder.status, 201);
  assert.equal((await request('/orders')).data.length, 1);
  const email = `test-${randomUUID()}@example.com`;
  await authenticate(email, 'integration-password-123', 'signup');
  assert.equal((await request('/dashboard')).status, 403);
  assert.equal(
    (await request('/products')).data.find((p) => p.id === id).purchasedPrice,
    undefined,
  );
  assert.equal(
    (
      await request('/products', 'POST', {
        name: 'Unauthorized',
        category,
        purchasedPrice: 1,
        sellingPrice: 2,
        stockQuantity: 1,
        minStockLevel: 1,
      })
    ).status,
    403,
  );
  const cash = await request('/finance');
  assert.equal(cash.status, 200);
  assert.equal(cash.data[0].revenue >= 12, true);
  assert.equal(cash.data[0].profit, undefined);
  assert.equal(
    (await request('/transactions')).data.find((t) => t.name === name).unitCost,
    undefined,
  );
  assert.equal(
    (await request(`/products/${id}/movement`, 'POST', { type: 'ADD_STOCK', quantity: 2 })).status,
    200,
  );
});
