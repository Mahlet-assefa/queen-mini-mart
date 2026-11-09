export type User = {
  id: string;
  email: string;
  role: 'admin' | 'sales';
  mustChangePassword: boolean;
};
export type Category = { id: string; name: string; productCount: number };
export type Product = {
  id: string;
  name: string;
  itemCode: string | null;
  category: string;
  sellingPrice: number;
  purchasedPrice?: number;
  stockQuantity: number;
  minStockLevel: number;
};
export type Transaction = {
  id: string;
  date: string;
  type: 'ADD_STOCK' | 'SALE';
  quantity: number;
  unitPrice: number;
  unitCost?: number;
  name: string;
};
export type Order = {
  id: string;
  date: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  totalItems: number;
  items: { productName: string; quantity: number }[];
};
export type OrderClear = { clearedAt: string; orders: Order[] };
export type FinanceRow = { date: string; revenue: number; profit?: number };
export type Dashboard = {
  soldItems: number;
  netProfit: number;
  inventoryCount: number;
  categoryCount: number;
  lowStockCount: number;
  topSold: { name: string; quantity: number }[];
};
export const money = (value: number) =>
  `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0)} ETB`;
export const dateKey = (value: string | Date) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Addis_Ababa',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(new Date(value))
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
};
