// Admin customer management (Kunden page, behind the section PIN).

const prisma = require('../lib/prisma');
const { logAudit } = require('../lib/auditLog');
const { decrypt, decryptCustomerPII } = require('../utils/piiCrypto');
const { DECLINED_STATUSES } = require('./orderShared');

/**
 * List all customers (Admin)
 */
const listCustomers = async (req, res) => {
  try {
    logAudit(req.admin?.email, 'VIEW_CUSTOMERS');
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        phone: true,
        phoneVerified: true,
        street: true,
        houseNumber: true,
        postalCode: true,
        city: true,
        floorApartment: true,
        deliveryNotes: true,
        preferredLanguage: true,
        createdAt: true,
        orders: {
          select: {
            id: true,
            totalAmount: true,
            status: true,
            paymentMethod: true,
            deliveryAddress: true,
            createdAt: true,
            orderItems: {
              select: {
                id: true,
                quantity: true,
                price: true,
                product: {
                  select: {
                    name: true,
                    nameDe: true,
                    nameAr: true,
                    imageUrl: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { orders: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const enriched = customers.map(c => {
      const validOrders = (c.orders || []).filter(o => !DECLINED_STATUSES.includes(o.status?.toLowerCase()));
      const totalSpent = validOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
      return {
        ...decryptCustomerPII(c),
        orders: (c.orders || []).map(o => ({
          ...o,
          deliveryAddress: o.deliveryAddress ? decrypt(o.deliveryAddress) : o.deliveryAddress
        })),
        totalSpent,
        totalOrders: c._count?.orders || c.orders?.length || 0
      };
    });

    res.json(enriched);
  } catch (error) {
    console.error('List customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
};

/**
 * Count customers (Admin) — for the Dashboard card, which previously
 * downloaded every customer with their full order history just to count them.
 */
const countCustomers = async (req, res) => {
  try {
    res.json({ total: await prisma.customer.count() });
  } catch (error) {
    console.error('Count customers error:', error);
    res.status(500).json({ error: 'Failed to count customers' });
  }
};

/**
 * Delete a customer (Admin)
 */
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.customer.delete({
      where: { id }
    });
    // #11 fix: record GDPR audit trail of customer account deletion
    logAudit(req.admin?.email, 'DELETE_CUSTOMER', `Customer account ${id} deleted by admin`);
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
};

module.exports = {
  listCustomers,
  countCustomers,
  deleteCustomer
};
