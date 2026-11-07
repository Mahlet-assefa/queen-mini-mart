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
    category: 'Dairy',
    purchasedPrice: 1.2,
    sellingPrice: 2.5,
    stockQuantity: 8,
    minStockLevel: 3,
  });
  assert.equal(productInput({ ...input, stockQuantity: -1 }), null);
  assert.equal(productInput({ ...input, sellingPrice: '' }), null);
  assert.equal(productInput({ ...input, minStockLevel: 1.5 }), null);
});
