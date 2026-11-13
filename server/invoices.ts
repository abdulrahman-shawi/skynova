"use server";

import { prisma } from "@/lib/prisma";
import { hasPermission, isAdmin } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { getCurrentSessionUser } from "@/server/order";

function canViewInvoices(user: any) {
  return isAdmin(user) || hasPermission(user, "viewInvoices");
}

function canAddInvoices(user: any) {
  return isAdmin(user) || hasPermission(user, "addInvoices");
}

export async function getPurchaseInvoiceData() {
  try {
    const currentUser = await getCurrentSessionUser();
    if (!canViewInvoices(currentUser)) {
      return { success: false, error: "لا تملك صلاحية عرض الفواتير" };
    }

    const [invoices, products, warehouses] = await Promise.all([
      prisma.purchaseInvoice.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          items: { include: { product: { select: { id: true, name: true } } } },
          warehouse: { select: { id: true, name: true, location: true } },
          user: { select: { id: true, username: true } },
        },
      }),
      prisma.product.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      prisma.warehouse.findMany({ select: { id: true, name: true, location: true }, orderBy: { name: "asc" } }),
    ]);

    return { success: true, data: { invoices, products, warehouses } };
  } catch (error: any) {
    return { success: false, error: error?.message || "تعذر جلب بيانات الفواتير" };
  }
}

export async function createPurchaseInvoiceAction(data: any, items: any[]) {
  try {
    const currentUser = await getCurrentSessionUser();
    if (!canAddInvoices(currentUser)) {
      return { success: false, error: "لا تملك صلاحية إضافة فاتورة شراء" };
    }

    const userId = currentUser?.id;
    if (!userId) {
      return { success: false, error: "جلسة المستخدم غير صالحة" };
    }

    if (!data.warehouseId) {
      return { success: false, error: "يرجى اختيار المستودع" };
    }

    const warehouseId = Number(data.warehouseId);
    const validItems = (Array.isArray(items) ? items : [])
      .filter((item: any) => Number(item.productId) > 0 && Number(item.quantity) > 0)
      .map((item: any) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
        price: Number(item.price || 0),
      }));

    if (validItems.length === 0) {
      return { success: false, error: "يرجى إضافة منتج واحد على الأقل بكمية صحيحة" };
    }

    const invoiceNumber = `PUR-${Date.now()}`;
    const totalAmount = validItems.reduce((sum, item) => sum + item.quantity * item.price, 0);

    const invoice = await prisma.$transaction(async (tx) => {
      const newInvoice = await tx.purchaseInvoice.create({
        data: {
          invoiceNumber,
          supplierName: data.supplierName || null,
          warehouseId,
          totalAmount,
          notes: data.notes || null,
          userId,
          items: {
            create: validItems,
          },
        },
      });

      for (const item of validItems) {
        // إضافة الكمية إلى مخزون المنتج فوراً حسب الكمية المدخلة
        await tx.productStock.upsert({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId,
            },
          },
          update: { quantity: { increment: item.quantity } },
          create: {
            productId: item.productId,
            warehouseId,
            quantity: item.quantity,
          },
        });

        // تسجيل حركة المخزون مع الموظف الذي أنشأ الفاتورة
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            warehouseId,
            quantity: item.quantity,
            type: "IN",
            reason: `فاتورة شراء رقم ${invoiceNumber}${data.supplierName ? ` - ${data.supplierName}` : ""}`,
            userId,
          },
        });
      }

      return newInvoice;
    });

    revalidatePath("/dashboard/invoices");
    revalidatePath("/dashboard/inventories");
    revalidatePath("/dashboard/move-product");
    return { success: true, data: invoice };
  } catch (error: any) {
    console.error("Create Purchase Invoice Error:", error);
    return { success: false, error: error?.message || "حدث خطأ أثناء حفظ الفاتورة" };
  }
}

export async function getMovementLogs() {
  try {
    const currentUser = await getCurrentSessionUser();
    if (!isAdmin(currentUser)) {
      return { success: false, error: "لا تملك صلاحية عرض سجل الحركات" };
    }

    const [stockMovements, orderStatusLogs] = await Promise.all([
      prisma.stockMovement.findMany({
        orderBy: { createdAt: "desc" },
        take: 500,
        include: {
          product: { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true, location: true } },
          user: { select: { id: true, username: true } },
        },
      }),
      prisma.orderStatusLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 500,
        include: {
          order: { select: { id: true, orderNumber: true } },
          wholesaleOrder: { select: { id: true, orderNumber: true } },
          user: { select: { id: true, username: true } },
        },
      }),
    ]);

    return { success: true, data: { stockMovements, orderStatusLogs } };
  } catch (error: any) {
    return { success: false, error: error?.message || "تعذر جلب سجل الحركات" };
  }
}
