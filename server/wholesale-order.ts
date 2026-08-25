'use server'

import { decrypt } from "@/lib/auth";
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers";

const SOLD_ORDER_STATUSES = new Set(["تم تسليم الطلب", "تم التسليم", "مدفوعة"]);
const STOCK_RETURN_STATUSES = new Set(["فشل التسليم مرتجع", "تم الغاء الطلب"]);
const DEFAULT_TURKEY_EXCHANGE_RATE = 44;
const WAREHOUSE_ROLE_NAME = "مستودع";

const isSoldOrderStatus = (status: string) => SOLD_ORDER_STATUSES.has(status);
const isStockReturnStatus = (status: string) => STOCK_RETURN_STATUSES.has(status);

const normalizeWarehouseLocation = (location?: string | null) => {
    const value = String(location || "").trim().toLowerCase();
    if (!value) return "";
    if (value === "سوريا" || value === "syria") return "سوريا";
    if (value === "تركيا" || value === "turkey") return "تركيا";
    return String(location || "").trim();
};

const parseOptionalDate = (value: any) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
};

const getOrderSortTimestamp = (orderLike: any) => {
    const dateValue = orderLike?.manualCreatedAt || orderLike?.createdAt;
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return 0;
    return parsed.getTime();
};

const sortOrdersByDisplayDateDesc = <T extends { manualCreatedAt?: Date | null; createdAt?: Date | null }>(orders: T[]) => {
    return [...orders].sort((a, b) => getOrderSortTimestamp(b) - getOrderSortTimestamp(a));
};

async function applyWholesaleOrderStockChange(
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    order: { warehouseId?: number | null; warehouse?: { location?: string | null } | null; items: Array<{ productId: number; quantity: number }> },
    direction: "restore" | "reserve"
) {
    const warehouseId = order.warehouseId ? Number(order.warehouseId) : null;

    for (const item of order.items) {
        const quantity = Number(item.quantity || 0);
        if (quantity <= 0) continue;

        let stock = null;
        if (warehouseId && !Number.isNaN(warehouseId)) {
            stock = await tx.productStock.findFirst({
                where: {
                    productId: item.productId,
                    warehouseId,
                },
            });
        }

        if (!stock && order.warehouse?.location) {
            const stockCountry = String(order.warehouse.location).trim();
            stock = await tx.productStock.findFirst({
                where: {
                    productId: item.productId,
                    warehouse: { location: stockCountry },
                },
                orderBy: { quantity: "desc" },
            });
        }

        if (direction === "restore") {
            if (stock) {
                await tx.productStock.update({
                    where: { id: stock.id },
                    data: { quantity: (Number(stock.quantity) || 0) + quantity },
                });
                continue;
            }

            if (warehouseId && !Number.isNaN(warehouseId)) {
                await tx.productStock.create({
                    data: {
                        productId: item.productId,
                        warehouseId,
                        quantity,
                    },
                });
            }

            continue;
        }

        if (!stock) {
            throw new Error(`لا يمكن إعادة حجز المنتج ${item.productId} لأنه غير موجود في المخزن`);
        }

        const currentQuantity = Number(stock.quantity) || 0;
        if (currentQuantity < quantity) {
            throw new Error(`كمية المنتج ${item.productId} في المخزن غير كافية لإعادة الطلب إلى حالة نشطة`);
        }

        await tx.productStock.update({
            where: { id: stock.id },
            data: { quantity: currentQuantity - quantity },
        });
    }
}

function isWarehouseRole(user: any) {
    const roleName = String(user?.permission?.roleName || "").trim();
    return roleName.includes(WAREHOUSE_ROLE_NAME);
}

function canViewWholesaleOrders(user: any) {
    if (!user) return false;
    if (user.accountType === "ADMIN") return true;
    if (isWarehouseRole(user)) return true;
    return Boolean(user?.permission?.viewWholesaleCustomers);
}

