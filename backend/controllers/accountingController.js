const prisma = require('../lib/prisma');
const { CUSTOMER_PUBLIC_SELECT } = require('../utils/serialize');
const { logAudit } = require('../lib/auditLog');
const { decryptCustomerPII, decrypt } = require('../utils/piiCrypto');

// Orders carry their own encrypted customer* snapshot columns (see
// GDPR_DATA_POLICY.md), plus the joined `customer` relation which also
// holds encrypted fields — decrypt both before any of it is read.
const withDecryptedOrder = (ord) => ({
  ...ord,
  customerName: 'customerName' in ord ? decrypt(ord.customerName) : ord.customerName,
  customerPhone: 'customerPhone' in ord ? decrypt(ord.customerPhone) : ord.customerPhone,
  customerEmail: 'customerEmail' in ord ? decrypt(ord.customerEmail) : ord.customerEmail,
  deliveryAddress: 'deliveryAddress' in ord ? decrypt(ord.deliveryAddress) : ord.deliveryAddress,
  deliveryNotes: 'deliveryNotes' in ord ? decrypt(ord.deliveryNotes) : ord.deliveryNotes,
  customer: ord.customer ? decryptCustomerPII(ord.customer) : ord.customer
});

const parseValidDate = (str) => {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

const getAccountingSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      if (startDate) {
        const start = parseValidDate(startDate);
        if (!start) return res.status(400).json({ error: 'Invalid startDate format' });
        dateFilter.createdAt = { ...dateFilter.createdAt, gte: start };
      }
      if (endDate) {
        const end = parseValidDate(endDate);
        if (!end) return res.status(400).json({ error: 'Invalid endDate format' });
        dateFilter.createdAt = { ...dateFilter.createdAt, lte: end };
      }
      if (dateFilter.createdAt?.gte && dateFilter.createdAt?.lte && dateFilter.createdAt.gte > dateFilter.createdAt.lte) {
        return res.status(400).json({ error: 'startDate cannot be after endDate' });
      }
    }

    // Valid non-declined orders
    const validOrders = (await prisma.order.findMany({
      where: {
        status: { notIn: ['declined', 'rejected', 'canceled', 'cancelled'] },
        ...dateFilter
      },
      include: {
        customer: { select: CUSTOMER_PUBLIC_SELECT }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })).map(withDecryptedOrder);

    // Total revenue sum
    const totalRevenueAmount = validOrders.reduce((sum, ord) => sum + (Number(ord.totalAmount) || 0), 0);
    const totalOrdersCount = validOrders.length;

    const pendingOrdersCount = await prisma.order.count({
      where: {
        status: 'pending',
        ...dateFilter
      }
    });

    // Top-Kunden aggregation (grouped by customer)
    const customerMap = {};
    for (const ord of validOrders) {
      const key = ord.customerId || ord.customerEmail || ord.customerPhone || ord.customerName || 'Gast';
      const displayName = ord.customer?.name || ord.customerName || ord.customerEmail || 'Kunde';
      const phone = ord.customer?.phone || ord.customerPhone || '';
      const email = ord.customer?.email || ord.customerEmail || '';

      if (!customerMap[key]) {
        customerMap[key] = {
          customerId: ord.customerId || key,
          customerName: displayName,
          customerPhone: phone,
          customerEmail: email,
          totalSales: 0,
          orderCount: 0
        };
      }
      customerMap[key].totalSales += Number(ord.totalAmount) || 0;
      customerMap[key].orderCount += 1;
    }

    const customerSales = Object.values(customerMap).sort((a, b) => b.totalSales - a.totalSales);

    // Monthly revenue grouping
    const monthlyRevenueGrouped = validOrders.reduce((acc, ord) => {
      const date = new Date(ord.createdAt);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!acc[month]) {
        acc[month] = { month, total_revenue: 0, transaction_count: 0 };
      }
      acc[month].total_revenue += Number(ord.totalAmount) || 0;
      acc[month].transaction_count += 1;
      return acc;
    }, {});

    const monthlyRevenueArray = Object.values(monthlyRevenueGrouped)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);

    // Recent transactions formatted for frontend table
    const recentTransactions = validOrders.slice(0, 20).map(ord => ({
      id: ord.id,
      orderId: ord.id,
      customerName: ord.customer?.name || ord.customerName || 'Kunde',
      customerPhone: ord.customer?.phone || ord.customerPhone || '',
      type: 'Barzahlung',
      amount: ord.totalAmount,
      status: ord.status,
      transactionDate: ord.createdAt,
      order: ord
    }));

    res.json({
      summary: {
        totalRevenue: totalRevenueAmount,
        totalOrders: totalOrdersCount,
        pendingOrders: pendingOrdersCount,
        totalTransactions: totalOrdersCount
      },
      customerSales,
      monthlyRevenue: monthlyRevenueArray,
      recentTransactions
    });
  } catch (error) {
    console.error('Get accounting summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getAccountingRecords = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    // #15 fix: cap limit between 1 and 200 to prevent DoS via huge result sets
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 20));

    const where = {};
    if (status) where.status = status;

    const orders = (await prisma.order.findMany({
      where,
      include: {
        customer: { select: CUSTOMER_PUBLIC_SELECT }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (parsedPage - 1) * parsedLimit,
      take: parsedLimit
    })).map(withDecryptedOrder);

    const total = await prisma.order.count({ where });

    const records = orders.map(ord => ({
      id: ord.id,
      orderId: ord.id,
      type: 'sale',
      amount: ord.totalAmount,
      status: ord.status,
      transactionDate: ord.createdAt,
      order: ord
    }));

    res.json({
      records,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    console.error('Get accounting records error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const exportAccountingData = async (req, res) => {
  try {
    const { startDate, endDate, format = 'csv' } = req.query;
    logAudit(req.admin?.email, 'EXPORT_ACCOUNTING', `format=${format}${startDate ? ` range=${startDate}..${endDate}` : ''}`);

    const dateFilter = {};
    // #14 fix: validate date strings
    if (startDate || endDate) {
      if (startDate) {
        const start = parseValidDate(startDate);
        if (!start) return res.status(400).json({ error: 'Invalid startDate format' });
        dateFilter.createdAt = { ...dateFilter.createdAt, gte: start };
      }
      if (endDate) {
        const end = parseValidDate(endDate);
        if (!end) return res.status(400).json({ error: 'Invalid endDate format' });
        dateFilter.createdAt = { ...dateFilter.createdAt, lte: end };
      }
      if (dateFilter.createdAt?.gte && dateFilter.createdAt?.lte && dateFilter.createdAt.gte > dateFilter.createdAt.lte) {
        return res.status(400).json({ error: 'startDate cannot be after endDate' });
      }
    }

    const orders = (await prisma.order.findMany({
      where: {
        status: { notIn: ['declined', 'rejected', 'canceled', 'cancelled'] },
        ...dateFilter
      },
      include: {
        customer: { select: CUSTOMER_PUBLIC_SELECT }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })).map(withDecryptedOrder);

    if (format === 'csv') {
      // Finding 3.4 fix: Sanitize cells against CSV / Spreadsheet formula injection
      const sanitizeCsvCell = (val) => {
        const str = String(val ?? '');
        const safeStr = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
        return `"${safeStr.replace(/"/g, '""')}"`;
      };

      const csvHeader = 'Bestellnummer,Datum,Kunde,Telefon,Lieferadresse,Status,Zahlungsart,Betrag (EUR)\n';
      const csvRows = orders.map(ord => {
        const id = sanitizeCsvCell(ord.id);
        const name = sanitizeCsvCell(ord.customer?.name || ord.customerName || 'Kunde');
        const phone = sanitizeCsvCell(ord.customer?.phone || ord.customerPhone || '');
        const addr = sanitizeCsvCell(ord.deliveryAddress || '');
        const status = sanitizeCsvCell(ord.status);
        const payment = sanitizeCsvCell(ord.paymentMethod);
        const date = new Date(ord.createdAt).toISOString();
        return `${id},${date},${name},${phone},${addr},${status},${payment},${ord.totalAmount.toFixed(2)}`;
      }).join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=kunden_abrechnung_export.csv');
      res.send('\uFEFF' + csvHeader + csvRows); // Include UTF-8 BOM for Excel
    } else {
      res.json(orders);
    }
  } catch (error) {
    console.error('Export accounting data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAccountingSummary,
  getAccountingRecords,
  exportAccountingData
};