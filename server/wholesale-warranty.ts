"use server";

import { prisma } from "@/lib/prisma";
import { hasPermission, isAdmin } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { getCurrentSessionUser } from "@/server/order";

type WholesaleWarrantyPayload = {
  type: "REPLACEMENT" | "MAINTENANCE" | "DAMAGED";
  productId: number;
  wholesaleCustomerId?: string | null;
  warehouseId?: number | null;
  quantity?: number;
  maintenanceLaborCost?: number | null;
  shippingCost?: number | null;
  notes?: string | null;
};

const typeLabel: Record<WholesaleWarrantyPayload["type"], string> = {
  REPLACEMENT: "تبديل",
  MAINTENANCE: "صيانة",
  DAMAGED: "تالف",
};

function canViewWarranty(user: any) {
  return isAdmin(user) || hasPermission(user, "viewWarranty");
}

function canAddWarranty(user: any) {
  return isAdmin(user) || hasPermission(user, "addWarranty");
}

function canEditWarranty(user: any) {
  return isAdmin(user) || hasPermission(user, "editWarranty");
}

function canDeleteWarranty(user: any) {
  return isAdmin(user) || hasPermission(user, "deleteWarranty");
}

export async function getWholesaleWarrantyData() {
  try {
    const currentUser = await getCurrentSessionUser();
    if (!canViewWarranty(currentUser)) {
      return { success: false, error: "لا تملك صلاحية عرض الكفالة" };
    }

    const [records, products, customers, warehouses] = await Promise.all([
      prisma.wholesaleWarranty.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          product: { select: { id: true, name: true } },
          wholesaleCustomer: { select: { id: true, name: true, phone: true } },
          warehouse: { select: { id: true, name: true, location: true } },
          wholesaleOrder: { select: { id: true, orderNumber: true } },
        },
      }),
      prisma.product.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      prisma.wholesaleCustomer.findMany({
        where: { isActive: true },
        select: { id: true, name: true, phone: true },
        orderBy: { name: "asc" },
      }),
      prisma.warehouse.findMany({ select: { id: true, name: true, location: true }, orderBy: { name: "asc" } }),
    ]);

    return { success: true, data: { records, products, customers, warehouses } };
  } catch (error: any) {
    return { success: false, error: error?.message || "تعذر جلب بيانات كفالة الجملة" };
  }
}

