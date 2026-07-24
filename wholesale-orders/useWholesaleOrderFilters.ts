import React from 'react';
import {
  getCurrentMonthKey,
  getMonthKey,
  getWholesaleDisplayDate,
  getPreviousMonthKey,
} from '@/wholesale-orders/wholesaleHelpers';
import { statusOptions } from '@/wholesale-orders/wholesaleHelpers';

interface User {
  id: string;
  username?: string;
  accountType?: string;
  permission?: {
    viewWholesaleCustomers?: boolean;
    roleName?: string;
    accessSyria?: boolean;
    accessTurkey?: boolean;
  };
}

export const useWholesaleOrderFilters = (orders: any[], user?: User, warehouses: any[] = []) => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [warehouseLocation, setWarehouseLocation] = React.useState("");
  const [shippingCompany, setShippingCompany] = React.useState("");
  const [monthFilterType, setMonthFilterType] = React.useState<"all" | "current" | "previous" | "custom">("current");
  const [customMonth, setCustomMonth] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("طلب جديد");
  const [page, setPage] = React.useState(1);

  const PAGE_SIZE = 10;

  const filterOrder = React.useMemo(() => {
    const isAdminUser = user?.accountType === "ADMIN";
    const isWarehouseUser = String(user?.permission?.roleName || "").trim().includes("مستودع");
    const canViewOrders = !user || isAdminUser || isWarehouseUser || user?.permission?.viewWholesaleCustomers === true;

    const allowedWarehouseIds = warehouses
      .filter((warehouse: any) => {
        const location = String(warehouse?.location || "").trim().toLowerCase();
        if (location === "سوريا" || location === "syria") return user?.permission?.accessSyria === true;
        if (location === "تركيا" || location === "turkey") return user?.permission?.accessTurkey === true;
        return false;
      })
      .map((warehouse: any) => String(warehouse.id));

    const shouldRestrictByWarehouse = !isAdminUser && allowedWarehouseIds.length > 0;

    return orders.filter((order: any) => {
      if (!canViewOrders) return false;

      if (user && !isAdminUser) {
        if (shouldRestrictByWarehouse) {
          const orderWarehouseId = String(order?.warehouse?.id || "").trim();
          if (!allowedWarehouseIds.includes(orderWarehouseId)) return false;
        }

        if (!isWarehouseUser) {
          const isOwner = order.userId === user?.id;
          if (!isOwner) return false;
        }
      }

      const query = searchQuery.trim().toLowerCase();
      const matchesText = !query ||
        (order.wholesaleCustomer?.name && order.wholesaleCustomer.name.toLowerCase().includes(query)) ||
        (order.user?.username && order.user.username.toLowerCase().includes(query)) ||
        (order.orderNumber && String(order.orderNumber).includes(query)) ||
        (order.city && order.city.toLowerCase().includes(query));

      if (!matchesText) return false;

      const selectedWarehouseId = String(warehouseLocation || "").trim();
      const orderWarehouseId = String(order?.warehouse?.id || "").trim();
      if (selectedWarehouseId && orderWarehouseId !== selectedWarehouseId) return false;

      const normalizedShippingFilter = String(shippingCompany || "").trim().toLowerCase();
      const orderShippingName = String(order?.shipping?.name || "").trim().toLowerCase();
      if (normalizedShippingFilter && orderShippingName !== normalizedShippingFilter) return false;

      if (monthFilterType !== "all") {
        const activeMonth = monthFilterType === "current"
          ? getCurrentMonthKey()
          : monthFilterType === "previous"
            ? getPreviousMonthKey()
            : (customMonth || getCurrentMonthKey());

        const orderMonth = getMonthKey(getWholesaleDisplayDate(order));
        if (!activeMonth || !orderMonth || orderMonth !== activeMonth) return false;
      }

      return true;
    });
  }, [orders, user, warehouses, searchQuery, warehouseLocation, shippingCompany, monthFilterType, customMonth]);

  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = { الكل: filterOrder.length };
    for (const status of statusOptions) {
      if (status === "الكل") continue;
      counts[status] = filterOrder.filter((order: any) => order.status === status).length;
    }
    return counts;
  }, [filterOrder]);

  const visibleOrders = React.useMemo(() => {
    if (statusFilter === "الكل") return filterOrder;
    return filterOrder.filter((order: any) => order.status === statusFilter);
  }, [filterOrder, statusFilter]);

  const paginatedOrders = React.useMemo(() => {
    const startIndex = (page - 1) * PAGE_SIZE;
    return visibleOrders.slice(startIndex, startIndex + PAGE_SIZE);
  }, [visibleOrders, page]);

  const totalPages = Math.ceil(visibleOrders.length / PAGE_SIZE);

  React.useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  return {
    searchQuery,
    setSearchQuery,
    warehouseLocation,
    setWarehouseLocation,
    shippingCompany,
    setShippingCompany,
    monthFilterType,
    setMonthFilterType,
    customMonth,
    setCustomMonth,
    statusFilter,
    setStatusFilter,
    page,
    setPage,

    filterOrder,
    visibleOrders,
    paginatedOrders,
    statusCounts,
    statusOptions,

    PAGE_SIZE,
    totalPages,
  };
};
