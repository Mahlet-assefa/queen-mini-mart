import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
export const validPassword = (password) =>
  typeof password === 'string' && password.length >= 10 && password.length <= 128;

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await derive(password, salt, 64);
  return `scrypt$${salt}$${hash.toString('hex')}`;
}

export async function verifyPassword(password, encoded) {
  const [method, salt, hex] = (encoded || '').split('$');
  if (
    method !== 'scrypt' ||
    !/^[a-f0-9]{32}$/.test(salt || '') ||
    !/^[a-f0-9]{128}$/.test(hex || '')
  )
    return false;
  const hash = await derive(password, salt, 64);
  return timingSafeEqual(hash, Buffer.from(hex, 'hex'));
}