function getAllowedWarehouseLocations(user: any) {
    const locations: string[] = [];
    if (user?.permission?.accessSyria === true) locations.push("سوريا");
    if (user?.permission?.accessTurkey === true) locations.push("تركيا");
    return locations;
}

function shouldRestrictOrdersByWarehouseLocation(user: any) {
    if (!user || user.accountType === "ADMIN") return false;
    return getAllowedWarehouseLocations(user).length > 0;
}

// المستودعات المسموح بها للدور (قائمة فارغة = كل المستودعات)
function getAllowedWarehouseIds(user: any): number[] {
    const warehouses = user?.permission?.allowedWarehouses;
    if (!Array.isArray(warehouses)) return [];
    return warehouses
        .map((warehouse: any) => Number(warehouse?.id))
        .filter((id: number) => !Number.isNaN(id));
}

function shouldRestrictOrdersByWarehouse(user: any) {
    if (!user || user.accountType === "ADMIN") return false;
    return getAllowedWarehouseIds(user).length > 0;
}

export async function getCurrentSessionUser() {
    try {
        const session = cookies().get("skynova")?.value;
        if (!session) return null;

        const decoded = await decrypt(session);
        if (!decoded?.userId) return null;

        return await prisma.user.findUnique({
            where: { id: String(decoded.userId) },
            include: { permission: { include: { allowedWarehouses: true } } },
        });
    } catch {
        return null;
    }
}

async function getScopedUserIds(userId: string) {
    const rows = await prisma.user.findMany({
        where: {
            OR: [
                { id: userId },
                { parentId: userId },
            ],
        },
        select: { id: true },
    });

    return rows.map((row) => row.id);
}

const wholesaleOrderItemSelect = {
    id: true,
    quantity: true,
    price: true,
    discount: true,
    productId: true,
    wholesalePriceTierId: true,
    product: {
        select: {
            id: true,
            name: true,
        },
    },
    wholesalePriceTier: {
        select: {
            id: true,
            minQuantity: true,
            maxQuantity: true,
            price: true,
        },
    },
} as const;

const wholesaleOrderBaseSelect = {
    id: true,
    orderNumber: true,
    usdToTryRateAtOrder: true,
    totalAmount: true,
    discount: true,
    finalAmount: true,
    paymentMethod: true,
    receiverName: true,
    receiverPhone: true,
    country: true,
    city: true,
    municipality: true,
    fullAddress: true,
    deliveryNotes: true,
    googleMapsLink: true,
    amount: true,
    amountBank: true,
    deliveryMethod: true,
    additionalNotes: true,
    status: true,
    userId: true,
    wholesaleCustomerId: true,
    shippingId: true,
    shippingPrice: true,
    moneyTransferCommission: true,
    otherCommissions: true,
    createdAt: true,
    manualCreatedAt: true,
    updatedAt: true,
    warehouse: {
        select: {
            id: true,
            name: true,
            location: true,
        },
    },
    shipping: {
        select: {
            id: true,
            name: true,
            price: true,
        },
    },
    user: {
        select: {
            id: true,
            username: true,
            phone: true,
        },
    },
    wholesaleCustomer: {
        select: {
            id: true,
            name: true,
            phone: true,
            country: true,
            city: true,
        },
    },
} as const;

const wholesaleOrderListSelect = {
    ...wholesaleOrderBaseSelect,
} as const;

const wholesaleOrderDetailsSelect = {
    ...wholesaleOrderBaseSelect,
    items: {
        select: wholesaleOrderItemSelect,
    },
} as const;

