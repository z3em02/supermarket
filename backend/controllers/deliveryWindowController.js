const prisma = require('../lib/prisma');

const isValidHour = (h) => Number.isInteger(h) && h >= 0 && h <= 24;

/**
 * List all delivery windows (Admin) — includes inactive ones so they can be re-enabled.
 */
const getDeliveryWindows = async (req, res) => {
  try {
    const windows = await prisma.deliveryWindow.findMany({
      orderBy: [{ sortOrder: 'asc' }, { startHour: 'asc' }]
    });
    res.json(windows);
  } catch (error) {
    console.error('Get delivery windows error:', error);
    res.status(500).json({ error: 'Failed to fetch delivery windows' });
  }
};

/**
 * List active delivery windows (Public) — used by the checkout time picker.
 */
const getActiveDeliveryWindows = async (req, res) => {
  try {
    const windows = await prisma.deliveryWindow.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { startHour: 'asc' }]
    });
    res.json(windows);
  } catch (error) {
    console.error('Get active delivery windows error:', error);
    res.status(500).json({ error: 'Failed to fetch delivery windows' });
  }
};

const createDeliveryWindow = async (req, res) => {
  try {
    const { startHour, endHour, isActive, sortOrder } = req.body;
    const start = parseInt(startHour, 10);
    const end = parseInt(endHour, 10);

    if (
      !isValidHour(start) ||
      !isValidHour(end) ||
      start < 0 ||
      start > 23 ||
      end < 1 ||
      end > 24 ||
      end <= start
    ) {
      return res.status(400).json({
        error: 'Invalid time window. Start hour must be 0–23, end hour must be 1–24, and end must be after start.'
      });
    }

    const order = Number.isInteger(parseInt(sortOrder, 10)) ? parseInt(sortOrder, 10) : 0;

    const window = await prisma.deliveryWindow.create({
      data: {
        startHour: start,
        endHour: end,
        isActive: isActive !== false,
        sortOrder: order
      }
    });
    res.status(201).json(window);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'This exact time window already exists.' });
    }
    console.error('Create delivery window error:', error);
    res.status(500).json({ error: 'Failed to create delivery window' });
  }
};

const updateDeliveryWindow = async (req, res) => {
  try {
    const { id } = req.params;
    const { startHour, endHour, isActive, sortOrder } = req.body;

    const existing = await prisma.deliveryWindow.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Delivery window not found' });
    }

    const finalStart = startHour !== undefined ? parseInt(startHour, 10) : existing.startHour;
    const finalEnd = endHour !== undefined ? parseInt(endHour, 10) : existing.endHour;

    if (startHour !== undefined || endHour !== undefined) {
      if (
        !isValidHour(finalStart) ||
        !isValidHour(finalEnd) ||
        finalStart < 0 ||
        finalStart > 23 ||
        finalEnd < 1 ||
        finalEnd > 24 ||
        finalEnd <= finalStart
      ) {
        return res.status(400).json({
          error: 'Invalid time window hours. Start must be 0–23, end 1–24, and end must be after start.'
        });
      }
    }

    const data = {
      startHour: finalStart,
      endHour: finalEnd
    };
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (sortOrder !== undefined) {
      const parsedOrder = parseInt(sortOrder, 10);
      if (Number.isInteger(parsedOrder)) data.sortOrder = parsedOrder;
    }

    const window = await prisma.deliveryWindow.update({ where: { id }, data });
    res.json(window);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'This exact time window already exists.' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Delivery window not found' });
    }
    console.error('Update delivery window error:', error);
    res.status(500).json({ error: 'Failed to update delivery window' });
  }
};

const deleteDeliveryWindow = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.deliveryWindow.delete({ where: { id } });
    res.json({ message: 'Delivery window deleted' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Delivery window not found' });
    }
    console.error('Delete delivery window error:', error);
    res.status(500).json({ error: 'Failed to delete delivery window' });
  }
};

module.exports = {
  getDeliveryWindows,
  getActiveDeliveryWindows,
  createDeliveryWindow,
  updateDeliveryWindow,
  deleteDeliveryWindow
};