export async function createWholesaleWarrantyAction(payload: WholesaleWarrantyPayload) {
  try {
    const currentUser = await getCurrentSessionUser();
    if (!canAddWarranty(currentUser)) {
      return { success: false, error: "لا تملك صلاحية إضافة حركة كفالة" };
    }

    if (!payload.productId || !payload.type) {
      return { success: false, error: "البيانات الأساسية غير مكتملة" };
    }

    if (payload.type === "REPLACEMENT" && !payload.wholesaleCustomerId) {
      return { success: false, error: "يرجى اختيار عميل الجملة لتسجيل طلب التبديل" };
    }

    if (!payload.warehouseId) {
      return { success: false, error: "يرجى اختيار المستودع" };
    }

    if (!payload.quantity || Number(payload.quantity) <= 0) {
      return { success: false, error: "يرجى إدخال كمية صحيحة" };
    }
    const result = await prisma.$transaction(async (tx) => {
      const productId = Number(payload.productId);
      const warehouseId = Number(payload.warehouseId);
      const quantity = Math.max(1, Number(payload.quantity || 1));

      const currentStock = await tx.productStock.findUnique({
        where: {
          productId_warehouseId: {
            productId,
            warehouseId,
          },
        },
      });

      if (!currentStock || currentStock.quantity < quantity) {
        throw new Error("الكمية غير كافية في المخزون لتنفيذ حركة الكفالة");
      }

      await tx.productStock.update({
        where: {
          productId_warehouseId: {
            productId,
            warehouseId,
          },
        },
        data: {
          quantity: { decrement: quantity },
        },
      });

      await tx.stockMovement.create({
        data: {
          productId,
          warehouseId,
          quantity,
          type: "OUT",
          reason: `${typeLabel[payload.type]} - كفالة جملة${payload.notes ? `: ${payload.notes}` : ""}`,
        },
      });

      let wholesaleOrderId: number | null = null;

      if (payload.type === "REPLACEMENT") {
        const [warehouse, customer] = await Promise.all([
          tx.warehouse.findUnique({
            where: { id: warehouseId },
            select: { id: true, location: true },
          }),
          payload.wholesaleCustomerId
            ? tx.wholesaleCustomer.findUnique({
                where: { id: payload.wholesaleCustomerId },
                select: { id: true, name: true, phone: true },
              })
            : null,
        ]);

        if (!warehouse) {
          throw new Error("المستودع المختار غير موجود");
        }

        if (!customer) {
          throw new Error("عميل الجملة المختار غير موجود");
        }

        const price = Number(currentStock.price || 0);
        const discount = Number(currentStock.discount || 0);
        const totalAmount = price * quantity;
        const orderNumber = `WHL-${Date.now()}`;

        const newOrder = await tx.wholesaleOrder.create({
          data: {
            orderNumber,
            status: "PENDING",
            paymentMethod: "عند الاستلام",
            totalAmount,
            discount: totalAmount,
            finalAmount: 0,
            receiverName: customer.name || null,
            receiverPhone: Array.isArray(customer.phone) ? customer.phone : [],
            country: warehouse.location,
            wholesaleCustomer: { connect: { id: payload.wholesaleCustomerId! } },
            ...(currentUser ? { user: { connect: { id: currentUser.id } } } : {}),
            warehouse: { connect: { id: warehouseId } },
            items: {
              create: [
                {
                  productId,
                  quantity,
                  price,
                  discount,
                },
              ],
            },
          },
        });

        wholesaleOrderId = newOrder.id;
      }

      const warranty = await tx.wholesaleWarranty.create({
        data: {
          type: payload.type,
          productId,
          wholesaleCustomerId: payload.wholesaleCustomerId || null,
          warehouseId,
          wholesaleOrderId,
          quantity,
          maintenanceLaborCost:
            payload.type === "MAINTENANCE" && payload.maintenanceLaborCost != null
              ? Number(payload.maintenanceLaborCost)
              : null,
          shippingCost: payload.shippingCost != null ? Number(payload.shippingCost) : null,
          notes: payload.notes?.trim() || null,
        },
      });

      return warranty;
    });

    revalidatePath("/dashboard/wholesale-warranty");
    revalidatePath("/dashboard/inventories");
    if (result.wholesaleOrderId) {
      revalidatePath("/dashboard/wholesale-orders");
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "تعذر حفظ حركة الكفالة" };
  }
}

