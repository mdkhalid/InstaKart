import { prisma } from "../lib/prisma";
import { emitToAdmin } from "./socket.service";
import { sendEmail } from "./email.service";
import { logger } from "../utils/logger";

export interface LowStockItem {
  productId: string;
  productName: string;
  slug: string;
  storeId: string | null;
  storeName: string | null;
  stock: number;
  lowStockAlert: number;
  isOutOfStock: boolean;
}

/**
 * Scan for products whose stock has dropped at or below their
 * lowStockAlert threshold.  When `storeId` is provided the scan
 * is scoped to that store's StoreProduct rows; otherwise it covers
 * every store plus the Product-level fallback.
 */
export async function getLowStockItems(storeId?: string | null): Promise<LowStockItem[]> {
  const items: LowStockItem[] = [];

  if (storeId) {
    // ── Single-store scan ──────────────────────────────────
    const storeProducts = await prisma.storeProduct.findMany({
      where: { storeId },
      include: {
        store: { select: { name: true } },
        product: { select: { name: true, slug: true } },
      },
    });

    for (const sp of storeProducts) {
      if (sp.stock <= sp.lowStockAlert) {
        items.push({
          productId: sp.productId,
          productName: sp.product.name,
          slug: sp.product.slug,
          storeId: sp.storeId,
          storeName: sp.store.name,
          stock: sp.stock,
          lowStockAlert: sp.lowStockAlert,
          isOutOfStock: sp.stock <= 0,
        });
      }
    }
    return items;
  }

  // ── Global scan ──────────────────────────────────────────

  // 1. StoreProduct-level
  const storeProducts = await prisma.storeProduct.findMany({
    include: {
      store: { select: { name: true } },
      product: { select: { name: true, slug: true } },
    },
  });

  const storeProductMap = new Map<string, Set<string>>();
  for (const sp of storeProducts) {
    if (sp.stock <= sp.lowStockAlert) {
      items.push({
        productId: sp.productId,
        productName: sp.product.name,
        slug: sp.product.slug,
        storeId: sp.storeId,
        storeName: sp.store.name,
        stock: sp.stock,
        lowStockAlert: sp.lowStockAlert,
        isOutOfStock: sp.stock <= 0,
      });
    }
    // Track which products are in which store
    if (!storeProductMap.has(sp.productId)) {
      storeProductMap.set(sp.productId, new Set());
    }
    storeProductMap.get(sp.productId)!.add(sp.storeId);
  }

  // 2. Product-level (products not covered by any store association)
  const products = await prisma.product.findMany({
    where: { isActive: true },
  });

  for (const p of products) {
    // Skip if this product already has StoreProduct entries (those are covered above)
    if (storeProductMap.has(p.id)) continue;
    if (p.stock <= p.lowStockAlert) {
      items.push({
        productId: p.id,
        productName: p.name,
        slug: p.slug,
        storeId: null,
        storeName: "Global (no store)",
        stock: p.stock,
        lowStockAlert: p.lowStockAlert,
        isOutOfStock: p.stock <= 0,
      });
    }
  }

  return items;
}

/**
 * Check for low-stock items (scoped to a store if provided) and
 * emit a real-time socket event + send email notifications.
 * Safe to call after any stock mutation.
 */
export async function checkAndNotifyLowStock(storeId?: string | null) {
  try {
    const items = await getLowStockItems(storeId);
    if (items.length === 0) return;

    // ── Real-time socket alert ──
    emitToAdmin("admin:low_stock", {
      items,
      timestamp: new Date().toISOString(),
      storeId: storeId || null,
    });

    // ── Email notification ──
    const adminEmails = process.env.ADMIN_NOTIFICATION_EMAILS;
    if (!adminEmails) return;

    const recipients = adminEmails.split(",").map((s) => s.trim()).filter(Boolean);
    if (recipients.length === 0) return;

    const storeLabel = storeId
      ? items[0]?.storeName || "selected store"
      : "all stores";

    const outOfStock = items.filter((i) => i.isOutOfStock).length;
    const lowStock = items.filter((i) => !i.isOutOfStock).length;

    const rows = items
      .map(
        (i) =>
          `<tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${i.productName}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${i.storeName || "—"}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">
              <span style="color: ${i.isOutOfStock ? "#dc2626" : "#d97706"}; font-weight: 600;">${i.stock}</span>
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${i.lowStockAlert}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">
              ${i.isOutOfStock
                ? '<span style="color: #dc2626; font-weight: 600;">OUT OF STOCK</span>'
                : '<span style="color: #d97706;">Low Stock</span>'}
            </td>
          </tr>`
      )
      .join("");

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">⚠️ Low Stock Alert</h1>
        </div>
        <div style="background: #fff; border: 1px solid #e5e7eb; border-top: 0; padding: 20px; border-radius: 0 0 8px 8px;">
          <p style="margin-top: 0; color: #374151;">
            <strong>${items.length}</strong> product(s) are running low in <strong>${storeLabel}</strong>:
          </p>
          ${outOfStock > 0 ? `<p style="color: #dc2626;"><strong>${outOfStock}</strong> out of stock</p>` : ""}
          ${lowStock > 0 ? `<p style="color: #d97706;"><strong>${lowStock}</strong> low on stock</p>` : ""}
          <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 8px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280;">Product</th>
                <th style="padding: 8px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280;">Store</th>
                <th style="padding: 8px; text-align: center; font-size: 12px; text-transform: uppercase; color: #6b7280;">Stock</th>
                <th style="padding: 8px; text-align: center; font-size: 12px; text-transform: uppercase; color: #6b7280;">Alert At</th>
                <th style="padding: 8px; text-align: center; font-size: 12px; text-transform: uppercase; color: #6b7280;">Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <p style="margin-top: 16px; font-size: 12px; color: #9ca3af;">
            This is an automated alert from InstaCart. Restock these items to avoid order cancellations.
          </p>
        </div>
      </div>
    `;

    for (const email of recipients) {
      sendEmail({
        to: email,
        subject: `⚠️ Low Stock Alert — ${items.length} product(s) need restocking`,
        html,
      }).catch(() => {});
    }
  } catch (error) {
    logger.error("Low stock notification error:", error);
  }
}
