import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { successResponse, errorResponse } from "../utils/response";
import { logger } from "../utils/logger";

async function getCartData(cartId: string, storeId?: string | null) {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true, name: true, slug: true, unit: true,
              images: { where: { isPrimary: true }, select: { url: true }, take: 1 },
              ...(storeId
                ? { storeProducts: { where: { storeId }, select: { price: true, salePrice: true, stock: true, isAvailable: true } } }
                : {}),
            },
          },
        },
      },
    },
  });

  if (!cart) return null;

  const items = cart.items.map((item) => {
    const sp = storeId ? (item.product as any).storeProducts?.[0] : null;
    const price = sp ? Number(sp.price) : Number((item.product as any).price);
    const salePrice = sp ? (sp.salePrice ? Number(sp.salePrice) : null) : (item.product as any).salePrice ? Number((item.product as any).salePrice) : null;
    const stock = sp ? sp.stock : (item.product as any).stock;
    const isAvailable = sp ? sp.isAvailable : (item.product as any).isAvailable;

    return {
      id: item.id,
      cartId: item.cartId,
      productId: item.productId,
      quantity: item.quantity,
      price: Number(item.price),
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        unit: (item.product as any).unit,
        imageUrl: (item.product as any).images?.[0]?.url || null,
        price,
        salePrice,
        stock,
        isAvailable,
      },
    };
  });

  return {
    id: cart.id,
    userId: cart.userId,
    storeId: cart.storeId,
    items,
    subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

export const getCart = async (req: Request, res: Response) => {
  try {
    const storeId = req.query.storeId as string;
    let cart: any = await prisma.cart.findUnique({
      where: { userId: req.user!.userId },
      include: {
        items: { take: 1 },
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: req.user!.userId, storeId: storeId || null },
      });
    } else if (storeId && cart.storeId !== storeId) {
      // Store changed — clear cart
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      await prisma.cart.update({ where: { id: cart.id }, data: { storeId } });
    }

    const data = await getCartData(cart.id, storeId || cart.storeId);
    return successResponse(res, data);
  } catch (error) {
    logger.error("Get cart error:", error);
    return errorResponse(res, "Failed to get cart", 500);
  }
};

export const addItem = async (req: Request, res: Response) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const storeId = req.body.storeId || (req.query.storeId as string);

    // Get product pricing from StoreProduct or fallback
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: storeId
        ? { storeProducts: { where: { storeId }, take: 1 } }
        : undefined,
    });

    if (!product || !product.isActive) {
      return errorResponse(res, "Product not found", 404);
    }

    const sp = storeId ? (product as any).storeProducts?.[0] : null;
    const stock = sp ? sp.stock : product.stock;
    const isAvailable = sp ? sp.isAvailable : product.isAvailable;

    if (!isAvailable || stock < 1) {
      return errorResponse(res, "Product is out of stock", 400);
    }

    let cart = await prisma.cart.findUnique({ where: { userId: req.user!.userId } });
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: req.user!.userId, storeId: storeId || null },
      });
    } else if (storeId && cart.storeId !== storeId) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      await prisma.cart.update({ where: { id: cart.id }, data: { storeId } });
    }

    const existingItem = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      if (newQty > stock) {
        return errorResponse(res, "Requested quantity exceeds available stock", 400);
      }
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQty },
      });
    } else {
      const unitPrice = sp
        ? (sp.salePrice || sp.price)
        : (product.salePrice || product.price);
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity: Math.min(quantity, stock),
          price: unitPrice,
        },
      });
    }

    const updatedCart = await getCartData(cart.id, storeId || cart.storeId);
    return successResponse(res, updatedCart, "Item added to cart");
  } catch (error) {
    logger.error("Add to cart error:", error);
    return errorResponse(res, "Failed to add item", 500);
  }
};

