import { PrismaClient } from '@prisma/client';
import { emailInput } from './validation.mjs';
import { hashPassword, validPassword } from './password.mjs';

const email = emailInput(process.env.ADMIN_EMAIL || 'admin@queenmart.com');
const password = process.env.ADMIN_PASSWORD;
if (!email || !validPassword(password)) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (10–128 characters) before running db:admin.');
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const admins = await prisma.user.findMany({ where: { role: 'admin' } });
  if (admins.length > 1) throw new Error('More than one admin exists. Resolve that before setup.');
  const passwordHash = await hashPassword(password);
  if (admins.length) {
    await prisma.user.update({
      where: { id: admins[0].id },
      data: { email, passwordHash },
    });
  } else {
    await prisma.user.create({ data: { email, role: 'admin', passwordHash } });
  }
  console.log(`Admin account ready: ${email}`);
} finally {
  await prisma.$disconnect();
}
