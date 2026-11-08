DELETE FROM qm_categories AS category
WHERE category.name IN ('Beverages', 'Dairy', 'Snacks', 'Household', 'Bakery')
  AND NOT EXISTS (SELECT 1 FROM qm_products WHERE category_id = category.id);
