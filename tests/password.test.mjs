import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, validPassword, verifyPassword } from '../mini_mart/backend/password.mjs';

test('password hashes verify without storing the password', async () => {
  const password = 'a-long-password';
  const hash = await hashPassword(password);
  assert.equal(hash.includes(password), false);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword('wrong-password', hash), false);
  assert.equal(await verifyPassword(password, null), false);
  assert.equal(validPassword('short'), false);
  assert.equal(validPassword(password), true);
});
