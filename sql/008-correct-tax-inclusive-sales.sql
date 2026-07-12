-- Product prices and sales detail line amounts include IGV.
-- Rebuild historical sale headers so reports and receipts use the amount
-- actually represented by their detail lines as the final customer total.
WITH sale_totals AS (
  SELECT
    id_venta,
    ROUND(SUM(subtotal), 2) AS total_including_igv
  FROM ventas_detalle
  GROUP BY id_venta
), corrected AS (
  SELECT
    id_venta,
    total_including_igv,
    ROUND(total_including_igv / 1.18, 2) AS value_without_igv
  FROM sale_totals
)
UPDATE ventas AS sale
SET
  total = corrected.total_including_igv,
  subtotal = corrected.value_without_igv,
  igv = corrected.total_including_igv - corrected.value_without_igv
FROM corrected
WHERE sale.id = corrected.id_venta
  AND (
    sale.total IS DISTINCT FROM corrected.total_including_igv
    OR sale.subtotal IS DISTINCT FROM corrected.value_without_igv
    OR sale.igv IS DISTINCT FROM corrected.total_including_igv - corrected.value_without_igv
  );
