"use client";

import * as React from "react";
import * as XLSX from "xlsx";
import { Landmark, HandCoins, Wallet, RefreshCw, Download } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { hasAnyPermission } from "@/lib/utils";
import {
  clearCarrierCollectionReceived,
  getCollectionsDashboardByPeriod,
  getCollectionsDashboardData,
  markCarrierCollectionReceived,
} from "@/server/collections";
import { getOrders } from "@/server/order";

type CollectionsPayload = {
  supportsCarrierCollectionTracking: boolean;
  bankTransfers: any[];
  carrierCollectionsPending: any[];
  carrierCollectionsReceived: any[];
  summaries: {
    bankTransfersTotal: number;
    carrierPendingTotal: number;
    carrierReceivedTotal: number;
  };
};

type UnifiedCollectionRow = {
  rowKey: string;
  source: "bank" | "carrier";
  sourceLabel: string;
  amountUsd: number;
  amountTry: number;
  row: any;
};

const paymentMethodOptions = ["الكل", "تحويل بنكي", "مختلطة", "عند الاستلام"] as const;
const countryFilterOptions = ["الكل", "سوريا", "تركيا"] as const;
const rowsPerPageOptions = [10, 25, 50, 100] as const;
const DEFAULT_TURKEY_EXCHANGE_RATE = 44;

const formatMoney = (amount: number, currency: "$" | "₺" = "$") => {
  return `${Number(amount || 0).toLocaleString()} ${currency}`;
};

const getExchangeRate = (row: any) => {
  const rate = Number(row?.usdToTryRateAtOrder || 0);
  return rate > 0 ? rate : DEFAULT_TURKEY_EXCHANGE_RATE;
};

const toTryAmount = (amountUsd: number, row: any) => {
  return Number(amountUsd || 0) * getExchangeRate(row);
};

const getRowDateValue = (row: any) => {
  return row?.carrierCollectionReceivedAt || row?.manualCreatedAt || row?.createdAt || null;
};

const getMonthValue = (row: any) => {
  const value = getRowDateValue(row);
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const formatMonthLabel = (monthValue: string) => {
  const [year, month] = monthValue.split("-");
  if (!year || !month) return monthValue;

  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return monthValue;

  return date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
  });
};

