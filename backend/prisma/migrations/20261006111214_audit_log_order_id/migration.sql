-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "orderId" TEXT;

-- CreateIndex
CREATE INDEX "AuditLog_orderId_idx" ON "AuditLog"("orderId");

-- Backfill orderId for existing per-order audit rows by matching the short
-- order code ("#" + first 8 chars, upper-cased) their detail text carries.
-- Best-effort for legacy rows; new rows store orderId directly. If two orders
-- share an 8-char prefix a row could match both (the ambiguity this change
-- removes going forward) — index first so the join is cheap.
UPDATE "AuditLog" a
SET "orderId" = o.id
FROM "Order" o
WHERE a."orderId" IS NULL
  AND a.action IN ('UPDATE_ORDER_STATUS', 'EDIT_ORDER', 'ASSIGN_ORDER_DRIVER')
  AND a.detail LIKE '%#' || UPPER(LEFT(o.id, 8)) || '%';