export async function getWholesaleOrders() {
    const currentUser = await getCurrentSessionUser();
    if (!currentUser) {
        return { success: false, error: "غير مصرح لك بعرض طلبات الجملة" };
    }

    if (!canViewWholesaleOrders(currentUser)) {
        return { success: false, error: "غير مصرح لك بعرض طلبات الجملة" };
    }

    const isAdminUser = currentUser.accountType === "ADMIN";
    const allowedWarehouseLocations = getAllowedWarehouseLocations(currentUser);
    const shouldRestrictByLocation = shouldRestrictOrdersByWarehouseLocation(currentUser);

    const where: any = {};

    if (!isAdminUser) {
        if (shouldRestrictByLocation) {
            if (allowedWarehouseLocations.length === 0) {
                return { success: true, data: [] };
            }

            where.warehouse = {
                location: {
                    in: allowedWarehouseLocations,
                },
            };
        }

        if (shouldRestrictOrdersByWarehouse(currentUser)) {
            where.warehouseId = {
                in: getAllowedWarehouseIds(currentUser),
            };
        }

        if (!isWarehouseRole(currentUser)) {
            const scopedUserIds = await getScopedUserIds(currentUser.id);
            where.userId = {
                in: scopedUserIds.length > 0 ? scopedUserIds : [currentUser.id],
            };
        }
    }

    const orders = await prisma.wholesaleOrder.findMany({
        where,
        orderBy: { createdAt: "desc" },
        select: wholesaleOrderListSelect,
    });

    return { success: true, data: sortOrdersByDisplayDateDesc(orders) };
}

export async function getWholesaleOrderById(orderId: string | number) {
    const currentUser = await getCurrentSessionUser();
    if (!currentUser) {
        return { success: false, error: "غير مصرح لك بعرض طلبات الجملة" };
    }

    if (!canViewWholesaleOrders(currentUser)) {
        return { success: false, error: "غير مصرح لك بعرض طلبات الجملة" };
    }

    const normalizedOrderId = Number(orderId);
    if (Number.isNaN(normalizedOrderId)) {
        return { success: false, error: "معرف الطلب غير صالح" };
    }

    const order = await prisma.wholesaleOrder.findUnique({
        where: { id: normalizedOrderId },
        select: wholesaleOrderDetailsSelect,
    });

    if (!order) {
        return { success: false, error: "الطلب غير موجود" };
    }

    const isAdminUser = currentUser.accountType === "ADMIN";
    const isWarehouseUser = isWarehouseRole(currentUser);
    const shouldRestrictByLocation = shouldRestrictOrdersByWarehouseLocation(currentUser);

    if (!isAdminUser) {
        if (shouldRestrictByLocation) {
            const allowedWarehouseLocations = getAllowedWarehouseLocations(currentUser);
            const orderWarehouseLocation = normalizeWarehouseLocation(order?.warehouse?.location);
            const canAccessWarehouse = allowedWarehouseLocations
                .map((location) => normalizeWarehouseLocation(location))
                .includes(orderWarehouseLocation);

            if (!canAccessWarehouse) {
                return { success: false, error: "غير مصرح لك بعرض هذا الطلب" };
            }
        }

        if (shouldRestrictOrdersByWarehouse(currentUser)) {
            const allowedWarehouseIds = getAllowedWarehouseIds(currentUser);
            if (!allowedWarehouseIds.includes(Number(order.warehouse?.id))) {
                return { success: false, error: "غير مصرح لك بعرض هذا الطلب" };
            }
        }

        if (!isWarehouseUser) {
            const scopedUserIds = await getScopedUserIds(currentUser.id);
            const allowedUserIds = scopedUserIds.length > 0 ? scopedUserIds : [currentUser.id];
            if (!allowedUserIds.includes(String(order.userId))) {
                return { success: false, error: "غير مصرح لك بعرض هذا الطلب" };
            }
        }
    }

    return { success: true, data: order };
}

