'use server'

import { decrypt } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getOrders } from "@/server/order";

const DELIVERED_STATUSES = new Set(["تم تسليم الطلب", "تم التسليم", "مدفوعة"]);

const normalizeNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isSameDay = (value: Date | string | null | undefined, today = new Date()) => {
  if (!value) return false;
  const date = new Date(value);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};

const getOrderEffectiveDate = (orderLike: any) => orderLike?.manualCreatedAt || orderLike?.createdAt || null;

const DEFAULT_TURKEY_EXCHANGE_RATE = 44;

const resolveOrderExchangeRate = (orderLike: any) => {
  const snapshotRate = Number(orderLike?.usdToTryRateAtOrder || 0);
  return snapshotRate > 0 ? snapshotRate : DEFAULT_TURKEY_EXCHANGE_RATE;
};

const convertToUSD = (value: unknown, orderLike: any) => {
  const amount = normalizeNumber(value);
  const isTurkey = String(orderLike?.warehouse?.location || "").trim() === "تركيا";
  if (!isTurkey) return amount;
  const rate = resolveOrderExchangeRate(orderLike);
  return rate > 0 ? amount / rate : amount;
};

const getShippingCharge = (orderLike: any) => {
  return Math.max(0, convertToUSD(orderLike?.shippingPrice ?? orderLike?.shipping?.price, orderLike));
};

const getBankTransferReceivedAmount = (orderLike: any) => {
  const paymentMethod = String(orderLike?.paymentMethod || "").trim();
  if (paymentMethod === "تحويل بنكي") {
    return Math.max(0, convertToUSD(orderLike?.finalAmount, orderLike));
  }

  if (paymentMethod === "مختلطة") {
    return Math.max(0, convertToUSD(orderLike?.amount, orderLike));
  }

  return 0;
};

const getCarrierCollectionBaseAmount = (orderLike: any) => {
  const paymentMethod = String(orderLike?.paymentMethod || "").trim();
  if (paymentMethod === "تحويل بنكي") {
    return 0;
  }

  if (paymentMethod === "مختلطة") {
    return Math.max(0, convertToUSD(orderLike?.amountBank, orderLike));
  }

  return Math.max(0, convertToUSD(orderLike?.finalAmount, orderLike));
};

const getCarrierCollectionWithShipping = (orderLike: any) => {
  return Math.max(0, getCarrierCollectionBaseAmount(orderLike));
};

const getCarrierCollectionNetReceived = (orderLike: any) => {
  return Math.max(0, getCarrierCollectionBaseAmount(orderLike) - getShippingCharge(orderLike));
};

async function getCurrentSessionUser() {
  try {
    const session = cookies().get("skynova")?.value;
    if (!session) return null;

    const decoded = await decrypt(session);
    if (!decoded?.userId) return null;

    return await prisma.user.findUnique({
      where: { id: String(decoded.userId) },
      include: { permission: true },
    });
  } catch {
    return null;
  }
}

