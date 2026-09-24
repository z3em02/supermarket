const prisma = require('../lib/prisma');
const { CUSTOMER_PUBLIC_SELECT } = require('../utils/serialize');
const { logAudit } = require('../lib/auditLog');

const getAccountingSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    // Valid non-declined orders
    const validOrders = await prisma.order.findMany({
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
    });

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

    const where = {};
    if (status) where.status = status;

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: { select: CUSTOMER_PUBLIC_SELECT }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: parseInt(limit)
    });

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
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
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
    if (startDate && endDate) {
      dateFilter.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const orders = await prisma.order.findMany({
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
    });

    if (format === 'csv') {
      const csvHeader = 'Bestellnummer,Datum,Kunde,Telefon,Lieferadresse,Status,Zahlungsart,Betrag (EUR)\n';
      const csvRows = orders.map(ord => {
        const name = `"${(ord.customer?.name || ord.customerName || 'Kunde').replace(/"/g, '""')}"`;
        const phone = `"${(ord.customer?.phone || ord.customerPhone || '').replace(/"/g, '""')}"`;
        const addr = `"${(ord.deliveryAddress || '').replace(/"/g, '""')}"`;
        const date = new Date(ord.createdAt).toISOString();
        return `${ord.id},${date},${name},${phone},${addr},${ord.status},${ord.paymentMethod},${ord.totalAmount.toFixed(2)}`;
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