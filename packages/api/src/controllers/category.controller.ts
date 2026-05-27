import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { successResponse, errorResponse } from "../utils/response";

export const listCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        children: { where: { isActive: true }, select: { id: true, name: true, slug: true } },
        _count: { select: { products: true } },
      },
      orderBy: { sortOrder: "asc" },
    });
    return successResponse(res, categories);
  } catch (error) {
    console.error("List categories error:", error);
    return errorResponse(res, "Failed to list categories", 500);
  }
};

export const getPopularCategories = async (_req: Request, res: Response) => {
  try {
    // Get popular categories based on product count and activity
    const popularCategories = await prisma.category.findMany({
      where: { isActive: true },
      take: 8,
      orderBy: {
        products: {
          _count: "desc",
        },
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    // If no categories with products found, fall back to all active categories
    const categoriesToReturn = popularCategories.length > 0
      ? popularCategories
      : await prisma.category.findMany({
          where: { isActive: true },
          take: 8,
          orderBy: { sortOrder: "asc" },
        });

    return successResponse(res, categoriesToReturn);
  } catch (error) {
    console.error("Get popular categories error:", error);
    return errorResponse(res, "Failed to get popular categories", 500);
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, description, imageUrl, parentId, sortOrder } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const category = await prisma.category.create({
      data: { name, slug, description, imageUrl, parentId, sortOrder: sortOrder || 0 },
    });

    return successResponse(res, category, "Category created", 201);
  } catch (error: any) {
    if (error.code === "P2002") return errorResponse(res, "Category with this name already exists", 409);
    console.error("Create category error:", error);
    return errorResponse(res, "Failed to create category", 500);
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, imageUrl, parentId, sortOrder, isActive } = req.body;
    const data: any = {};
    if (name !== undefined) { data.name = name; data.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
    if (description !== undefined) data.description = description;
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (parentId !== undefined) data.parentId = parentId;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;
    if (isActive !== undefined) data.isActive = isActive;

    const category = await prisma.category.update({ where: { id }, data });
    return successResponse(res, category, "Category updated");
  } catch (error) {
    console.error("Update category error:", error);
    return errorResponse(res, "Failed to update category", 500);
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Soft delete
    await prisma.category.update({ where: { id }, data: { isActive: false } });
    return successResponse(res, null, "Category deleted");
  } catch (error) {
    console.error("Delete category error:", error);
    return errorResponse(res, "Failed to delete category", 500);
  }
};