async function hasCarrierCollectionColumns() {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND lower(table_name) = lower('Order')
        AND lower(column_name) = lower('carrierCollectionReceivedAt')
    ) AS exists
  `;

  return Boolean(rows?.[0]?.exists);
}

async function getCarrierCollectionTrackingMap(orderIds: number[]) {
  if (orderIds.length === 0) {
    return { supported: false, entries: new Map<number, any>() };
  }

  const supported = await hasCarrierCollectionColumns();
  if (!supported) {
    return { supported: false, entries: new Map<number, any>() };
  }

  const rows = await prisma.$queryRaw<Array<{
    id: number;
    carrierCollectionReceivedAt: Date | null;
    carrierCollectionReceivedAmount: number | null;
    carrierCollectionNotes: string | null;
  }>>(Prisma.sql`
    SELECT
      "id",
      "carrierCollectionReceivedAt",
      "carrierCollectionReceivedAmount",
      "carrierCollectionNotes"
    FROM "Order"
    WHERE "id" IN (${Prisma.join(orderIds)})
  `);

  return {
    supported: true,
    entries: new Map(rows.map((row) => [Number(row.id), row])),
  };
}

const canManageCollections = (user: any) => {
  if (!user) return false;
  if (user.accountType === "ADMIN") return true;
  return Boolean(user?.permission?.editOrders);
};

export async function getCollectionsDashboardData() {
  const ordersResult = await getOrders();
  if (!ordersResult.success) {
    return ordersResult;
  }

  const orders = Array.isArray(ordersResult.data) ? ordersResult.data : [];
  const orderIds = orders.map((order: any) => Number(order.id)).filter((id) => Number.isFinite(id));
  const tracking = await getCarrierCollectionTrackingMap(orderIds);

  const bankTransfers = orders
    .map((order: any) => {
      const receivedAmount = getBankTransferReceivedAmount(order);
      if (receivedAmount <= 0) return null;

      return {
        ...order,
        collectionAmount: receivedAmount,
      };
    })
    .filter(Boolean);

  const carrierCollectionsBase = orders
    .filter((order: any) => DELIVERED_STATUSES.has(String(order?.status || "").trim()))
    .map((order: any) => {
      const baseAmount = getCarrierCollectionBaseAmount(order);
      if (baseAmount <= 0) return null;

      const trackingEntry = tracking.entries.get(Number(order.id));
      const shippingCharge = getShippingCharge(order);

      return {
        ...order,
        collectionBaseAmount: baseAmount,
        shippingCharge,
        collectionWithShipping: getCarrierCollectionWithShipping(order),
        collectionNetReceived: getCarrierCollectionNetReceived(order),
        carrierCollectionReceivedAt: trackingEntry?.carrierCollectionReceivedAt || null,
        carrierCollectionReceivedAmount: trackingEntry?.carrierCollectionReceivedAmount ?? null,
        carrierCollectionNotes: trackingEntry?.carrierCollectionNotes ?? null,
      };
    })
    .filter(Boolean);

  const carrierCollectionsPending = carrierCollectionsBase.filter(
    (order: any) => !order.carrierCollectionReceivedAt
  );

  const carrierCollectionsReceived = carrierCollectionsBase.filter(
    (order: any) => Boolean(order.carrierCollectionReceivedAt)
  );

  return {
    success: true,
    data: {
      supportsCarrierCollectionTracking: tracking.supported,
      bankTransfers,
      carrierCollectionsPending,
      carrierCollectionsReceived,
      summaries: {
        bankTransfersTotal: bankTransfers.reduce((sum: number, order: any) => sum + normalizeNumber(order.collectionAmount), 0),
        carrierPendingTotal: carrierCollectionsPending.reduce((sum: number, order: any) => sum + normalizeNumber(order.collectionWithShipping), 0),
        carrierReceivedTotal: carrierCollectionsReceived.reduce((sum: number, order: any) => {
          const overrideAmount = order.carrierCollectionReceivedAmount;
          return sum + (overrideAmount != null ? normalizeNumber(overrideAmount) : normalizeNumber(order.collectionNetReceived));
        }, 0),
      },
    },
  };
}

const isWithinRange = (orderLike: any, startDate?: Date | null, endDate?: Date | null) => {
  const rawDate = getOrderEffectiveDate(orderLike);
  if (!rawDate) return false;

  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return false;

  if (startDate && date < startDate) return false;
  if (endDate) {
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);
    if (date > endOfDay) return false;
  }

  return true;
};

const getPeriodRange = (period: "today" | "this_month" | "last_month" | "custom", customStartDate?: string, customEndDate?: string) => {
  const now = new Date();

  if (period === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { start, end: now };
  }

  if (period === "this_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999) };
  }

  if (period === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { start, end };
  }

  const start = customStartDate ? new Date(customStartDate) : null;
  const end = customEndDate ? new Date(customEndDate) : null;
  return { start, end };
};

export async function getCollectionsDashboardByPeriod(config?: {
  period?: "today" | "this_month" | "last_month" | "custom";
  customStartDate?: string;
  customEndDate?: string;
}) {
  const period = config?.period ?? "today";
  const { start, end } = getPeriodRange(period, config?.customStartDate, config?.customEndDate);

  const ordersResult = await getOrders();
  if (!ordersResult.success || !Array.isArray(ordersResult.data)) {
    return {
      ordersToday: 0,
      totalSales: 0,
      collected: 0,
      debts: 0,
      shippingPending: 0,
      delivered: 0,
      returned: 0,
      problemOrders: 0,
    };
  }

  const filteredOrders = ordersResult.data.filter((order: any) => isWithinRange(order, start, end));
  const filteredOrderIds = new Set(
    filteredOrders.map((order: any) => Number(order?.id)).filter((id) => Number.isFinite(id))
  );

  const totalSales = filteredOrders.reduce((sum: number, order: any) => sum + normalizeNumber(order?.finalAmount), 0);

  const collectionsResult = await getCollectionsDashboardData();
  const collectionsData = (collectionsResult && typeof collectionsResult === "object" && "success" in collectionsResult && collectionsResult.success && "data" in collectionsResult)
    ? (collectionsResult as any).data ?? null
    : null;

  const matchedBankTransfers = Array.isArray(collectionsData?.bankTransfers)
    ? collectionsData.bankTransfers.filter((order: any) => filteredOrderIds.has(Number(order?.id)))
    : [];

  const matchedCarrierReceived = Array.isArray(collectionsData?.carrierCollectionsReceived)
    ? collectionsData.carrierCollectionsReceived.filter((order: any) => filteredOrderIds.has(Number(order?.id)))
    : [];

  const collected = matchedBankTransfers.reduce((sum: number, order: any) => sum + normalizeNumber(order?.collectionAmount), 0)
    + matchedCarrierReceived.reduce((sum: number, order: any) => {
      const overrideAmount = order?.carrierCollectionReceivedAmount;
      return sum + (overrideAmount != null ? normalizeNumber(overrideAmount) : normalizeNumber(order?.collectionNetReceived));
    }, 0);

  const debts = Math.max(0, totalSales - collected);

  const shippingPending = filteredOrders.filter((order: any) => {
    const status = String(order?.status || "").trim();
    return ["قيد الشحن", "في الطريق", "في انتظار الشحن", "معلق"].includes(status);
  }).length;

  const delivered = filteredOrders.filter((order: any) => {
    const status = String(order?.status || "").trim();
    return ["تم التسليم", "تم تسليم الطلب", "مدفوعة"].includes(status);
  }).length;

  const returned = filteredOrders.filter((order: any) => {
    const status = String(order?.status || "").trim();
    return ["مرتجع", "ملغي", "تم الإلغاء", "إلغاء"].includes(status);
  }).length;

  const problemOrders = filteredOrders.filter((order: any) => {
    const status = String(order?.status || "").trim();
    const missingShipping = !order?.shipping && !order?.shippingName && !order?.shippingPrice;
    const unclearPayment = !order?.paymentMethod || order.paymentMethod === "غير محدد";
    const hasProblemFlag = Boolean(order?.hasProblem || order?.problem || order?.needsReview);

    return hasProblemFlag || missingShipping || unclearPayment || ["مشكلة", "لديه مشكلة"].includes(status);
  }).length;

  return {
    ordersToday: filteredOrders.length,
    totalSales,
    collected,
    debts,
    shippingPending,
    delivered,
    returned,
    problemOrders,
  };
}

export async function getTodayDashboard() {
  return getCollectionsDashboardByPeriod({ period: "today" });
}

export async function markCarrierCollectionReceived(orderId: number, receivedAmount?: number | null, notes?: string | null) {
  const currentUser = await getCurrentSessionUser();
  if (!currentUser || !canManageCollections(currentUser)) {
    return { success: false, error: "غير مصرح لك بتعديل التحصيلات" };
  }

  const supported = await hasCarrierCollectionColumns();
  if (!supported) {
    return { success: false, error: "يجب تنفيذ ترحيل Prisma أولاً لتفعيل تتبع التحصيلات المستلمة" };
  }

  const normalizedOrderId = Number(orderId);
  if (!Number.isFinite(normalizedOrderId)) {
    return { success: false, error: "معرف الطلب غير صالح" };
  }

  await prisma.$executeRaw(Prisma.sql`
    UPDATE "Order"
    SET
      "carrierCollectionReceivedAt" = NOW(),
      "carrierCollectionReceivedAmount" = ${receivedAmount == null ? null : normalizeNumber(receivedAmount)},
      "carrierCollectionNotes" = ${notes == null ? null : String(notes).trim() || null}
    WHERE "id" = ${normalizedOrderId}
  `);

  revalidatePath("/dashboard/collections");
  return { success: true };
}

export async function clearCarrierCollectionReceived(orderId: number) {
  const currentUser = await getCurrentSessionUser();
  if (!currentUser || !canManageCollections(currentUser)) {
    return { success: false, error: "غير مصرح لك بتعديل التحصيلات" };
  }

  const supported = await hasCarrierCollectionColumns();
  if (!supported) {
    return { success: false, error: "يجب تنفيذ ترحيل Prisma أولاً لتفعيل تتبع التحصيلات المستلمة" };
  }

  const normalizedOrderId = Number(orderId);
  if (!Number.isFinite(normalizedOrderId)) {
    return { success: false, error: "معرف الطلب غير صالح" };
  }

  await prisma.$executeRaw(Prisma.sql`
    UPDATE "Order"
    SET
      "carrierCollectionReceivedAt" = NULL,
      "carrierCollectionReceivedAmount" = NULL,
      "carrierCollectionNotes" = NULL
    WHERE "id" = ${normalizedOrderId}
  `);

  revalidatePath("/dashboard/collections");
  return { success: true };
}