export async function updateWholesaleWarrantyAction(id: string, payload: WholesaleWarrantyPayload) {
  try {
    const currentUser = await getCurrentSessionUser();
    if (!canEditWarranty(currentUser)) {
      return { success: false, error: "لا تملك صلاحية تعديل حركة الكفالة" };
    }

    if (!id) {
      return { success: false, error: "معرف الكفالة غير صالح" };
    }

    if (!payload.productId || !payload.type) {
      return { success: false, error: "البيانات الأساسية غير مكتملة" };
    }

    if (payload.type === "REPLACEMENT" && !payload.wholesaleCustomerId) {
      return { success: false, error: "يرجى اختيار عميل الجملة لتسجيل طلب التبديل" };
    }

    if (!payload.warehouseId) {
      return { success: false, error: "يرجى اختيار المستودع" };
    }

    if (!payload.quantity || Number(payload.quantity) <= 0) {
      return { success: false, error: "يرجى إدخال كمية صحيحة" };
    }
    const existing = await prisma.wholesaleWarranty.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true, location: true } },
        wholesaleOrder: {
          include: {
            items: { select: { productId: true, quantity: true } },
          },
        },
      },
    });

    if (!existing) {
      return { success: false, error: "سجل الكفالة غير موجود" };
    }

    const newProductId = Number(payload.productId);
    const newWarehouseId = Number(payload.warehouseId);
    const newQuantity = Math.max(1, Number(payload.quantity || 1));

    const stockChanged =
      existing.type !== payload.type ||
      existing.productId !== newProductId ||
      existing.warehouseId !== newWarehouseId ||
      existing.quantity !== newQuantity;

    const result = await prisma.$transaction(async (tx) => {
      let wholesaleOrderId: number | null = existing.wholesaleOrderId;

      if (stockChanged) {
        // إرجاع الآثار القديمة على المخزون
        if (existing.type === "REPLACEMENT" && existing.wholesaleOrderId && existing.wholesaleOrder) {
          // إعادة كميات الطلب المرتبط إلى المستودع ثم حذفه
          for (const item of existing.wholesaleOrder.items) {
            await tx.productStock.upsert({
              where: {
                productId_warehouseId: {
                  productId: item.productId,
                  warehouseId: existing.warehouseId!,
                },
              },
              update: {
                quantity: { increment: item.quantity },
              },
              create: {
                productId: item.productId,
                warehouseId: existing.warehouseId!,
                quantity: item.quantity,
              },
            });
          }

          await tx.wholesaleOrder.delete({
            where: { id: existing.wholesaleOrderId },
          });
          wholesaleOrderId = null;
        } else if (existing.warehouseId) {
          // إعادة الكمية إلى المستودع المرتبط
          await tx.productStock.upsert({
            where: {
              productId_warehouseId: {
                productId: existing.productId,
                warehouseId: existing.warehouseId,
              },
            },
            update: {
              quantity: { increment: existing.quantity },
            },
            create: {
              productId: existing.productId,
              warehouseId: existing.warehouseId,
              quantity: existing.quantity,
            },
          });

          await tx.stockMovement.create({
            data: {
              productId: existing.productId,
              warehouseId: existing.warehouseId,
              quantity: existing.quantity,
              type: "RETURN",
              reason: `تعديل كفالة جملة - إرجاع مخزون ${typeLabel[existing.type]}${existing.notes ? `: ${existing.notes}` : ""}`,
            },
          });
        }

        // تطبيق الآثار الجديدة على المخزون
        const currentStock = await tx.productStock.findUnique({
          where: {
            productId_warehouseId: {
              productId: newProductId,
              warehouseId: newWarehouseId,
            },
          },
        });

        if (!currentStock || currentStock.quantity < newQuantity) {
          throw new Error("الكمية غير كافية في المخزون لتنفيذ حركة الكفالة");
        }

        await tx.productStock.update({
          where: {
            productId_warehouseId: {
              productId: newProductId,
              warehouseId: newWarehouseId,
            },
          },
          data: {
            quantity: { decrement: newQuantity },
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: newProductId,
            warehouseId: newWarehouseId,
            quantity: newQuantity,
            type: "OUT",
            reason: `${typeLabel[payload.type]} - كفالة جملة${payload.notes ? `: ${payload.notes}` : ""}`,
          },
        });

        // إنشاء طلب جملة جديد في حالة التبديل
        if (payload.type === "REPLACEMENT") {
          const [warehouse, customer] = await Promise.all([
            tx.warehouse.findUnique({
              where: { id: newWarehouseId },
              select: { id: true, location: true },
            }),
            payload.wholesaleCustomerId
              ? tx.wholesaleCustomer.findUnique({
                  where: { id: payload.wholesaleCustomerId },
                  select: { id: true, name: true, phone: true },
                })
              : null,
          ]);

          if (!warehouse) {
            throw new Error("المستودع المختار غير موجود");
          }

          if (!customer) {
            throw new Error("عميل الجملة المختار غير موجود");
          }

          const price = Number(currentStock.price || 0);
          const discount = Number(currentStock.discount || 0);
          const totalAmount = price * newQuantity;
          const orderNumber = `WHL-${Date.now()}`;

          const newOrder = await tx.wholesaleOrder.create({
            data: {
              orderNumber,
              status: "PENDING",
              paymentMethod: "عند الاستلام",
              totalAmount,
              discount: totalAmount,
              finalAmount: 0,
              receiverName: customer.name || null,
              receiverPhone: Array.isArray(customer.phone) ? customer.phone : [],
              country: warehouse.location,
              wholesaleCustomer: { connect: { id: payload.wholesaleCustomerId! } },
              ...(currentUser ? { user: { connect: { id: currentUser.id } } } : {}),
              warehouse: { connect: { id: newWarehouseId } },
              items: {
                create: [
                  {
                    productId: newProductId,
                    quantity: newQuantity,
                    price,
                    discount,
                  },
                ],
              },
            },
          });

          wholesaleOrderId = newOrder.id;
        }
      } else if (
        payload.type === "REPLACEMENT" &&
        existing.type === "REPLACEMENT" &&
        payload.wholesaleCustomerId &&
        existing.wholesaleCustomerId !== payload.wholesaleCustomerId &&
        existing.wholesaleOrderId
      ) {
        // تغيّر العميل فقط لكفالة تبديل: تحديث الطلب المرتبط
        const customer = await tx.wholesaleCustomer.findUnique({
          where: { id: payload.wholesaleCustomerId },
          select: { id: true, name: true, phone: true },
        });

        if (!customer) {
          throw new Error("عميل الجملة المختار غير موجود");
        }

        await tx.wholesaleOrder.update({
          where: { id: existing.wholesaleOrderId },
          data: {
            receiverName: customer.name || null,
            receiverPhone: Array.isArray(customer.phone) ? customer.phone : [],
            wholesaleCustomer: { connect: { id: payload.wholesaleCustomerId } },
          },
        });
      }

      const warranty = await tx.wholesaleWarranty.update({
        where: { id },
        data: {
          type: payload.type,
          productId: newProductId,
          wholesaleCustomerId: payload.wholesaleCustomerId || null,
          warehouseId: newWarehouseId,
          wholesaleOrderId,
          quantity: newQuantity,
          maintenanceLaborCost:
            payload.type === "MAINTENANCE" && payload.maintenanceLaborCost != null
              ? Number(payload.maintenanceLaborCost)
              : null,
          shippingCost: payload.shippingCost != null ? Number(payload.shippingCost) : null,
          notes: payload.notes?.trim() || null,
        },
      });

      return warranty;
    });

    revalidatePath("/dashboard/wholesale-warranty");
    revalidatePath("/dashboard/inventories");
    if (result.wholesaleOrderId) {
      revalidatePath("/dashboard/wholesale-orders");
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "تعذر تحديث حركة الكفالة" };
  }
}

