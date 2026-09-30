-- Order statuses become a fixed list (enum "OrderStatus"; allowed changes
-- between them: backend/utils/orderStatus.js).
--
-- Hand-written: the SQL Prisma generates for this change drops the "status"
-- column and adds it back, which would reset every order to 'pending'. This
-- converts the column in place instead.

-- 1. Stop, changing nothing, if an order has a status that is neither one of
--    the seven nor a known synonym: better to map it by hand than to guess.
DO $$
DECLARE unknown_statuses TEXT;
BEGIN
  SELECT string_agg(DISTINCT "status", ', ') INTO unknown_statuses
  FROM "Order"
  WHERE "status" NOT IN (
    'pending', 'pending_customer_approval', 'accepted', 'preparing',
    'out_for_delivery', 'delivered', 'declined',
    'shipped', 'rejected', 'canceled', 'cancelled', 'decline', 'confirmed', 'completed'
  );
  IF unknown_statuses IS NOT NULL THEN
    RAISE EXCEPTION 'Orders have statuses this migration does not know: %. Change them to one of the seven statuses, then run the migration again.', unknown_statuses;
  END IF;
END $$;

-- 2. Synonyms become the status they meant.
UPDATE "Order" SET "status" = 'out_for_delivery' WHERE "status" = 'shipped';
UPDATE "Order" SET "status" = 'declined' WHERE "status" IN ('rejected', 'canceled', 'cancelled', 'decline');
UPDATE "Order" SET "status" = 'accepted' WHERE "status" = 'confirmed';
UPDATE "Order" SET "status" = 'delivered' WHERE "status" = 'completed';

-- 3. Convert the column in place; every value is kept and the existing
--    "Order_status_idx" index is rebuilt automatically.
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'pending_customer_approval', 'accepted', 'preparing', 'out_for_delivery', 'delivered', 'declined');
ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus" USING ("status"::"OrderStatus");
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'pending';