export const updateItem = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (quantity < 0) return errorResponse(res, "Invalid quantity", 400);

    const cart = await prisma.cart.findUnique({ where: { userId: req.user!.userId } });
    if (!cart) return errorResponse(res, "Cart not found", 404);

    const existingItem = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });
    if (!existingItem) return errorResponse(res, "Item not in cart", 404);

    // Get stock (from StoreProduct if store-scoped, else from Product)
    const storeId = cart.storeId;
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: storeId
        ? { storeProducts: { where: { storeId }, take: 1 } }
        : undefined,
    });
    const stock = storeId
      ? ((product as any)?.storeProducts?.[0]?.stock ?? product?.stock ?? 0)
      : (product?.stock ?? 0);

    if (quantity === 0) {
      await prisma.cartItem.delete({ where: { id: existingItem.id } });
    } else {
      if (quantity > stock) {
        return errorResponse(res, "Requested quantity exceeds available stock", 400);
      }
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity },
      });
    }

    const updatedCart = await getCartData(cart.id, storeId);
    return successResponse(res, updatedCart, "Cart updated");
  } catch (error) {
    logger.error("Update cart item error:", error);
    return errorResponse(res, "Failed to update item", 500);
  }
};

export const removeItem = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    const cart = await prisma.cart.findUnique({ where: { userId: req.user!.userId } });
    if (!cart) return errorResponse(res, "Cart not found", 404);

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id, productId },
    });

    const updatedCart = await getCartData(cart.id, cart.storeId);
    return successResponse(res, updatedCart, "Item removed from cart");
  } catch (error) {
    logger.error("Remove from cart error:", error);
    return errorResponse(res, "Failed to remove item", 500);
  }
};

export const clearCart = async (req: Request, res: Response) => {
  try {
    const cart = await prisma.cart.findUnique({ where: { userId: req.user!.userId } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    return successResponse(res, null, "Cart cleared");
  } catch (error) {
    logger.error("Clear cart error:", error);
    return errorResponse(res, "Failed to clear cart", 500);
  }
};

export const syncCart = async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    const storeId = req.body.storeId || (req.query.storeId as string);

    if (!Array.isArray(items)) {
      return errorResponse(res, "Items must be an array", 400);
    }

    const userId = req.user!.userId;

    let cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId, storeId: storeId || null } });
    } else if (storeId && cart.storeId !== storeId) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      await prisma.cart.update({ where: { id: cart.id }, data: { storeId } });
    }

    // Validate all products
    const productIds = items.map((i: any) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: storeId
        ? { storeProducts: { where: { storeId }, take: 1 } }
        : undefined,
    });
    const productMap = new Map(products.map((p) => {
      const sp = storeId ? (p as any).storeProducts?.[0] : null;
      return [p.id, { ...p, _storeStock: sp ? sp.stock : p.stock, _storeAvailable: sp ? sp.isAvailable : p.isAvailable, _storePrice: sp ? (sp.salePrice || sp.price) : (p.salePrice || p.price) }];
    }));

    for (const item of items) {
      const pr = productMap.get(item.productId);
      if (!pr) {
        return errorResponse(res, `Product ${item.productId} not found or inactive`, 404);
      }
      if (!(pr as any)._storeAvailable || (pr as any)._storeStock < 1) {
        return errorResponse(res, `${pr.name} is out of stock`, 400);
      }
      if (item.quantity > (pr as any)._storeStock) {
        return errorResponse(res, `Insufficient stock for ${pr.name}`, 400);
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({ where: { cartId: cart!.id } });
      for (const item of items) {
        const pr = productMap.get(item.productId)!;
        await tx.cartItem.create({
          data: {
            cartId: cart!.id,
            productId: item.productId,
            quantity: item.quantity,
            price: (pr as any)._storePrice,
          },
        });
      }
    });

    const updatedCart = await getCartData(cart.id, storeId || cart.storeId);
    return successResponse(res, updatedCart, "Cart synced");
  } catch (error) {
    logger.error("Sync cart error:", error);
    return errorResponse(res, "Failed to sync cart", 500);
  }
};

export const applyCoupon = async (req: Request, res: Response) => {
  try {
    const { code, storeId } = req.body;

    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon || !coupon.isActive) {
      return errorResponse(res, "Invalid coupon code", 400);
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return errorResponse(res, "Coupon has expired", 400);
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return errorResponse(res, "Coupon usage limit reached", 400);
    }

    return successResponse(res, coupon, "Coupon applied");
  } catch (error) {
    logger.error("Apply coupon error:", error);
    return errorResponse(res, "Failed to apply coupon", 500);
  }
};
