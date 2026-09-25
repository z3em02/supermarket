const prisma = require('../lib/prisma');
const { isPrivateOrLocalHost } = require('../utils/googleScraper');
const { logAudit } = require('../lib/auditLog');

const generateProductId = () => {
  const randomPart = Math.floor(100000 + Math.random() * 900000);
  return `PRD-${randomPart}`;
};

const MAX_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;

// Returns an error message if a text field exceeds its sane length cap, else null.
const validateTextLengths = (fields) => {
  for (const [label, value, max] of fields) {
    if (typeof value === 'string' && value.length > max) {
      return `${label} must be ${max} characters or fewer`;
    }
  }
  return null;
};

// #30 fix: validate image URLs to prevent script injection / XSS schemes
const isValidImageUrl = (url) => {
  if (!url) return true;
  const s = String(url).trim().toLowerCase();
  if (s.startsWith('javascript:') || s.startsWith('data:text/html') || s.startsWith('vbscript:')) return false;
  // A protocol-relative URL ("//evil.com/x.jpg") also starts with "/" but
  // resolves to an attacker-controlled origin — reject it before the local-path allowance.
  if (s.startsWith('//')) return false;
  if (s.startsWith('/')) return true;
  if (s.startsWith('https://') || s.startsWith('http://')) {
    try {
      const parsed = new URL(url);
      if (isPrivateOrLocalHost(parsed.hostname)) return false;
    } catch { return false; }
    return true;
  }
  return false;
};