export async function deleteWholesaleWarrantyAction(id: string) {
  try {
    const currentUser = await getCurrentSessionUser();
    if (!canDeleteWarranty(currentUser)) {
      return { success: false, error: "لا تملك صلاحية حذف حركة الكفالة" };
    }

    const warranty = await prisma.wholesaleWarranty.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true, location: true } },
        wholesaleOrder: {
          include: {
            items: { select: { productId: true, quantity: true } },
          },
        },
      },
    });

    if (!warranty) {
      return { success: false, error: "سجل الكفالة غير موجود" };
    }

    await prisma.$transaction(async (tx) => {
      if (warranty.type === "REPLACEMENT" && warranty.wholesaleOrderId && warranty.wholesaleOrder) {
        // إعادة كميات الطلب المرتبط إلى المستودع المحدد في الكفالة ثم حذف الطلب
        for (const item of warranty.wholesaleOrder.items) {
          await tx.productStock.upsert({
            where: {
              productId_warehouseId: {
                productId: item.productId,
                warehouseId: warranty.warehouseId!,
              },
            },
            update: {
              quantity: { increment: item.quantity },
            },
            create: {
              productId: item.productId,
              warehouseId: warranty.warehouseId!,
              quantity: item.quantity,
            },
          });
        }

        await tx.wholesaleOrder.delete({
          where: { id: warranty.wholesaleOrderId },
        });
      } else if (warranty.warehouseId) {
        // إعادة الكمية إلى المستودع المرتبط
        await tx.productStock.upsert({
          where: {
            productId_warehouseId: {
              productId: warranty.productId,
              warehouseId: warranty.warehouseId,
            },
          },
          update: {
            quantity: { increment: warranty.quantity },
          },
          create: {
            productId: warranty.productId,
            warehouseId: warranty.warehouseId,
            quantity: warranty.quantity,
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: warranty.productId,
            warehouseId: warranty.warehouseId,
            quantity: warranty.quantity,
            type: "RETURN",
            reason: `إلغاء كفالة جملة - ${typeLabel[warranty.type]}${warranty.notes ? `: ${warranty.notes}` : ""}`,
          },
        });
      }

      await tx.wholesaleWarranty.delete({ where: { id } });
    });

    revalidatePath("/dashboard/wholesale-warranty");
    revalidatePath("/dashboard/inventories");
    if (warranty.wholesaleOrderId) {
      revalidatePath("/dashboard/wholesale-orders");
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "تعذر حذف سجل الكفالة" };
  }
}
