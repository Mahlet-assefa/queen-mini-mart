import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const categories = ['Beverages', 'Dairy', 'Snacks', 'Household', 'Bakery'];
const products = [
  ['Bottled Water 500ml', 'Beverages', 0.3, 0.6, 80, 15],
  ['Orange Juice 1L', 'Beverages', 1.75, 2.6, 24, 8],
  ['Whole Milk 1L', 'Dairy', 1.1, 1.75, 18, 8],
  ['Plain Yogurt 500g', 'Dairy', 1.4, 2.2, 7, 6],
  ['Potato Chips 150g', 'Snacks', 0.95, 1.6, 32, 10],
  ['Dish Soap 750ml', 'Household', 2.1, 3.25, 9, 8],
  ['Sandwich Bread', 'Bakery', 1.2, 2.0, 14, 6],
] as const;
try {
  for (const name of categories)
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  for (const [
    name,
    category,
    purchasedPrice,
    sellingPrice,
    stockQuantity,
    minStockLevel,
  ] of products) {
    const existing = await prisma.product.findFirst({
      where: { name, category: { name: category } },
    });
    if (!existing)
      await prisma.product.create({
        data: {
          name,
          category: { connect: { name: category } },
          purchasedPrice,
          sellingPrice,
          stockQuantity,
          minStockLevel,
        },
      });
  }
  console.log('Seeded Queen Mart categories and sample products.');
} finally {
  await prisma.$disconnect();
}
