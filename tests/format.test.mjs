import test from 'node:test';
import assert from 'node:assert/strict';
import { dateKey, money } from '../mini_mart/frontend/lib/inventory.ts';

test('money uses ETB suffix and activity dates use store time', () => {
  assert.equal(money(1234.5), '1,234.50 ETB');
  assert.equal(money(0), '0.00 ETB');
  assert.equal(dateKey('2026-11-04T22:00:00Z'), '2026-11-05');
});
