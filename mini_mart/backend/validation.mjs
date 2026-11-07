export function emailInput(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}
export function productInput(body) {
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const category = typeof body?.category === 'string' ? body.category.trim() : '';
  const purchasedPrice = Number(body?.purchasedPrice);
  const sellingPrice = Number(body?.sellingPrice);
  const stockQuantity = Number(body?.stockQuantity);
  const minStockLevel = Number(body?.minStockLevel);
  return name &&
    category &&
    body.purchasedPrice !== '' &&
    body.sellingPrice !== '' &&
    [purchasedPrice, sellingPrice].every((x) => Number.isFinite(x) && x >= 0) &&
    [stockQuantity, minStockLevel].every((x) => Number.isInteger(x) && x >= 0)
    ? { name, category, purchasedPrice, sellingPrice, stockQuantity, minStockLevel }
    : null;
}