export async function getWholesaleCustomerList() {
    const currentUser = await getCurrentSessionUser();
    if (!currentUser) {
        return { success: false, error: "غير مصرح لك" };
    }

    if (!canViewWholesaleOrders(currentUser)) {
        return { success: false, error: "غير مصرح لك" };
    }

    const isAdminUser = currentUser.accountType === "ADMIN";
    const allowedCountries = getAllowedWarehouseLocations(currentUser).map((loc) =>
        loc === "سوريا" ? "سوريا" : "تركيا"
    );

    const where: any = {};

    if (!isAdminUser && allowedCountries.length > 0) {
        where.country = { in: allowedCountries };
    }

    const customers = await prisma.wholesaleCustomer.findMany({
        where,
        orderBy: { name: "asc" },
        select: {
            id: true,
            name: true,
            phone: true,
            country: true,
            city: true,
            address: true,
        },
    });

    return { success: true, data: customers };
}

export async function getWholesaleProductCatalog() {
    const currentUser = await getCurrentSessionUser();
    if (!currentUser) {
        return { success: false, error: "غير مصرح لك" };
    }

    if (!canViewWholesaleOrders(currentUser)) {
        return { success: false, error: "غير مصرح لك" };
    }

    const restrictByWarehouse = shouldRestrictOrdersByWarehouse(currentUser);

    const products = await prisma.product.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: {
            id: true,
            name: true,
            stocks: {
                ...(restrictByWarehouse
                    ? { where: { warehouseId: { in: getAllowedWarehouseIds(currentUser) } } }
                    : {}),
                select: {
                    id: true,
                    quantity: true,
                    price: true,
                    discount: true,
                    warehouse: {
                        select: {
                            id: true,
                            location: true,
                        },
                    },
                },
            },
            wholesalePriceTiers: {
                orderBy: { minQuantity: "asc" },
                select: {
                    id: true,
                    minQuantity: true,
                    maxQuantity: true,
                    price: true,
                },
            },
        },
    });

    return { success: true, data: products };
}

export async function getWholesalePriceTierForQuantity(productId: number | string, quantity: number | string) {
    const parsedProductId = Number(productId);
    const parsedQuantity = Number(quantity);

    if (Number.isNaN(parsedProductId) || parsedProductId <= 0) {
        return { success: false, error: "معرف المنتج غير صالح" };
    }

    if (Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
        return { success: false, error: "الكمية غير صالحة" };
    }

    const tiers = await prisma.productWholesalePriceTier.findMany({
        where: { productId: parsedProductId },
        orderBy: { minQuantity: "asc" },
    });

    const tier = tiers.find((t) => {
        const min = Number(t.minQuantity || 0);
        const max = t.maxQuantity != null ? Number(t.maxQuantity) : null;
        return parsedQuantity >= min && (max === null || parsedQuantity <= max);
    });

    return { success: true, data: tier || null };
}