const getProducts = async (req, res) => {
  try {
    const { categoryId, search, stockFilter, page, limit, sort } = req.query;

    const where = {};

    // Filter by Category
    if (categoryId && categoryId !== 'all') {
      where.categoryId = categoryId;
    }

    // Filter by Search (Case-insensitive across SKU, name, nameDe, nameAr, descriptionDe, descriptionAr)
    if (search && String(search).trim()) {
      const q = String(search).trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { nameDe: { contains: q, mode: 'insensitive' } },
        { nameAr: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { descriptionDe: { contains: q, mode: 'insensitive' } },
        { descriptionAr: { contains: q, mode: 'insensitive' } }
      ];
    }

    // Filter by Stock status
    if (stockFilter === 'inStock') {
      where.stock = { gt: 0 };
    } else if (stockFilter === 'outOfStock') {
      where.stock = { lte: 0 };
    } else if (stockFilter === 'lowStock') {
      where.stock = { gt: 0, lte: 15 };
    }

    // Dynamic Ordering / Sorting
    let orderBy = { createdAt: 'desc' };
    if (sort === 'price-low') {
      orderBy = { b2bPrice: 'asc' };
    } else if (sort === 'price-high') {
      orderBy = { b2bPrice: 'desc' };
    } else if (sort === 'stock-high') {
      orderBy = { stock: 'desc' };
    } else if (sort === 'stock-low') {
      orderBy = { stock: 'asc' };
    } else if (sort === 'name-asc') {
      orderBy = { name: 'asc' };
    } else if (sort === 'name-desc') {
      orderBy = { name: 'desc' };
    }

    // Optional Pagination: only applies if limit is explicitly provided
    let take = undefined;
    let skip = undefined;
    if (limit !== undefined) {
      const parsedLimit = parseInt(limit, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        take = Math.min(parsedLimit, 200); // capped at 200 to prevent DOS
        const parsedPage = parseInt(page, 10);
        const currentPage = (!isNaN(parsedPage) && parsedPage > 0) ? parsedPage : 1;
        skip = (currentPage - 1) * take;
      }
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true
      },
      orderBy,
      take,
      skip
    });

    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        orderItems: true
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createProduct = async (req, res) => {
  try {
    const { 
      name, 
      nameDe, 
      nameAr, 
      description, 
      descriptionDe, 
      descriptionAr, 
      sku, 
      b2bPrice, 
      stock, 
      imageUrl, 
      categoryId 
    } = req.body;

    const resolvedName = (nameDe && nameDe.trim()) || (name && name.trim()) || (nameAr && nameAr.trim());

    if (!resolvedName || b2bPrice === undefined || b2bPrice === '') {
      return res.status(400).json({ error: 'Product name and B2B Price are required' });
    }

    const parsedPrice = parseFloat(b2bPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({ error: 'B2B Price must be a positive number greater than 0' });
    }

    const parsedStock = stock !== undefined && stock !== '' ? parseInt(stock, 10) : 0;
    if (isNaN(parsedStock) || parsedStock < 0) {
      return res.status(400).json({ error: 'Stock must be a non-negative integer' });
    }

    // #30 fix: validate image URL format
    if (imageUrl && !isValidImageUrl(imageUrl)) {
      return res.status(400).json({ error: 'Invalid image URL. Must be an HTTP(S) URL or local path.' });
    }

    const lengthError = validateTextLengths([
      ['Name', name, MAX_NAME_LENGTH],
      ['German name', nameDe, MAX_NAME_LENGTH],
      ['Arabic name', nameAr, MAX_NAME_LENGTH],
      ['Description', description, MAX_DESCRIPTION_LENGTH],
      ['German description', descriptionDe, MAX_DESCRIPTION_LENGTH],
      ['Arabic description', descriptionAr, MAX_DESCRIPTION_LENGTH]
    ]);
    if (lengthError) {
      return res.status(400).json({ error: lengthError });
    }

    let resolvedSku;
    if (sku && sku.trim()) {
      // An explicitly-provided SKU must be rejected on conflict, not
      // silently swapped for a random one — an admin reconciling against a
      // real-world barcode/SKU needs to know their SKU wasn't used.
      resolvedSku = sku.trim().toUpperCase();
      const existingSku = await prisma.product.findUnique({ where: { sku: resolvedSku } });
      if (existingSku) {
        return res.status(400).json({ error: 'A product with this SKU already exists' });
      }
    } else {
      // Auto-generate SKU / Product ID if not provided or left blank
      // (#42 fix: graceful failure after 5 attempts)
      resolvedSku = generateProductId();
      let existingSku = await prisma.product.findUnique({ where: { sku: resolvedSku } });
      let attempts = 0;
      while (existingSku && attempts < 5) {
        resolvedSku = generateProductId();
        existingSku = await prisma.product.findUnique({ where: { sku: resolvedSku } });
        attempts++;
      }
      if (existingSku) {
        return res.status(500).json({ error: 'Failed to generate unique SKU after multiple attempts. Please provide a SKU manually.' });
      }
    }

    const product = await prisma.product.create({
      data: {
        name: resolvedName,
        nameDe: nameDe ? nameDe.trim() : resolvedName,
        nameAr: nameAr ? nameAr.trim() : null,
        description: (descriptionDe && descriptionDe.trim()) || (description && description.trim()) || (descriptionAr && descriptionAr.trim()) || null,
        descriptionDe: descriptionDe ? descriptionDe.trim() : null,
        descriptionAr: descriptionAr ? descriptionAr.trim() : null,
        sku: resolvedSku,
        b2bPrice: parsedPrice,
        stock: parsedStock,
        imageUrl: imageUrl || null,
        categoryId: categoryId || null
      },
      include: {
        category: true
      }
    });

    logAudit(req.admin?.email, 'CREATE_PRODUCT', `Produkt erstellt: ${product.nameDe || product.name} (SKU: ${product.sku}, Preis: €${product.b2bPrice})`);

    res.status(201).json(product);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A product with this SKU / ID already exists' });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Selected category does not exist' });
    }
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      nameDe, 
      nameAr, 
      description, 
      descriptionDe, 
      descriptionAr, 
      sku, 
      b2bPrice, 
      stock, 
      imageUrl, 
      categoryId 
    } = req.body;

    let parsedPrice = undefined;
    if (b2bPrice !== undefined && b2bPrice !== '') {
      parsedPrice = parseFloat(b2bPrice);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        return res.status(400).json({ error: 'B2B Price must be a positive number greater than 0' });
      }
    }

    let parsedStock = undefined;
    if (stock !== undefined && stock !== '') {
      parsedStock = parseInt(stock, 10);
      if (isNaN(parsedStock) || parsedStock < 0) {
        return res.status(400).json({ error: 'Stock must be a non-negative integer' });
      }
    }

    // #30 fix: validate image URL format
    if (imageUrl !== undefined && imageUrl && !isValidImageUrl(imageUrl)) {
      return res.status(400).json({ error: 'Invalid image URL. Must be an HTTP(S) URL or local path.' });
    }

    const lengthError = validateTextLengths([
      ['Name', name, MAX_NAME_LENGTH],
      ['German name', nameDe, MAX_NAME_LENGTH],
      ['Arabic name', nameAr, MAX_NAME_LENGTH],
      ['Description', description, MAX_DESCRIPTION_LENGTH],
      ['German description', descriptionDe, MAX_DESCRIPTION_LENGTH],
      ['Arabic description', descriptionAr, MAX_DESCRIPTION_LENGTH]
    ]);
    if (lengthError) {
      return res.status(400).json({ error: lengthError });
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: nameDe ? nameDe.trim() : (name ? name.trim() : undefined),
        nameDe: nameDe !== undefined ? (nameDe ? nameDe.trim() : null) : undefined,
        nameAr: nameAr !== undefined ? (nameAr ? nameAr.trim() : null) : undefined,
        description: descriptionDe ? descriptionDe.trim() : (description ? description.trim() : undefined),
        descriptionDe: descriptionDe !== undefined ? (descriptionDe ? descriptionDe.trim() : null) : undefined,
        descriptionAr: descriptionAr !== undefined ? (descriptionAr ? descriptionAr.trim() : null) : undefined,
        sku: sku !== undefined && sku !== '' ? sku.trim().toUpperCase() : undefined,
        b2bPrice: parsedPrice,
        stock: parsedStock,
        imageUrl: imageUrl !== undefined ? imageUrl : undefined,
        categoryId: categoryId !== undefined ? (categoryId || null) : undefined
      },
      include: {
        category: true
      }
    });

    logAudit(req.admin?.email, 'UPDATE_PRODUCT', `Produkt aktualisiert: ${product.nameDe || product.name} (SKU: ${product.sku}, Bestand: ${product.stock}, Preis: €${product.b2bPrice})`);

    res.json(product);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A product with this SKU / ID already exists' });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Selected category does not exist' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        orderItems: true
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.orderItems && product.orderItems.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete product because it has associated orders. You can set stock to 0 instead.'
      });
    }

    await prisma.product.delete({
      where: { id }
    });

    logAudit(req.admin?.email, 'DELETE_PRODUCT', `Produkt gelöscht: ${product.nameDe || product.name} (SKU: ${product.sku})`);

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;

    if (stock === undefined || stock === '') {
      return res.status(400).json({ error: 'Stock value is required' });
    }

    const parsedStock = parseInt(stock, 10);
    if (isNaN(parsedStock) || parsedStock < 0) {
      return res.status(400).json({ error: 'Stock must be a non-negative integer' });
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        stock: parsedStock
      },
      include: {
        category: true
      }
    });

    logAudit(req.admin?.email, 'UPDATE_STOCK', `Lagerbestand geändert für ${product.nameDe || product.name}: ${parsedStock} Einheiten`);

    res.json(product);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    console.error('Update stock error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock
};