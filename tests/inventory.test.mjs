import test from 'node:test';
import assert from 'node:assert/strict';
import { emailInput, productInput } from '../mini_mart/backend/validation.mjs';

test('email and product input validation', () => {
  assert.equal(emailInput(' Admin@QueenMart.com '), 'admin@queenmart.com');
  assert.equal(emailInput('invalid'), '');
  const input = {
    name: ' Milk ',
    category: 'Dairy',
    purchasedPrice: '1.2',
    sellingPrice: '2.5',
    stockQuantity: '8',
    minStockLevel: '3',
  };
  assert.deepEqual(productInput(input), {
    name: 'Milk',
    itemCode: null,
    category: 'Dairy',
    purchasedPrice: 1.2,
    sellingPrice: 2.5,
    stockQuantity: 8,
    minStockLevel: 3,
  });
  assert.equal(productInput({ ...input, stockQuantity: -1 }), null);
  assert.equal(productInput({ ...input, purchasedPrice: '' })?.purchasedPrice, 0);
  assert.equal(productInput({ ...input, purchasedPrice: undefined })?.purchasedPrice, 0);
  assert.equal(productInput({ ...input, purchasedPrice: '' }, 1.2)?.purchasedPrice, 1.2);
  assert.equal(productInput({ ...input, purchasedPrice: -1 }), null);
  assert.equal(productInput({ ...input, itemCode: ' milk-01 ' })?.itemCode, 'MILK-01');
  assert.equal(productInput({ ...input, itemCode: 'x'.repeat(65) }), null);
  assert.equal(productInput({ ...input, sellingPrice: '' }), null);
  assert.equal(productInput({ ...input, minStockLevel: 1.5 }), null);
});
