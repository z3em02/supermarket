const prisma = require('../lib/prisma');

const generateProductId = () => {
  const randomPart = Math.floor(100000 + Math.random() * 900000);
  return `PRD-${randomPart}`;
};

// #30 fix: validate image URLs to prevent script injection / XSS schemes
const isValidImageUrl = (url) => {
  if (!url) return true;
  const s = String(url).trim().toLowerCase();
  if (s.startsWith('javascript:') || s.startsWith('data:text/html') || s.startsWith('vbscript:')) return false;
  // A protocol-relative URL ("//evil.com/x.jpg") also starts with "/" but
  // resolves to an attacker-controlled origin — reject it before the local-path allowance.
  if (s.startsWith('//')) return false;
  return s.startsWith('https://') || s.startsWith('http://') || s.startsWith('/');
};

const getProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true
      },
      orderBy: {
        createdAt: 'desc'
      }
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
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ error: 'B2B Price must be a non-negative number' });
    }

    const parsedStock = stock !== undefined && stock !== '' ? parseInt(stock, 10) : 0;
    if (isNaN(parsedStock) || parsedStock < 0) {
      return res.status(400).json({ error: 'Stock must be a non-negative integer' });
    }

    // #30 fix: validate image URL format
    if (imageUrl && !isValidImageUrl(imageUrl)) {
      return res.status(400).json({ error: 'Invalid image URL. Must be an HTTP(S) URL or local path.' });
    }

    // Auto-generate SKU / Product ID if not provided or left blank
    let resolvedSku = (sku && sku.trim()) ? sku.trim().toUpperCase() : generateProductId();

    // Ensure generated SKU is unique (#42 fix: graceful failure after 5 attempts)
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

    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A product with this SKU / ID already exists' });
    }
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
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ error: 'B2B Price must be a non-negative number' });
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

    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A product with this SKU / ID already exists' });
    }
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

    res.json(product);
  } catch (error) {
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