export async function createWholesaleOrder(data: any, items: any[], userId: string) {
    try {
        const orderNumber = `WHL-${Date.now()}`;
        const manualCreatedAt = parseOptionalDate(data?.manualCreatedAt);

        const result = await prisma.$transaction(async (tx) => {
            const inputWarehouseId = Number(data.warehouseId || 0);
            const orderWarehouse = inputWarehouseId > 0
                ? await tx.warehouse.findUnique({ where: { id: inputWarehouseId }, select: { id: true, location: true } })
                : null;

            const stockCountry = String(data.stockCountry || orderWarehouse?.location || "").trim();

            if (!orderWarehouse && !stockCountry) {
                throw new Error("يرجى اختيار مستودع أو بلد المخزون");
            }

            const fallbackWarehouse = orderWarehouse || (stockCountry
                ? await tx.warehouse.findFirst({
                    where: { location: stockCountry },
                    orderBy: { id: "asc" },
                    select: { id: true, location: true }
                })
                : null);

            if (!fallbackWarehouse) {
                throw new Error("لم يتم العثور على مستودع مطابق");
            }

            const inputExchangeRate = Number(data.usdToTryRateAtOrder || 0);
            const usdToTryRateAtOrder = fallbackWarehouse.location === "تركيا"
                ? (inputExchangeRate > 0 ? inputExchangeRate : DEFAULT_TURKEY_EXCHANGE_RATE)
                : null;

            const itemCreates: any[] = [];
            for (const item of items) {
                const productId = parseInt(item.productId);
                const quantity = parseInt(item.quantity);
                const tier = item.wholesalePriceTierId
                    ? await tx.productWholesalePriceTier.findUnique({
                        where: { id: parseInt(item.wholesalePriceTierId) },
                    })
                    : null;

                const price = tier ? Number(tier.price) : parseFloat(item.price);
                const discount = parseFloat(item.discount || 0);

                itemCreates.push({
                    productId,
                    quantity,
                    price,
                    discount,
                    wholesalePriceTierId: tier ? tier.id : null,
                });
            }

            const newOrder = await tx.wholesaleOrder.create({
                data: {
                    orderNumber,
                    usdToTryRateAtOrder,
                    totalAmount: data.grandTotal + data.overallDiscount,
                    discount: data.overallDiscount,
                    finalAmount: data.grandTotal,
                    status: data.status || "PENDING",
                    paymentMethod: data.paymentMethod || "عند الاستلام",
                    receiverName: data.receiverName,
                    receiverPhone: Array.isArray(data.receiverPhone)
                        ? data.receiverPhone
                        : data.receiverPhone ? [data.receiverPhone] : [],
                    country: data.country,
                    city: data.city,
                    municipality: data.municipality,
                    fullAddress: data.fullAddress,
                    googleMapsLink: data.googleMapsLink,
                    manualCreatedAt,
                    amount: data.amount,
                    amountBank: String(data.amountBank),
                    deliveryMethod: data.deliveryMethod,
                    deliveryNotes: data.deliveryNotes,
                    additionalNotes: data.additionalNotes,
                    wholesaleCustomer: { connect: { id: data.wholesaleCustomerId } },
                    user: { connect: { id: userId } },
                    warehouse: { connect: { id: fallbackWarehouse.id } },
                    items: {
                        create: itemCreates,
                    }
                }
            });

            for (const item of items) {
                const productId = parseInt(item.productId);
                const remaining = parseInt(item.quantity);

                const stock = await tx.productStock.findUnique({
                    where: {
                        productId_warehouseId: {
                            productId,
                            warehouseId: fallbackWarehouse.id,
                        }
                    }
                });

                if (!stock) {
                    throw new Error(`المنتج رقم ${productId} غير موجود في المستودع المختار`);
                }

                const currentQty = Number(stock.quantity) || 0;
                if (currentQty < remaining) {
                    throw new Error(`الكمية المطلوبة للمنتج رقم ${productId} غير متوفرة في المستودع المختار`);
                }

                await tx.productStock.update({
                    where: { id: stock.id },
                    data: { quantity: currentQty - remaining }
                });
            }

            return newOrder;
        });

        return { success: true, order: result };
    } catch (error: any) {
        console.error("Error creating wholesale order:", error);
        return { success: false, error: error.message };
    }
}

