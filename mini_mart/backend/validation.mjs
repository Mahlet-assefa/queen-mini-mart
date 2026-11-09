export function emailInput(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}
export function productInput(body, defaultPurchasePrice = 0) {
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const itemCode = typeof body?.itemCode === 'string' ? body.itemCode.trim().toUpperCase() : '';
  const category = typeof body?.category === 'string' ? body.category.trim() : '';
  const purchasedPrice =
    body?.purchasedPrice === '' || body?.purchasedPrice == null
      ? defaultPurchasePrice
      : Number(body.purchasedPrice);
  const sellingPrice = Number(body?.sellingPrice);
  const stockQuantity = Number(body?.stockQuantity);
  const minStockLevel = Number(body?.minStockLevel);
  return name &&
    itemCode.length <= 64 &&
    category &&
    body.sellingPrice !== '' &&
    [purchasedPrice, sellingPrice].every((x) => Number.isFinite(x) && x >= 0) &&
    [stockQuantity, minStockLevel].every((x) => Number.isInteger(x) && x >= 0)
    ? {
        name,
        itemCode: itemCode || null,
        category,
        purchasedPrice,
        sellingPrice,
        stockQuantity,
        minStockLevel,
      }
    : null;
}