const getDisplayDate = (row: any) => {
  const value = getRowDateValue(row);
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  tone: "blue" | "amber" | "emerald";
}) {
  const tones = {
    blue: "from-blue-600 to-cyan-500 text-blue-600",
    amber: "from-amber-500 to-orange-500 text-amber-600",
    emerald: "from-emerald-500 to-green-500 text-emerald-600",
  };

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-bold text-slate-500 dark:text-slate-400">{title}</div>
          <div className={`mt-3 text-3xl font-black ${tones[tone].split(" ")[2]}`}>{value}</div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{subtitle}</div>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${tones[tone].split(" ").slice(0, 2).join(" ")} text-white shadow-lg`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function SectionTable({
  title,
  description,
  rows,
  emptyMessage,
  amountLabel,
  getAmount,
  getTryAmount,
  actionLabel,
  onAction,
  actionVariant = "primary",
}: {
  title: string;
  description: string;
  rows: any[];
  emptyMessage: string;
  amountLabel: string;
  getAmount: (row: any) => string;
  getTryAmount?: (row: any) => string;
  actionLabel?: string;
  onAction?: (row: any) => void;
  actionVariant?: "primary" | "danger";
}) {
  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">{title}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {rows.length} طلب
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-right text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-3 py-3 font-bold">رقم الطلب</th>
                <th className="px-3 py-3 font-bold">العميل</th>
                <th className="px-3 py-3 font-bold">طريقة الدفع</th>
                <th className="px-3 py-3 font-bold">الحالة</th>
                <th className="px-3 py-3 font-bold">شركة الشحن</th>
                <th className="px-3 py-3 font-bold">{amountLabel}</th>
                {getTryAmount && <th className="px-3 py-3 font-bold">بالتركي تقريبًا</th>}
                <th className="px-3 py-3 font-bold">التاريخ</th>
                {actionLabel && <th className="px-3 py-3 font-bold">الإجراء</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/70">
                  <td className="px-3 py-3 font-black text-blue-600">#{row.orderNumber}</td>
                  <td className="px-3 py-3 font-bold text-slate-800 dark:text-slate-100">{row.customer?.name || row.receiverName || "-"}</td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{row.paymentMethod || "-"}</td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{row.status || "-"}</td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{row.shipping?.name || "-"}</td>
                  <td className="px-3 py-3 font-black text-emerald-600">{getAmount(row)}</td>
                  {getTryAmount && <td className="px-3 py-3 font-bold text-amber-600 dark:text-amber-300">{getTryAmount(row)}</td>}
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{getDisplayDate(row)}</td>
                  {actionLabel && onAction && (
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => onAction(row)}
                        className={`rounded-xl px-3 py-2 text-xs font-black transition-colors ${
                          actionVariant === "danger"
                            ? "bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-300"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        {actionLabel}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function UnifiedCollectionsTable({
  rows,
  currentPage,
  pageSize,
  totalPages,
  totalRows,
  canManage,
  canTrack,
  onPageChange,
  onPageSizeChange,
  onExport,
  onMarkReceived,
}: {
  rows: UnifiedCollectionRow[];
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalRows: number;
  canManage: boolean;
  canTrack: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onExport: () => void;
  onMarkReceived: (row: any) => void;
}) {
  const startRow = totalRows === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRow = totalRows === 0 ? 0 : Math.min(currentPage * pageSize, totalRows);

  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">الحوالات البنكية والتحصيلات لدى الناقل</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            جدول موحّد يضم الحوالات البنكية المستلمة والتحصيلات التي ما زالت لدى شركة الشحن، مع عرض القيمة بالدولار والليرة التركية التقريبية.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 dark:bg-slate-800">
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">عدد الصفوف</span>
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {rowsPerPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-emerald-700"
          >
            <Download size={16} />
            تنزيل Excel
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
          لا توجد بيانات مطابقة للفلاتر الحالية.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-right text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="px-3 py-3 font-bold">النوع</th>
                  <th className="px-3 py-3 font-bold">رقم الطلب</th>
                  <th className="px-3 py-3 font-bold">العميل</th>
                  <th className="px-3 py-3 font-bold">طريقة الدفع</th>
                  <th className="px-3 py-3 font-bold">الحالة</th>
                  <th className="px-3 py-3 font-bold">شركة الشحن</th>
                  <th className="px-3 py-3 font-bold">المبلغ بالدولار</th>
                  <th className="px-3 py-3 font-bold">المبلغ بالتركي تقريبًا</th>
                  <th className="px-3 py-3 font-bold">أجرة الشحن</th>
                  <th className="px-3 py-3 font-bold">المتبقي بعد الشحن</th>
                  <th className="px-3 py-3 font-bold">التاريخ</th>
                  <th className="px-3 py-3 font-bold">الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => {
                  const row = entry.row;
                  const shippingCharge = Number(row?.shippingCharge || 0);
                  const canReceive = entry.source === "carrier" && canManage && canTrack;

                  return (
                    <tr key={entry.rowKey} className="border-b border-slate-100 last:border-0 dark:border-slate-800/70">
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${entry.source === "bank" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"}`}>
                          {entry.sourceLabel}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-black text-blue-600">#{row.orderNumber}</td>
                      <td className="px-3 py-3 font-bold text-slate-800 dark:text-slate-100">{row.customer?.name || row.receiverName || "-"}</td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{row.paymentMethod || "-"}</td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{row.status || "-"}</td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{row.shipping?.name || "-"}</td>
                      <td className="px-3 py-3 font-black text-emerald-600">{formatMoney(entry.amountUsd)}</td>
                      <td className="px-3 py-3 font-bold text-amber-600 dark:text-amber-300">{formatMoney(entry.amountTry, "₺")}</td>
                      <td className="px-3 py-3 font-bold text-slate-700 dark:text-slate-200">{shippingCharge > 0 ? formatMoney(shippingCharge) : "-"}</td>
                      <td className="px-3 py-3 font-black text-emerald-600">{formatMoney(Number(row.collectionNetReceived ?? Math.max(0, entry.amountUsd - shippingCharge)))}</td>
                      <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{getDisplayDate(row)}</td>
                      <td className="px-3 py-3">
                        {canReceive ? (
                          <button
                            type="button"
                            onClick={() => onMarkReceived(row)}
                            className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white transition-colors hover:bg-blue-700"
                          >
                            تسجيل كمستلم
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-slate-400 dark:text-slate-500">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm font-bold text-slate-500 dark:text-slate-400">
              عرض {startRow} - {endRow} من أصل {totalRows} صف
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200"
              >
                السابق
              </button>
              <div className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white dark:bg-slate-100 dark:text-slate-900">
                صفحة {currentPage} من {totalPages}
              </div>
              <button
                type="button"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200"
              >
                التالي
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default function CollectionsPage() {
  const { user } = useAuth();
  const [payload, setPayload] = React.useState<CollectionsPayload | null>(null);
  const [summaryPeriod, setSummaryPeriod] = React.useState<"today" | "this_month" | "last_month" | "custom">("today");
  const [customSummaryStartDate, setCustomSummaryStartDate] = React.useState("");
  const [customSummaryEndDate, setCustomSummaryEndDate] = React.useState("");
  const [summaryData, setSummaryData] = React.useState({
    ordersToday: 0,
    totalSales: 0,
    collected: 0,
    debts: 0,
    shippingPending: 0,
    delivered: 0,
    returned: 0,
    problemOrders: 0,
  });
  const [dashboardDetail, setDashboardDetail] = React.useState<{ open: boolean; title: string; type: string | null; orders: any[]; loading: boolean }>({
    open: false,
    title: "",
    type: null,
    orders: [],
    loading: false,
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [paymentMethodFilter, setPaymentMethodFilter] = React.useState<(typeof paymentMethodOptions)[number]>("الكل");
  const [countryFilter, setCountryFilter] = React.useState<(typeof countryFilterOptions)[number]>("الكل");
  const [monthFilter, setMonthFilter] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState<number>(25);
  const [selectedShippingCompany, setSelectedShippingCompany] = React.useState<{
    name: string;
    orderCount: number;
    totalUsd: number;
    transferredUsd: number;
    remainingUsd: number;
  } | null>(null);

  const canView = Boolean(user && hasAnyPermission(user, ["viewOrders", "addOrders", "editOrders", "deleteOrders"]));
  const canManage = Boolean(user && (user.accountType === "ADMIN" || user?.permission?.editOrders));

  const loadData = React.useCallback(async (silent = false) => {
    if (!canView) {
      setIsLoading(false);
      return;
    }

    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const result = await getCollectionsDashboardData();
      if (!result.success) {
        const errorMessage = "error" in result ? result.error : "تعذر جلب صفحة التحصيلات";
        toast.error(String(errorMessage || "تعذر جلب صفحة التحصيلات"));
        return;
      }

      setPayload(result.data as CollectionsPayload);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [canView]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  React.useEffect(() => {
    const loadSummary = async () => {
      try {
        const result = await getCollectionsDashboardByPeriod({
          period: summaryPeriod,
          customStartDate: customSummaryStartDate || undefined,
          customEndDate: customSummaryEndDate || undefined,
        });
        setSummaryData(result || {
          ordersToday: 0,
          totalSales: 0,
          collected: 0,
          debts: 0,
          shippingPending: 0,
          delivered: 0,
          returned: 0,
          problemOrders: 0,
        });
      } catch {
        setSummaryData({
          ordersToday: 0,
          totalSales: 0,
          collected: 0,
          debts: 0,
          shippingPending: 0,
          delivered: 0,
          returned: 0,
          problemOrders: 0,
        });
      }
    };

    void loadSummary();
  }, [summaryPeriod, customSummaryStartDate, customSummaryEndDate]);

  const monthOptions = React.useMemo(() => {
    if (!payload) return [] as string[];

    const values = new Set<string>();
    [...payload.bankTransfers, ...payload.carrierCollectionsPending, ...payload.carrierCollectionsReceived].forEach((row) => {
      const monthValue = getMonthValue(row);
      if (monthValue) values.add(monthValue);
    });

    return Array.from(values).sort((left, right) => right.localeCompare(left));
  }, [payload]);

  const filteredPayload = React.useMemo(() => {
    if (!payload) return null;

    const normalizeCountry = (value: unknown) => {
      const normalized = String(value || "").trim().toLowerCase();
      if (normalized === "سوريا" || normalized === "syria") return "سوريا";
      if (normalized === "تركيا" || normalized === "turkey") return "تركيا";
      return "";
    };

    const matchesPaymentMethod = (row: any) => {
      if (paymentMethodFilter === "الكل") return true;
      return String(row?.paymentMethod || "").trim() === paymentMethodFilter;
    };

    const matchesCountry = (row: any) => {
      if (countryFilter === "الكل") return true;
      const orderCountry = normalizeCountry(row?.country);
      const warehouseCountry = normalizeCountry(row?.warehouse?.location);
      return orderCountry === countryFilter || warehouseCountry === countryFilter;
    };

    const matchesMonth = (row: any) => {
      if (!monthFilter) return true;

      return getMonthValue(row) === monthFilter;
    };

    const matchesFilters = (row: any) => matchesPaymentMethod(row) && matchesCountry(row) && matchesMonth(row);

    const bankTransfers = payload.bankTransfers.filter(matchesFilters);
    const carrierCollectionsPending = payload.carrierCollectionsPending.filter(matchesFilters);
    const carrierCollectionsReceived = payload.carrierCollectionsReceived.filter(matchesFilters);

    return {
      ...payload,
      bankTransfers,
      carrierCollectionsPending,
      carrierCollectionsReceived,
      summaries: {
        bankTransfersTotal: bankTransfers.reduce((sum: number, order: any) => sum + Number(order.collectionAmount || 0), 0),
        carrierPendingTotal: carrierCollectionsPending.reduce((sum: number, order: any) => sum + Number(order.collectionWithShipping || 0), 0),
        carrierReceivedTotal: carrierCollectionsReceived.reduce(
          (sum: number, order: any) => sum + Number(order.carrierCollectionReceivedAmount ?? order.collectionNetReceived ?? 0),
          0
        ),
      },
    };
  }, [payload, paymentMethodFilter, countryFilter, monthFilter]);

  const shippingCompanyBoxes = React.useMemo(() => {
    const rows = filteredPayload?.carrierCollectionsPending || [];
    const grouped = new Map<string, {
      name: string;
      orderCount: number;
      totalUsd: number;
      transferredUsd: number;
      remainingUsd: number;
    }>();

    rows.forEach((row: any) => {
      const name = String(row?.shipping?.name || "غير محددة").trim() || "غير محددة";
      const amount = Number(row?.collectionWithShipping || 0);
      const transferred = Number(row?.collectionNetReceived || 0);
      const remaining = Number(row?.shippingCharge || 0);

      if (!grouped.has(name)) {
        grouped.set(name, {
          name,
          orderCount: 0,
          totalUsd: 0,
          transferredUsd: 0,
          remainingUsd: 0,
        });
      }

      const entry = grouped.get(name)!;
      entry.orderCount += 1;
      entry.totalUsd += amount;
      entry.transferredUsd += transferred;
      entry.remainingUsd += remaining;
    });

    return Array.from(grouped.values())
      .map((entry) => ({
        ...entry,
        totalLabel: formatMoney(entry.totalUsd),
        transferredLabel: formatMoney(entry.transferredUsd),
        remainingLabel: formatMoney(entry.remainingUsd),
      }))
      .sort((left, right) => right.totalUsd - left.totalUsd);
  }, [filteredPayload]);

  const unifiedRows = React.useMemo<UnifiedCollectionRow[]>(() => {
    if (!filteredPayload) return [];

    return [
      ...filteredPayload.bankTransfers.map((row: any) => {
        const amountUsd = Number(row.collectionAmount || 0);
        return {
          rowKey: `bank-${row.id}`,
          source: "bank" as const,
          sourceLabel: "حوالة بنكية",
          amountUsd,
          amountTry: toTryAmount(amountUsd, row),
          row,
        };
      }),
      ...filteredPayload.carrierCollectionsPending.map((row: any) => {
        const amountUsd = Number(row.collectionWithShipping ?? row.collectionBaseAmount ?? 0);
        return {
          rowKey: `carrier-${row.id}`,
          source: "carrier" as const,
          sourceLabel: "لدى الناقل",
          amountUsd,
          amountTry: toTryAmount(amountUsd, row),
          row,
        };
      }),
    ].sort((left, right) => {
      const leftDate = new Date(getRowDateValue(left.row) || 0).getTime();
      const rightDate = new Date(getRowDateValue(right.row) || 0).getTime();
      return rightDate - leftDate;
    });
  }, [filteredPayload]);

  const shippingApproxTotalUsd = React.useMemo(() => {
    return (filteredPayload?.carrierCollectionsPending || []).reduce(
      (sum: number, row: any) => sum + Number(row.shippingCharge || 0),
      0
    );
  }, [filteredPayload]);

  const shippingApproxTotalTry = React.useMemo(() => {
    return (filteredPayload?.carrierCollectionsPending || []).reduce(
      (sum: number, row: any) => sum + toTryAmount(Number(row.shippingCharge || 0), row),
      0
    );
  }, [filteredPayload]);

  const totalPages = Math.max(1, Math.ceil(unifiedRows.length / pageSize));

  const paginatedUnifiedRows = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return unifiedRows.slice(start, start + pageSize);
  }, [unifiedRows, currentPage, pageSize]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [paymentMethodFilter, countryFilter, monthFilter, pageSize]);

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const getSummaryDateRange = React.useCallback(() => {
    const now = new Date();

    if (summaryPeriod === "today") {
      return {
        start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
      };
    }

    if (summaryPeriod === "this_month") {
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
      };
    }

    if (summaryPeriod === "last_month") {
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
      };
    }

    const start = customSummaryStartDate ? new Date(customSummaryStartDate) : null;
    const end = customSummaryEndDate ? new Date(customSummaryEndDate) : null;
    return {
      start: start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()) : null,
      end: end ? new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999) : null,
    };
  }, [summaryPeriod, customSummaryStartDate, customSummaryEndDate]);

  const openDashboardDetail = React.useCallback(async (type: string, title: string) => {
    try {
      setDashboardDetail({ open: true, title, type, orders: [], loading: true });

      const result = await getOrders();
      if (!result?.success || !Array.isArray(result.data)) {
        setDashboardDetail({ open: true, title, type, orders: [], loading: false });
        return;
      }

      const { start, end } = getSummaryDateRange();
      const orders = result.data.filter((order: any) => {
        const value = order?.manualCreatedAt || order?.createdAt;
        if (!value) return false;

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return false;
        if (start && date < start) return false;
        if (end && date > end) return false;
        return true;
      });

      const shippingPendingStatuses = ["قيد الشحن", "في الطريق", "في انتظار الشحن", "معلق"];
      const deliveredStatuses = ["تم التسليم", "تم تسليم الطلب", "مدفوعة"];
      const returnedStatuses = ["مرتجع", "ملغي", "تم الإلغاء", "إلغاء"];

      const filtered = orders.filter((order: any) => {
        const status = String(order?.status || "").trim();
        const paymentMethod = String(order?.paymentMethod || "").trim();
        const hasProblem = Boolean(order?.hasProblem || order?.problem || order?.needsReview);
        const missingShipping = !order?.shipping && !order?.shippingName && !order?.shippingPrice;
        const unclearPayment = !paymentMethod || paymentMethod === "غير محدد";
        const isBankOrMixed = paymentMethod === "تحويل بنكي" || paymentMethod === "مختلطة";

        switch (type) {
          case "orders":
            return true;
          case "sales":
            return true;
          case "collected":
            return isBankOrMixed || deliveredStatuses.includes(status);
          case "debts":
            return !(isBankOrMixed || deliveredStatuses.includes(status));
          case "shipping":
            return shippingPendingStatuses.includes(status);
          case "delivered":
            return deliveredStatuses.includes(status);
          case "returned":
            return returnedStatuses.includes(status);
          case "problem":
            return hasProblem || missingShipping || unclearPayment || ["مشكلة", "لديه مشكلة"].includes(status);
          default:
            return true;
        }
      });

      setDashboardDetail({ open: true, title, type, orders: filtered, loading: false });
    } catch (error) {
      console.error("Error loading dashboard detail orders:", error);
      setDashboardDetail({ open: true, title, type, orders: [], loading: false });
    }
  }, [getSummaryDateRange]);

  const exportUnifiedRowsToExcel = React.useCallback(() => {
    if (unifiedRows.length === 0) {
      toast.error("لا توجد بيانات لتصديرها");
      return;
    }

    const worksheetData = unifiedRows.map((entry) => ({
      "النوع": entry.sourceLabel,
      "رقم الطلب": entry.row.orderNumber,
      "العميل": entry.row.customer?.name || entry.row.receiverName || "-",
      "طريقة الدفع": entry.row.paymentMethod || "-",
      "الحالة": entry.row.status || "-",
      "شركة الشحن": entry.row.shipping?.name || "-",
      "المبلغ بالدولار": Number(entry.amountUsd || 0),
      "المبلغ بالتركي تقريبًا": Number(entry.amountTry || 0),
      "أجرة الشحن بالدولار": Number(entry.row.shippingCharge || 0),
      "المتبقي بعد الشحن": Math.max(0, Number(entry.amountUsd || 0) - Number(entry.row.shippingCharge || 0)),
      "التاريخ": getDisplayDate(entry.row),
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Collections");
    XLSX.writeFile(workbook, `collections_${new Date().toISOString().split("T")[0]}.xlsx`);
  }, [unifiedRows]);

  const handleMarkReceived = async (row: any) => {
    const loadingToast = toast.loading("جاري تسجيل التحصيل كمستلم...");
    try {
      const result = await markCarrierCollectionReceived(Number(row.id), Number(row.collectionNetReceived || 0), null);
      if (!result.success) {
        toast.error(String(result.error || "تعذر تحديث التحصيل"));
        return;
      }

      toast.success("تم نقل التحصيل إلى صندوق المستلمة");
      await loadData(true);
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const handleClearReceived = async (row: any) => {
    const loadingToast = toast.loading("جاري إلغاء تسجيل التحصيل...");
    try {
      const result = await clearCarrierCollectionReceived(Number(row.id));
      if (!result.success) {
        toast.error(String(result.error || "تعذر إلغاء التحصيل"));
        return;
      }

      toast.success("تمت إعادة التحصيل إلى قسم مع الناقل");
      await loadData(true);
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  if (!canView) {
    return (
      <div className="p-4" dir="rtl">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">التحصيلات</h1>
        <p className="mt-4 text-sm text-slate-500">لا تملك صلاحية عرض هذه الصفحة.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">التحصيلات</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            عرض الحوالات البنكية، التحصيلات الموجودة مع الناقل، والتحصيلات التي تم استلامها.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadData(true)}
          disabled={isRefreshing}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
          تحديث البيانات
        </button>
      </div>

      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">ملخص {summaryPeriod === 'today' ? 'اليوم' : summaryPeriod === 'this_month' ? 'هذا الشهر' : summaryPeriod === 'last_month' ? 'الشهر الماضي' : 'المخصص'}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">القيم مستخرجة من منطق صفحة التحصيلات مع نفس التفاصيل مثل الصفحة الرئيسية.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'today', label: 'اليوم' },
              { key: 'this_month', label: 'هذا الشهر' },
              { key: 'last_month', label: 'الشهر الماضي' },
              { key: 'custom', label: 'مخصص' },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setSummaryPeriod(option.key as any)}
                className={`rounded-xl px-4 py-2 text-sm font-black transition-colors ${
                  summaryPeriod === option.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {summaryPeriod === 'custom' && (
          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
              من
              <input
                type="date"
                value={customSummaryStartDate}
                onChange={(event) => setCustomSummaryStartDate(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
            <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
              إلى
              <input
                type="date"
                value={customSummaryEndDate}
                onChange={(event) => setCustomSummaryEndDate(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            onClick={() => openDashboardDetail('orders', 'الطلبات')}
            className="rounded-[1.75rem] border border-slate-200 bg-white p-5 text-right shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-600 dark:hover:bg-slate-800"
          >
            <div className="text-sm font-bold text-slate-500 dark:text-slate-400">الطلبات</div>
            <div className="mt-3 text-3xl font-black text-slate-900 dark:text-white">{summaryData.ordersToday}</div>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">عدد الطلبات في الفترة المختارة</div>
          </button>
          <button
            type="button"
            onClick={() => openDashboardDetail('sales', 'إجمالي المبيعات')}
            className="rounded-[1.75rem] border border-slate-200 bg-white p-5 text-right shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-700 dark:hover:bg-slate-800"
          >
            <div className="text-sm font-bold text-slate-500 dark:text-slate-400">إجمالي المبيعات</div>
            <div className="mt-3 text-3xl font-black text-emerald-600">{formatMoney(summaryData.totalSales)}</div>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">مجموع فواتير الفترة</div>
          </button>
          <button
            type="button"
            onClick={() => openDashboardDetail('collected', 'المحصل')}
            className="rounded-[1.75rem] border border-slate-200 bg-white p-5 text-right shadow-sm transition hover:border-blue-300 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700 dark:hover:bg-slate-800"
          >
            <div className="text-sm font-bold text-slate-500 dark:text-slate-400">المحصل</div>
            <div className="mt-3 text-3xl font-black text-blue-600">{formatMoney(summaryData.collected)}</div>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">المبالغ المستلمة</div>
          </button>
          <button
            type="button"
            onClick={() => openDashboardDetail('debts', 'الذمم')}
            className="rounded-[1.75rem] border border-slate-200 bg-white p-5 text-right shadow-sm transition hover:border-amber-300 hover:bg-amber-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-amber-700 dark:hover:bg-slate-800"
          >
            <div className="text-sm font-bold text-slate-500 dark:text-slate-400">الذمم</div>
            <div className="mt-3 text-3xl font-black text-amber-600">{formatMoney(summaryData.debts)}</div>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">المتبقي غير المحصل</div>
          </button>
        </div>
      </div>

      {dashboardDetail.open && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-white">{dashboardDetail.title}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">الطلبات المرتبطة بهذا التب في الفترة المختارة</p>
            </div>
            <button
              type="button"
              onClick={() => setDashboardDetail((prev) => ({ ...prev, open: false, orders: [], loading: false }))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              إغلاق
            </button>
          </div>

          {dashboardDetail.loading ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
              جاري تحميل تفاصيل الطلبات...
            </div>
          ) : dashboardDetail.orders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
              لا توجد طلبات لهذا التب.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="px-3 py-3 font-bold">رقم الطلب</th>
                    <th className="px-3 py-3 font-bold">العميل</th>
                    <th className="px-3 py-3 font-bold">طريقة الدفع</th>
                    <th className="px-3 py-3 font-bold">الحالة</th>
                    <th className="px-3 py-3 font-bold">الشحن</th>
                    <th className="px-3 py-3 font-bold">المبلغ النهائي</th>
                    <th className="px-3 py-3 font-bold">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardDetail.orders.map((order: any) => (
                    <tr key={order.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/70">
                      <td className="px-3 py-3 font-black text-blue-600">#{order.orderNumber || order.id}</td>
                      <td className="px-3 py-3 font-bold text-slate-800 dark:text-slate-100">{order.customer?.name || order.receiverName || "-"}</td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{order.paymentMethod || "-"}</td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{order.status || "-"}</td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{Number(order.shippingPrice || order.shipping?.price || 0).toLocaleString()} $</td>
                      <td className="px-3 py-3 font-black text-emerald-600">{formatMoney(Number(order.finalAmount || 0))}</td>
                      <td className="px-3 py-3 text-slate-500 dark:text-slate-400">
                        {new Date(order.manualCreatedAt || order.createdAt).toLocaleDateString('ar-EG', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <div className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">فلترة حسب طريقة الدفع</div>
            <div className="flex flex-wrap gap-2">
              {paymentMethodOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPaymentMethodFilter(option)}
                  className={`rounded-xl px-4 py-2 text-sm font-black transition-colors ${
                    paymentMethodFilter === option
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">فلترة حسب بلد الطلب</div>
            <div className="flex flex-wrap gap-2">
              {countryFilterOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setCountryFilter(option)}
                  className={`rounded-xl px-4 py-2 text-sm font-black transition-colors ${
                    countryFilter === option
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">فلترة حسب الشهر</div>
            <div className="flex items-center gap-3">
              <select
                value={monthFilter}
                onChange={(event) => setMonthFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="">كل الشهور</option>
                {monthOptions.map((option) => (
                  <option key={option} value={option}>
                    {formatMonthLabel(option)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setMonthFilter("")}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              >
                مسح
              </button>
            </div>
          </div>
        </div>
      </div>

      {filteredPayload && !filteredPayload.supportsCarrierCollectionTracking && (
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          تمت إضافة حقول nullable في Prisma لتتبع التحصيلات المستلمة من الناقل، لكن يجب تنفيذ الترحيل أولًا حتى يتفعّل الصندوق الثالث وأزرار تسجيل الاستلام.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          title="الحوالات البنكية المستلمة"
          value={formatMoney(filteredPayload?.summaries.bankTransfersTotal || 0)}
          subtitle="طلبات الدفع البنكي أو الجزء البنكي من الدفع المختلط"
          icon={Landmark}
          tone="blue"
        />
        <SummaryCard
          title="التحصيلات لدى الناقل"
          value={formatMoney(filteredPayload?.summaries.carrierPendingTotal || 0)}
          subtitle="مبالغ لم تُسلَّم لك بعد وما زالت لدى شركة الشحن"
          icon={HandCoins}
          tone="amber"
        />
        <SummaryCard
          title="تحصيلاتي المستلمة"
          value={formatMoney(filteredPayload?.summaries.carrierReceivedTotal || 0)}
          subtitle="التحصيلات التي تم استلامها بعد خصم الشحن"
          icon={Wallet}
          tone="emerald"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <SummaryCard
          title="أجور الشحن التقريبية"
          value={`${formatMoney(shippingApproxTotalUsd)} / ${formatMoney(shippingApproxTotalTry, "₺")}`}
          subtitle="إجمالي أجور الشحن التقديرية ضمن التحصيلات الموجودة حاليًا لدى الناقل"
          icon={HandCoins}
          tone="amber"
        />
      </div>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">صناديق شركات الشحن</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              يوضح المتبقي لدى كل شركة شحن من التحصيلات المعلّقة، وينخفض تلقائيًا عند تسجيل أي طلب كمستلم.
            </p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {shippingCompanyBoxes.length} شركة
          </div>
        </div>

        {shippingCompanyBoxes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
            لا توجد تحصيلات معلقة موزعة على شركات الشحن حاليًا.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shippingCompanyBoxes.map((box) => (
              <button
                key={box.name}
                type="button"
                onClick={() => setSelectedShippingCompany(box)}
                className="cursor-pointer rounded-[1.5rem] border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 text-right shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-amber-900/40 dark:from-amber-950/20 dark:via-slate-900 dark:to-orange-950/20"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-slate-500 dark:text-slate-400">شركة الشحن</div>
                    <div className="mt-1 text-xl font-black text-slate-900 dark:text-white">{box.name}</div>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg">
                    <HandCoins size={20} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedShippingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-md rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">شركة الشحن</p>
                <h3 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{selectedShippingCompany.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedShippingCompany(null)}
                className="rounded-full bg-slate-100 p-2 text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                aria-label="إغلاق"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-base text-slate-700 dark:text-slate-200">
              <div>
                شركة الشحن لديها <span className="font-black text-slate-900 dark:text-white">{selectedShippingCompany.orderCount}</span> طلباً
              </div>
              <div>
                إجمالي التحصيل المفترض: <span className="font-black text-amber-600 dark:text-amber-300">{formatMoney(selectedShippingCompany.totalUsd)}</span>
              </div>
              <div>
                المبلغ المحول لنا: <span className="font-black text-emerald-600 dark:text-emerald-300">{formatMoney(selectedShippingCompany.transferredUsd)}</span>
              </div>
              <div>
                المتبقي عند شركة الشحن: <span className="font-black text-red-600 dark:text-red-300">{formatMoney(selectedShippingCompany.remainingUsd)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading && !payload ? (
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-10 text-center text-sm font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          جاري تحميل بيانات التحصيلات...
        </div>
      ) : (
        <div className="space-y-6">
          <UnifiedCollectionsTable
            rows={paginatedUnifiedRows}
            currentPage={currentPage}
            pageSize={pageSize}
            totalPages={totalPages}
            totalRows={unifiedRows.length}
            canManage={canManage}
            canTrack={Boolean(filteredPayload?.supportsCarrierCollectionTracking)}
            onPageChange={(page) => setCurrentPage(Math.min(Math.max(page, 1), totalPages))}
            onPageSizeChange={setPageSize}
            onExport={exportUnifiedRowsToExcel}
            onMarkReceived={handleMarkReceived}
          />

          <SectionTable
            title="تحصيلاتي المستلمة"
            description="التحصيلات التي تم استلامها وتُعرض بصافي قيمة الطلب القابلة للتحصيل بعد خصم الشحن."
            rows={filteredPayload?.carrierCollectionsReceived || []}
            emptyMessage="لا توجد تحصيلات مستلمة مسجلة بعد."
            amountLabel="الصافي المستلم"
            getAmount={(row) => formatMoney(Number(row.carrierCollectionReceivedAmount ?? row.collectionNetReceived ?? 0))}
            getTryAmount={(row) => formatMoney(toTryAmount(Number(row.carrierCollectionReceivedAmount ?? row.collectionNetReceived ?? 0), row), "₺")}
            actionLabel={canManage && filteredPayload?.supportsCarrierCollectionTracking ? "إلغاء الاستلام" : undefined}
            onAction={canManage && filteredPayload?.supportsCarrierCollectionTracking ? handleClearReceived : undefined}
            actionVariant="danger"
          />
        </div>
      )}
    </div>
  );
}