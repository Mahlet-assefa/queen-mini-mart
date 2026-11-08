import express from 'express';
import { PrismaClient } from '@prisma/client';
import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { emailInput, productInput } from './validation.mjs';
import { hashPassword, validPassword, verifyPassword } from './password.mjs';

const prisma = new PrismaClient();
const app = express();
app.use(express.json({ limit: '64kb' }));
const secret = process.env.SESSION_SECRET || randomBytes(32).toString('hex');
const run = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const sign = (value) => createHmac('sha256', secret).update(value).digest('hex');
const cookie = (req) =>
  Object.fromEntries((req.headers.cookie || '').split(';').map((part) => part.trim().split('=')));
const storeDayStart = () => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Addis_Ababa',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(new Date())
      .map((p) => [p.type, Number(p.value)]),
  );
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, -3));
};
const publicProduct = (p, role) => ({
  id: p.id,
  name: p.name,
  category: p.category.name,
  sellingPrice: Number(p.sellingPrice),
  ...(role === 'admin' ? { purchasedPrice: Number(p.purchasedPrice) } : {}),
  stockQuantity: p.stockQuantity,
  minStockLevel: p.minStockLevel,
});
const orderJson = (o) => ({
  id: o.id,
  date: o.orderDate,
  status: o.status,
  totalItems: o.totalItems,
  items: o.items.map((i) => ({ productName: i.productName, quantity: i.quantity })),
});
const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  mustChangePassword: user.mustChangePassword,
});

