import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { successResponse, errorResponse } from "../utils/response";
import { emitToAdmin } from "../services/socket.service";

export const getCart = async (req: Request, res: Response) => {
  try {
    let cart = await prisma.cart.findUnique({
      where: { userId: req.user!.userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true, name: true, slug: true, price: true, salePrice: true,
                stock: true, unit: true, isAvailable: true,
                images: { where: { isPrimary: true }, select: { url: true }, take: 1 },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: req.user!.userId },
        include: { items: { include: { product: { include: { images: true } } } } },
      });
    }

    const enrichedItems = cart.items.map((item) => ({
      id: item.id,
      cartId: item.cartId,
      productId: item.productId,
      quantity: item.quantity,
      price: Number(item.price),
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        price: Number(item.product.price),
        salePrice: item.product.salePrice ? Number(item.product.salePrice) : null,
        stock: item.product.stock,
        unit: item.product.unit,
        isAvailable: item.product.isAvailable,
        imageUrl: (item.product as any).images?.[0]?.url || null,
      },
    }));

    const subtotal = enrichedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return successResponse(res, {
      id: cart.id,
      userId: cart.userId,
      items: enrichedItems,
      subtotal,
      itemCount: enrichedItems.reduce((sum, item) => sum + item.quantity, 0),
    });
  } catch (error) {
    console.error("Get cart error:", error);
    return errorResponse(res, "Failed to get cart", 500);
  }
};

export const addItem = async (req: Request, res: Response) => {
  try {
    const { productId, quantity = 1 } = req.body;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isActive) {
      return errorResponse(res, "Product not found", 404);
    }
    if (!product.isAvailable || product.stock < 1) {
      return errorResponse(res, "Product is out of stock", 400);
    }

    let cart = await prisma.cart.findUnique({ where: { userId: req.user!.userId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId: req.user!.userId } });
    }

    const existingItem = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      if (newQty > product.stock) {
        return errorResponse(res, "Requested quantity exceeds available stock", 400);
      }
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQty },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity: Math.min(quantity, product.stock),
          price: product.salePrice || product.price,
        },
      });
    }

    const updatedCart = await getCartData(cart.id);
    return successResponse(res, updatedCart, "Item added to cart");
  } catch (error) {
    console.error("Add to cart error:", error);
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
      include: { product: true },
    });
    if (!existingItem) return errorResponse(res, "Item not in cart", 404);

    if (quantity === 0) {
      await prisma.cartItem.delete({ where: { id: existingItem.id } });
    } else {
      if (quantity > existingItem.product.stock) {
        return errorResponse(res, "Requested quantity exceeds available stock", 400);
      }
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity },
      });
    }

    const updatedCart = await getCartData(cart.id);
    return successResponse(res, updatedCart, "Cart updated");
  } catch (error) {
    console.error("Update cart item error:", error);
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

    const updatedCart = await getCartData(cart.id);
    return successResponse(res, updatedCart, "Item removed from cart");
  } catch (error) {
    console.error("Remove from cart error:", error);
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
    console.error("Clear cart error:", error);
    return errorResponse(res, "Failed to clear cart", 500);
  }
};

export const applyCoupon = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

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
    console.error("Apply coupon error:", error);
    return errorResponse(res, "Failed to apply coupon", 500);
  }
};

async function getCartData(cartId: string) {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true, name: true, slug: true, price: true, salePrice: true,
              stock: true, unit: true, isAvailable: true,
              images: { where: { isPrimary: true }, select: { url: true }, take: 1 },
            },
          },
        },
      },
    },
  });

  if (!cart) return null;

  const items = cart.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    quantity: item.quantity,
    price: Number(item.price),
    product: {
      id: item.product.id,
      name: item.product.name,
      slug: item.product.slug,
      price: Number(item.product.price),
      salePrice: item.product.salePrice ? Number(item.product.salePrice) : null,
      stock: item.product.stock,
      unit: item.product.unit,
      isAvailable: item.product.isAvailable,
      imageUrl: (item.product as any).images?.[0]?.url || null,
    },
  }));

  return {
    id: cart.id,
    userId: cart.userId,
    items,
    subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}
