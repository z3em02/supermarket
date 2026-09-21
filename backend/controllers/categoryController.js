const prisma = require('../lib/prisma');

const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true }
        }
      },
      orderBy: {
        nameDe: 'asc'
      }
    });

    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        products: true,
        _count: {
          select: { products: true }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createCategory = async (req, res) => {
  try {
    const { nameDe, nameAr, descriptionDe, descriptionAr } = req.body;

    if (!nameDe || !nameAr) {
      return res.status(400).json({ error: 'Both German and Arabic names are required' });
    }

    const category = await prisma.category.create({
      data: {
        nameDe: nameDe.trim(),
        nameAr: nameAr.trim(),
        descriptionDe: descriptionDe ? descriptionDe.trim() : null,
        descriptionAr: descriptionAr ? descriptionAr.trim() : null
      },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { nameDe, nameAr, descriptionDe, descriptionAr } = req.body;

    const category = await prisma.category.update({
      where: { id },
      data: {
        nameDe: nameDe !== undefined ? nameDe.trim() : undefined,
        nameAr: nameAr !== undefined ? nameAr.trim() : undefined,
        descriptionDe: descriptionDe !== undefined ? (descriptionDe ? descriptionDe.trim() : null) : undefined,
        descriptionAr: descriptionAr !== undefined ? (descriptionAr ? descriptionAr.trim() : null) : undefined
      },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    res.json(category);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Safely unlink any products pointing to this category
    await prisma.product.updateMany({
      where: { categoryId: id },
      data: { categoryId: null }
    });

    await prisma.category.delete({
      where: { id }
    });

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};