app.get(
  '/api/health',
  run(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  }),
);
app.post(
  '/api/auth/signup',
  run(async (req, res) => {
    const email = emailInput(req.body?.email);
    const password = req.body?.password;
    if (!email || !validPassword(password))
      return res
        .status(400)
        .json({ error: 'Enter a valid email and a password of 10–128 characters.' });
    const user = await prisma.user.create({
      data: { email, role: 'sales', passwordHash: await hashPassword(password) },
    });
    setSession(res, user);
    res.status(201).json(publicUser(user));
  }),
);
app.post(
  '/api/auth/signin',
  run(async (req, res) => {
    const email = emailInput(req.body?.email);
    const password = req.body?.password;
    if (!email || typeof password !== 'string' || !password)
      return res.status(400).json({ error: 'Enter your email and password.' });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash)))
      return res.status(401).json({ error: 'Invalid email or password.' });
    setSession(res, user);
    res.json(publicUser(user));
  }),
);
function setSession(res, user) {
  res.setHeader(
    'Set-Cookie',
    `qm_session=${user.id}.${sign(`${user.id}:${user.passwordHash}`)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
  );
}
app.post('/api/auth/signout', (_req, res) => {
  res.setHeader('Set-Cookie', 'qm_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
  res.status(204).end();
});
app.use(
  '/api',
  run(async (req, res, next) => {
    const [id, mac] = String(cookie(req).qm_session || '').split('.');
    if (!id || !mac || mac.length !== 64 || !/^[a-f0-9]{64}$/.test(mac))
      return res.status(401).json({ error: 'Sign in to continue.' });
    const user = await prisma.user.findUnique({ where: { id } });
    if (
      !user ||
      !timingSafeEqual(Buffer.from(mac), Buffer.from(sign(`${id}:${user.passwordHash}`)))
    )
      return res.status(401).json({ error: 'Session expired.' });
    req.user = user;
    if (user.mustChangePassword && !['/auth/me', '/auth/change-password'].includes(req.path))
      return res.status(403).json({ error: 'Change your password to continue.' });
    next();
  }),
);
app.get('/api/auth/me', (req, res) => res.json(publicUser(req.user)));
app.post(
  '/api/auth/change-password',
  run(async (req, res) => {
    const currentPassword = req.body?.currentPassword;
    const newPassword = req.body?.newPassword;
    if (typeof currentPassword !== 'string' || !currentPassword)
      return res.status(400).json({ error: 'Enter your current password.' });
    if (!validPassword(newPassword) || newPassword === currentPassword)
      return res.status(400).json({ error: 'Choose a different password of 10–128 characters.' });
    if (!(await verifyPassword(currentPassword, req.user.passwordHash)))
      return res.status(401).json({ error: 'Current password is incorrect.' });
    const passwordHash = await hashPassword(newPassword);
    const changed = await prisma.user.updateMany({
      where: { id: req.user.id, passwordHash: req.user.passwordHash },
      data: { passwordHash, mustChangePassword: false },
    });
    if (!changed.count)
      return res.status(409).json({ error: 'Password changed elsewhere. Sign in again.' });
    const user = { ...req.user, passwordHash, mustChangePassword: false };
    setSession(res, user);
    res.json(publicUser(user));
  }),
);
const admin = (req, res, next) =>
  req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Admin access required.' });
app.get(
  '/api/categories',
  run(async (req, res) => {
    const rows = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    res.json(rows.map((c) => ({ id: c.id, name: c.name, productCount: c._count.products })));
  }),
);
app.post(
  '/api/categories',
  run(async (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name || name.length > 80)
      return res.status(400).json({ error: 'Enter a category name of up to 80 characters.' });
    const existing = await prisma.category.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) return res.status(409).json({ error: 'That category already exists.' });
    const c = await prisma.category.create({ data: { name } });
    res.status(201).json({ id: c.id, name: c.name, productCount: 0 });
  }),
);
app.get(
  '/api/products',
  run(async (req, res) => {
    const rows = await prisma.product.findMany({
      include: { category: true },
      orderBy: { name: 'asc' },
    });
    res.json(rows.map((p) => publicProduct(p, req.user.role)));
  }),
);
app.post(
  '/api/products',
  run(async (req, res) => {
    const data = productInput(req.body);
    if (!data) return res.status(400).json({ error: 'Enter valid product details.' });
    const category = await prisma.category.findUnique({ where: { name: data.category } });
    if (!category) return res.status(400).json({ error: 'Choose a category.' });
    const p = await prisma.product.create({
      data: {
        name: data.name,
        categoryId: category.id,
        purchasedPrice: data.purchasedPrice,
        sellingPrice: data.sellingPrice,
        stockQuantity: data.stockQuantity,
        minStockLevel: data.minStockLevel,
      },
      include: { category: true },
    });
    res.status(201).json(publicProduct(p, req.user.role));
  }),
);
app.put(
  '/api/products/:id',
  admin,
  run(async (req, res) => {
    const current = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ error: 'Product not found.' });
    const data = productInput(
      { ...req.body, stockQuantity: current.stockQuantity },
      Number(current.purchasedPrice),
    );
    if (!data) return res.status(400).json({ error: 'Enter valid product details.' });
    const category = await prisma.category.findUnique({ where: { name: data.category } });
    if (!category) return res.status(400).json({ error: 'Choose a category.' });
    const p = await prisma.product.update({
      where: { id: current.id },
      data: {
        name: data.name,
        categoryId: category.id,
        purchasedPrice: data.purchasedPrice,
        sellingPrice: data.sellingPrice,
        minStockLevel: data.minStockLevel,
      },
      include: { category: true },
    });
    res.json(publicProduct(p, 'admin'));
  }),
);
app.delete(
  '/api/products/:id',
  admin,
  run(async (req, res) => {
    const result = await prisma.product.deleteMany({ where: { id: req.params.id } });
    res.status(result.count ? 204 : 404).end();
  }),
);
app.post(
  '/api/products/:id/movement',
  run(async (req, res) => {
    const quantity = Number(req.body?.quantity),
      type = req.body?.type;
    if (!Number.isInteger(quantity) || quantity <= 0 || !['ADD_STOCK', 'SALE'].includes(type))
      return res.status(400).json({ error: 'Enter a positive whole quantity.' });
    const result = await prisma.$transaction(async (tx) => {
      const p = await tx.product.findUnique({ where: { id: req.params.id } });
      if (!p) return { error: 'Product not found.', status: 404 };
      const updated = await tx.product.updateMany({
        where: { id: p.id, ...(type === 'SALE' ? { stockQuantity: { gte: quantity } } : {}) },
        data: { stockQuantity: { [type === 'SALE' ? 'decrement' : 'increment']: quantity } },
      });
      if (!updated.count) return { error: 'Not enough stock for this sale.', status: 409 };
      const totalAmount = Number(p.sellingPrice) * quantity,
        totalCost = Number(p.purchasedPrice) * quantity;
      await tx.transaction.create({
        data: {
          type,
          totalAmount,
          totalCost,
          items: {
            create: {
              productId: p.id,
              quantity,
              unitPrice: p.sellingPrice,
              unitCost: p.purchasedPrice,
            },
          },
        },
      });
      const current = await tx.product.findUnique({
        where: { id: p.id },
        select: { stockQuantity: true },
      });
      const stockQuantity = current.stockQuantity;
      return { stockQuantity, lowStock: type === 'SALE' && stockQuantity <= p.minStockLevel };
    });
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result);
  }),
);
app.get(
  '/api/transactions',
  run(async (req, res) => {
    // ponytail: loads full history for calendar and details; add date-range pagination when transaction volume grows.
    const rows = await prisma.transaction.findMany({
      where: req.user.role === 'sales' ? { type: 'SALE', createdAt: { gte: storeDayStart() } } : {},
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(
      rows.flatMap((t) =>
        t.items.map((i) => ({
          id: i.id,
          date: t.createdAt,
          type: t.type,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          ...(req.user.role === 'admin' ? { unitCost: Number(i.unitCost) } : {}),
          name: i.product.name,
        })),
      ),
    );
  }),
);
app.get(
  '/api/dashboard',
  admin,
  run(async (req, res) => {
    const [sales, products, categories] = await Promise.all([
      prisma.transaction.findMany({
        where: { type: 'SALE' },
        include: { items: { include: { product: true } } },
      }),
      prisma.product.findMany({ select: { stockQuantity: true, minStockLevel: true } }),
      prisma.category.count(),
    ]);
    const totals = new Map();
    for (const t of sales)
      for (const i of t.items)
        totals.set(i.product.name, (totals.get(i.product.name) || 0) + i.quantity);
    const topSold = [...totals]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, quantity]) => ({ name, quantity }));
    res.json({
      topSold,
      soldItems: sales.reduce((a, t) => a + t.items.reduce((n, i) => n + i.quantity, 0), 0),
      netProfit: sales.reduce((a, t) => a + Number(t.totalAmount) - Number(t.totalCost), 0),
      inventoryCount: products.reduce((a, p) => a + p.stockQuantity, 0),
      categoryCount: categories,
      lowStockCount: products.filter((p) => p.stockQuantity <= p.minStockLevel).length,
    });
  }),
);
app.get(
  '/api/finance',
  run(async (req, res) => {
    if (req.user.role === 'sales') {
      const sales = await prisma.transaction.aggregate({
        where: { type: 'SALE', createdAt: { gte: storeDayStart() } },
        _sum: { totalAmount: true },
      });
      return res.json([
        {
          date: new Date().toISOString().slice(0, 10),
          revenue: Number(sales._sum.totalAmount || 0),
        },
      ]);
    }
    const period = ['day', 'week', 'month', 'year'].includes(req.query.period)
      ? req.query.period
      : 'day';
    const config = {
      day: ['day', 'day', 0, 'day'],
      week: ['week', 'day', 6, 'day'],
      month: ['year', 'month', 11, 'month'],
      year: ['year', 'year', 0, 'year'],
    }[period];
    const [start, bucket, count, step] = config;
    const rows = await prisma.$queryRawUnsafe(`
    WITH first_day AS (SELECT date_trunc('${start}',now() AT TIME ZONE 'Africa/Addis_Ababa') AS start_at),
    buckets AS (SELECT generate_series(start_at,start_at + interval '${count} ${step}',interval '1 ${step}')::date AS date FROM first_day)
    SELECT b.date,COALESCE(SUM(t.total_amount),0)::float8 AS revenue,
      COALESCE(SUM(t.total_amount-t.total_cost),0)::float8 AS profit
    FROM buckets b LEFT JOIN qm_transactions t ON t.type='SALE'
      AND date_trunc('${bucket}',t.created_at AT TIME ZONE 'Africa/Addis_Ababa')::date=b.date
    GROUP BY b.date ORDER BY b.date`);
    res.json(rows);
  }),
);
app.get(
  '/api/orders',
  run(async (req, res) => {
    const rows = await prisma.order.findMany({
      where: { clearedAt: null },
      include: { items: true },
      orderBy: [{ orderDate: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(rows.map(orderJson));
  }),
);
app.get(
  '/api/orders/history',
  run(async (_req, res) => {
    const rows = await prisma.order.findMany({
      where: { clearedAt: { not: null } },
      include: { items: true },
      orderBy: [{ clearedAt: 'desc' }, { orderDate: 'desc' }],
    });
    const batches = new Map();
    for (const order of rows) {
      const clearedAt = order.clearedAt.toISOString();
      if (!batches.has(clearedAt)) batches.set(clearedAt, { clearedAt, orders: [] });
      batches.get(clearedAt).orders.push(orderJson(order));
    }
    res.json([...batches.values()]);
  }),
);
app.post(
  '/api/orders/clear',
  run(async (_req, res) => {
    const result = await prisma.order.updateMany({
      where: { clearedAt: null },
      data: { clearedAt: new Date(), status: 'COMPLETED' },
    });
    if (!result.count) return res.status(409).json({ error: 'There are no orders to clear.' });
    res.json({ cleared: result.count });
  }),
);
app.post(
  '/api/orders',
  run(async (req, res) => {
    const items = req.body?.items,
      date = req.body?.date;
    if (
      !Array.isArray(items) ||
      !items.length ||
      !items.every(
        (x) =>
          typeof x.productName === 'string' &&
          x.productName.trim() &&
          Number.isInteger(Number(x.quantity)) &&
          Number(x.quantity) > 0,
      ) ||
      !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date || '')
    )
      return res.status(400).json({ error: 'Add valid items and an order date.' });
    const o = await prisma.order.create({
      data: {
        orderDate: new Date(`${date}T00:00:00.000Z`),
        totalItems: items.reduce((s, x) => s + Number(x.quantity), 0),
        items: {
          create: items.map((x) => ({
            productName: x.productName.trim(),
            quantity: Number(x.quantity),
          })),
        },
      },
    });
    res.status(201).json({ id: o.id });
  }),
);
app.use((error, _req, res, _next) => {
  if (error.code === 'P2002') return res.status(409).json({ error: 'That record already exists.' });
  if (error.code === 'P2003')
    return res.status(409).json({ error: 'This record has related activity.' });
  if (error.code === 'P2023') return res.status(400).json({ error: 'Invalid identifier.' });
  console.error(error);
  res.status(500).json({ error: 'A server error occurred.' });
});
try {
  if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET)
    throw new Error('Set SESSION_SECRET before starting the production API.');
  await prisma.$connect();
  await prisma.category.count();
  await prisma.user.count();
  app.listen(Number(process.env.PORT || 4000), process.env.HOST || '127.0.0.1', () =>
    console.log('Queen Mart API ready'),
  );
} catch (error) {
  console.error('Could not start API. Check DATABASE_URL and run npm run db:migrate.', error);
  await prisma.$disconnect();
  process.exitCode = 1;
}
