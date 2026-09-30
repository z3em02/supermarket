-- The "Accounting" table goes. It was only ever filled when a declined order
-- was reactivated, so most orders had no row, and nothing read it: the
-- Accounting page, its totals and the CSV export all come from "Order"
-- (totalAmount, status, createdAt). Its rows only repeated an order's total
-- and status, so no information is lost.

-- DropForeignKey
ALTER TABLE "Accounting" DROP CONSTRAINT "Accounting_orderId_fkey";

-- DropTable
DROP TABLE "Accounting";
