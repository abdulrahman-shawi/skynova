// دوال مساعدة لطلبات الجملة

export const getWholesaleEffectivePrice = (price: number, discount: number) => {
  return Math.max(0, Number(price || 0) - Number(discount || 0));
};

export const getWholesaleOrderCurrencySymbol = (orderLike: any) =>
  String(orderLike?.warehouse?.location || "").trim() === "تركيا" ? "₺" : "$";

export const getWholesaleOrderShippingName = (orderLike: any) =>
  String(orderLike?.shipping?.name || "").trim() || "غير محدد";

export const getWholesaleOrderShippingPrice = (orderLike: any) => {
  return Number((orderLike?.shippingPrice ?? orderLike?.shipping?.price) || 0);
};

export const getWholesaleOrderShippingCommissions = (orderLike: any) => {
  const moneyTransferCommission = Number(orderLike?.moneyTransferCommission || 0);
  const otherCommissions = Number(orderLike?.otherCommissions || 0);
  return {
    moneyTransferCommission,
    otherCommissions,
  };
};

export const getWholesaleOrderTotalShippingExpenses = (orderLike: any) => {
  const shippingPrice = getWholesaleOrderShippingPrice(orderLike);
  const { moneyTransferCommission, otherCommissions } = getWholesaleOrderShippingCommissions(orderLike);
  return shippingPrice + moneyTransferCommission + otherCommissions;
};

export const getWholesaleAmountToCollect = (orderLike: any) => {
  const paymentMethod = String(orderLike?.paymentMethod || "").trim();
  const finalAmount = Number(orderLike?.finalAmount || 0);
  const receivedAmount = Number(orderLike?.amount || 0);
  const remainingAmount = Number(orderLike?.amountBank || (finalAmount - receivedAmount) || 0);

  if (paymentMethod === "تحويل بنكي") {
    return 0;
  }

  if (paymentMethod === "مختلطة") {
    return Math.max(0, remainingAmount);
  }

  return Math.max(0, finalAmount);
};

export const getWholesaleNetAmountAfterShipping = (orderLike: any) => {
  return getWholesaleAmountToCollect(orderLike) - getWholesaleOrderTotalShippingExpenses(orderLike);
};

export const getWholesaleDisplayDate = (orderLike: any) =>
  orderLike?.manualCreatedAt || orderLike?.createdAt;

export const getMonthKey = (dateValue: Date | string | number) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
};

export const getCurrentMonthKey = () => getMonthKey(new Date());

export const getPreviousMonthKey = () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return getMonthKey(date);
};

export const normalizeText = (value: unknown) => String(value || "").trim().toLowerCase();

export const statusCardColors: Record<string, string> = {
  "الكل": "bg-slate-900 text-white border-slate-900",
  "طلب جديد": "bg-sky-200 text-sky-900 border-sky-300",
  "تم استلام الطلب": "bg-blue-200 text-blue-900 border-blue-300",
  "تم ارسال الطلب": "bg-amber-200 text-amber-900 border-amber-300",
  "تم تسليم الطلب": "bg-emerald-200 text-emerald-900 border-emerald-300",
  "فشل التسليم مرتجع": "bg-red-600 text-white border-red-700",
  "تم الغاء الطلب": "bg-rose-200 text-rose-900 border-rose-300",
  "معلق / نقص معلومات": "bg-gray-200 text-gray-900 border-gray-300",
  "المتجر": "bg-purple-200 text-purple-900 border-purple-300",
};

export const statusColors: Record<string, string> = {
  "طلب جديد": "bg-sky-200 text-sky-900 border-sky-300 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800",
  "تم استلام الطلب": "bg-blue-200 text-blue-900 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  "تم ارسال الطلب": "bg-yellow-200 text-yellow-900 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
  "تم تسليم الطلب": "bg-green-200 text-green-900 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
  "فشل التسليم مرتجع": "bg-red-600 text-white border-red-700 dark:bg-red-900/40 dark:text-red-200 dark:border-red-800",
  "تم الغاء الطلب": "bg-red-200 text-red-900 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  "معلق / نقص معلومات": "bg-gray-200 text-gray-900 border-gray-300 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
  "المتجر": "bg-purple-200 text-purple-900 border-purple-800 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
};

export const statusToDbValue: Record<string, string> = {
  "طلب جديد": "PENDING",
  "تم استلام الطلب": "PROCESSING",
  "تم ارسال الطلب": "SHIPPED",
  "تم تسليم الطلب": "DELIVERED",
  "فشل التسليم مرتجع": "RETURNED",
  "تم الغاء الطلب": "CANCELLED",
  "معلق / نقص معلومات": "ON_HOLD",
  "المتجر": "STORE",
};

export const dbValueToStatus: Record<string, string> = {
  "PENDING": "طلب جديد",
  "PROCESSING": "تم استلام الطلب",
  "SHIPPED": "تم ارسال الطلب",
  "DELIVERED": "تم تسليم الطلب",
  "RETURNED": "فشل التسليم مرتجع",
  "CANCELLED": "تم الغاء الطلب",
  "ON_HOLD": "معلق / نقص معلومات",
  "STORE": "المتجر",
};

export const statusOptions = [
  "طلب جديد",
  "تم استلام الطلب",
  "تم ارسال الطلب",
  "تم تسليم الطلب",
  "فشل التسليم مرتجع",
  "تم الغاء الطلب",
  "معلق / نقص معلومات",
  "المتجر",
  "الكل",
];

export const getApplicableWholesalePriceTier = (tiers: any[], quantity: number) => {
  const parsedQuantity = Number(quantity || 0);
  if (parsedQuantity <= 0 || !Array.isArray(tiers) || tiers.length === 0) return null;

  return tiers.find((tier) => {
    const min = Number(tier?.minQuantity || 0);
    const max = tier?.maxQuantity != null ? Number(tier.maxQuantity) : null;
    return parsedQuantity >= min && (max === null || parsedQuantity <= max);
  }) || null;
};