export async function updateWholesaleOrder(data: any, id: any, items: any) {
    try {
        const oldOrder = await prisma.wholesaleOrder.findUnique({
            where: { id },
            include: { items: true, warehouse: true }
        });

        if (!oldOrder) return { success: false, error: "الطلب غير موجود" };

        return await prisma.$transaction(async (tx) => {
            const inputWarehouseId = Number(data.warehouseId || oldOrder.warehouseId || 0);
            const orderWarehouse = inputWarehouseId > 0
                ? await tx.warehouse.findUnique({ where: { id: inputWarehouseId }, select: { id: true, location: true } })
                : null;

            const stockCountry = String(data.stockCountry || orderWarehouse?.location || oldOrder.warehouse?.location || "").trim();
            const oldOrderSavedRate = Number((oldOrder as any)?.usdToTryRateAtOrder || 0);
            const inputExchangeRate = Number(data.usdToTryRateAtOrder || 0);
            const usdToTryRateAtOrder = orderWarehouse?.location === "تركيا" || (!orderWarehouse && stockCountry === "تركيا")
                ? (inputExchangeRate > 0
                    ? inputExchangeRate
                    : (oldOrderSavedRate > 0
                        ? oldOrderSavedRate
                        : DEFAULT_TURKEY_EXCHANGE_RATE))
                : null;
            const manualCreatedAt = parseOptionalDate(data?.manualCreatedAt);

            const fallbackWarehouse = orderWarehouse || (stockCountry
                ? await tx.warehouse.findFirst({
                    where: { location: stockCountry },
                    orderBy: { id: "asc" },
                    select: { id: true, location: true }
                })
                : null);

            if (!fallbackWarehouse) {
                throw new Error("لم يتم العثور على مستودع مطابق");
            }

            if (fallbackWarehouse) {
                for (const oldItem of oldOrder.items) {
                    const stock = await tx.productStock.findUnique({
                        where: {
                            productId_warehouseId: {
                                productId: oldItem.productId,
                                warehouseId: fallbackWarehouse.id,
                            }
                        }
                    });

                    if (stock) {
                        await tx.productStock.update({
                            where: { id: stock.id },
                            data: { quantity: (Number(stock.quantity) || 0) + oldItem.quantity }
                        });
                    }
                }
            }

            const itemCreates: any[] = [];
            for (const item of items) {
                const productId = parseInt(item.productId);
                const quantity = parseInt(item.quantity);
                const tier = item.wholesalePriceTierId
                    ? await tx.productWholesalePriceTier.findUnique({
                        where: { id: parseInt(item.wholesalePriceTierId) },
                    })
                    : null;

                const price = tier ? Number(tier.price) : parseFloat(item.price);
                const discount = parseFloat(item.discount || 0);

                itemCreates.push({
                    productId,
                    quantity,
                    price,
                    discount,
                    wholesalePriceTierId: tier ? tier.id : null,
                });
            }

            const updatedOrder = await tx.wholesaleOrder.update({
                where: { id },
                data: {
                    usdToTryRateAtOrder,
                    totalAmount: data.grandTotal + data.overallDiscount,
                    discount: data.overallDiscount,
                    finalAmount: data.grandTotal,
                    status: data.status,
                    paymentMethod: data.paymentMethod || "عند الاستلام",
                    receiverName: data.receiverName,
                    receiverPhone: data.receiverPhone,
                    country: data.country,
                    city: data.city,
                    municipality: data.municipality,
                    fullAddress: data.fullAddress,
                    googleMapsLink: data.googleMapsLink,
                    amountBank: String(data.amountBank),
                    amount: data.amount,
                    deliveryMethod: data.deliveryMethod,
                    deliveryNotes: data.deliveryNotes,
                    additionalNotes: data.additionalNotes,
                    wholesaleCustomer: { connect: { id: data.wholesaleCustomerId } },
                    user: data.userId ? { connect: { id: data.userId } } : oldOrder.userId ? { connect: { id: oldOrder.userId } } : undefined,
                    manualCreatedAt,
                    warehouse: { connect: { id: fallbackWarehouse.id } },
                    items: {
                        deleteMany: {},
                        create: itemCreates,
                    }
                }
            });

            if (fallbackWarehouse) {
                for (const newItem of items) {
                    const productId = parseInt(newItem.productId);
                    const remaining = parseInt(newItem.quantity);

                    const stock = await tx.productStock.findUnique({
                        where: {
                            productId_warehouseId: {
                                productId,
                                warehouseId: fallbackWarehouse.id,
                            }
                        }
                    });

                    if (!stock) {
                        throw new Error(`المنتج رقم ${productId} غير موجود في المستودع المختار`);
                    }

                    const currentQty = Number(stock.quantity) || 0;
                    if (currentQty < remaining) {
                        throw new Error(`الكمية المطلوبة للمنتج رقم ${productId} غير متوفرة في المستودع المختار`);
                    }

                    await tx.productStock.update({
                        where: { id: stock.id },
                        data: { quantity: currentQty - remaining }
                    });
                }
            }

            return { success: true, data: updatedOrder };
        }, {
            maxWait: 5000,
            timeout: 20000
        });

    } catch (error: any) {
        console.error("Critical Update Wholesale Order Error:", error);
        return { success: false, error: "حدث خطأ في قاعدة البيانات، يرجى المحاولة مرة أخرى" };
    }
}

export async function deleteWholesaleOrder(id: any) {
    try {
        const oldOrder = await prisma.wholesaleOrder.findUnique({
            where: { id },
            include: { items: true, warehouse: true }
        });

        if (!oldOrder) return { success: false, error: "الطلب غير موجود" };

        return await prisma.$transaction(async (tx) => {
            const warehouseId = oldOrder.warehouseId ? Number(oldOrder.warehouseId) : null;

            if (warehouseId && !Number.isNaN(warehouseId)) {
                for (const item of oldOrder.items) {
                    const stock = await tx.productStock.findUnique({
                        where: {
                            productId_warehouseId: {
                                productId: item.productId,
                                warehouseId,
                            }
                        }
                    });

                    if (stock) {
                        await tx.productStock.update({
                            where: { id: stock.id },
                            data: { quantity: (Number(stock.quantity) || 0) + item.quantity }
                        });
                    }
                }
            } else {
                const stockCountry = String(oldOrder.warehouse?.location || "").trim();

                if (stockCountry) {
                    for (const item of oldOrder.items) {
                        const stock = await tx.productStock.findFirst({
                            where: {
                                productId: item.productId,
                                warehouse: { location: stockCountry }
                            },
                            orderBy: { quantity: "desc" }
                        });

                        if (stock) {
                            await tx.productStock.update({
                                where: { id: stock.id },
                                data: { quantity: (Number(stock.quantity) || 0) + item.quantity }
                            });
                        }
                    }
                }
            }

            await tx.wholesaleOrder.delete({
                where: { id }
            });

            return { success: true };
        }, {
            maxWait: 5000,
            timeout: 20000
        });

    } catch (error: any) {
        console.error("Delete Wholesale Order Error:", error);
        return {
            success: false,
            error: error.message || "حدث خطأ أثناء محاولة حذف الطلب"
        };
    }
}

export async function updateWholesaleOrderStatus(status: any, id: any) {
    try {
        const nextStatus = String(status || "").trim();
        const orderId = Number(id);

        if (!nextStatus) {
            return { success: false, error: "حالة الطلب غير صالحة" };
        }

        if (!Number.isFinite(orderId)) {
            return { success: false, error: "معرف الطلب غير صالح" };
        }

        const updatedStatus = await prisma.$transaction(async (tx) => {
            const existingOrder = await tx.wholesaleOrder.findUnique({
                where: { id: orderId },
                include: {
                    items: {
                        select: {
                            productId: true,
                            quantity: true,
                        },
                    },
                    warehouse: {
                        select: {
                            location: true,
                        },
                    },
                },
            });

            if (!existingOrder) {
                throw new Error("الطلب غير موجود");
            }

            const previousStatus = String(existingOrder.status || "").trim();
            const wasReturned = isStockReturnStatus(previousStatus);
            const willBeReturned = isStockReturnStatus(nextStatus);

            if (!wasReturned && willBeReturned) {
                await applyWholesaleOrderStockChange(tx, existingOrder, "restore");
            }

            if (wasReturned && !willBeReturned) {
                await applyWholesaleOrderStockChange(tx, existingOrder, "reserve");
            }

            const updated = await tx.wholesaleOrder.update({
                where: { id: orderId },
                data: { status: nextStatus },
            });

            return updated;
        });

        return { success: true, data: updatedStatus };
    } catch (error: any) {
        console.error("Update Wholesale Order Status Error:", error);
        return { success: false, error: error.message || "حدث خطأ أثناء تحديث الحالة" };
    }
}
