"use client";

import { AppModal } from '@/components/ui/app-modal';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { isAdmin } from '@/lib/utils';
import {
  createWholesaleOrder,
  deleteWholesaleOrder,
  getWholesaleOrderById,
  getWholesalePriceTierForQuantity,
  updateWholesaleOrder,
  updateWholesaleOrderStatus,
} from '@/server/wholesale-order';
import { Download, Pencil, Trash } from 'lucide-react';
import * as React from 'react';
import toast from 'react-hot-toast';
import { TableAction } from '@/components/shared/DataTable';
import * as XLSX from 'xlsx';
import { useWholesaleOrderData } from '@/wholesale-orders/useWholesaleOrderData';
import { useWholesaleOrderFilters } from '@/wholesale-orders/useWholesaleOrderFilters';
import { WholesaleOrderTable } from '@/wholesale-orders/WholesaleOrderTable';
import { SearchAndFilter } from '@/orders/SearchAndFilter';
import { StatusCards } from '@/orders/StatusCards';
import {
  getWholesaleEffectivePrice,
  getWholesaleDisplayDate,
  getApplicableWholesalePriceTier,
} from '@/wholesale-orders/wholesaleHelpers';

export default function WholesaleOrdersPage() {
  const { user } = useAuth();
  const {
    products,
    customers,
    orders,
    shippingCompanies,
    refreshOrders,
    ensureSupportingDataLoaded,
    isLoading,
  } = useWholesaleOrderData(user);

  const [isOpen, setIsOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | number | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [status, setStatus] = React.useState("طلب جديد");
  const [wholesaleCustomerId, setWholesaleCustomerId] = React.useState("");
  const [customerSearchQuery, setCustomerSearchQuery] = React.useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState("عند الاستلام");
  const [amount, setAmount] = React.useState("");
  const [stockCountry, setStockCountry] = React.useState("");

  const [receiverName, setReceiverName] = React.useState("");
  const [receiverPhone, setReceiverPhone] = React.useState<(string | undefined)[]>([""]);
  const [country, setCountry] = React.useState("");
  const [city, setCity] = React.useState("");
  const [municipality, setMunicipality] = React.useState("");
  const [fullAddress, setFullAddress] = React.useState("");
  const [googleMapsLink, setGoogleMapsLink] = React.useState("");
  const [deliveryNotes, setDeliveryNotes] = React.useState("");
  const [additionalNotes, setAdditionalNotes] = React.useState("");
  const [manualCreatedAt, setManualCreatedAt] = React.useState("");
  const [overallDiscount, setOverallDiscount] = React.useState(0);

  const [items, setItems] = React.useState([
    { productId: "", name: "", price: 0, quantity: 1, discount: 0, note: "", total: 0, wholesalePriceTierId: "" }
  ]);
  const [searchQueries, setSearchQueries] = React.useState<Record<number, string>>({});
  const [showDropdown, setShowDropdown] = React.useState<Record<number, boolean>>({});

  // إعادة حساب أسعار البنود التي ليس لها شريحة سعرية عند تغيير بلد المخزون
  React.useEffect(() => {
    if (!stockCountry) return;

    setItems((currentItems) => {
      if (currentItems.length === 0) return currentItems;
      const needsUpdate = currentItems.some((item) => item.productId && !item.wholesalePriceTierId);
      if (!needsUpdate) return currentItems;

      return currentItems.map((item) => {
        if (!item.productId) return item;
        const pricing = resolveItemPricing(item.productId, item.quantity, stockCountry);
        if (item.wholesalePriceTierId) {
          return { ...item, discount: pricing.discount };
        }
        return { ...item, price: pricing.price, discount: pricing.discount };
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockCountry]);

  const subTotal = items.reduce((sum, i) => sum + i.total, 0);
  const grandTotal = subTotal - overallDiscount;
  const remainingAmount = Math.max(0, Number(grandTotal) - Number(amount || 0));

  const getProductById = (productId: string | number) => {
    return products.find((p) => Number(p.id) === Number(productId));
  };

  const getStockForCountry = (productId: string | number, country: string) => {
    const product = getProductById(productId);
    if (!product || !Array.isArray(product.stocks)) return null;
    return product.stocks.find((stock: any) => String(stock?.warehouse?.location || '') === country) || null;
  };

  const resolveItemPricing = (productId: string | number, quantity: number, country: string) => {
    const product = getProductById(productId);
    if (!product) {
      return { price: 0, discount: 0, wholesalePriceTierId: "" };
    }

    const tier = getApplicableWholesalePriceTier(product.wholesalePriceTiers || [], quantity);
    if (tier) {
      return { price: Number(tier.price), discount: 0, wholesalePriceTierId: String(tier.id) };
    }

    const stock = getStockForCountry(productId, country);
    return { price: Number(stock?.price || 0), discount: Number(stock?.discount || 0), wholesalePriceTierId: "" };
  };

  const updateItem = async (index: number, field: string, value: any) => {
    const newItems = [...items];
    const item = newItems[index];

    if (field === "productId") {
      const product = getProductById(value);
      item.productId = value;
      item.name = product?.name || "";
      const pricing = resolveItemPricing(value, item.quantity, stockCountry);
      item.wholesalePriceTierId = pricing.wholesalePriceTierId;
      item.price = pricing.price;
      item.discount = pricing.discount;
      setSearchQueries({ ...searchQueries, [index]: item.name });
      setShowDropdown({ ...showDropdown, [index]: false });
    } else if (field === "quantity") {
      item.quantity = Number(value || 1);
      if (item.productId) {
        const pricing = resolveItemPricing(item.productId, item.quantity, stockCountry);
        item.wholesalePriceTierId = pricing.wholesalePriceTierId;
        item.price = pricing.price;
        item.discount = pricing.discount;
      }
    } else {
      (item as any)[field] = value;
    }

    item.total = getWholesaleEffectivePrice(item.price, item.discount) * item.quantity;
    setItems(newItems);
  };

  const addNewItem = () => {
    setItems([...items, { productId: "", name: "", price: 0, quantity: 1, discount: 0, note: "", total: 0, wholesalePriceTierId: "" }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) {
      setItems([{ productId: "", name: "", price: 0, quantity: 1, discount: 0, note: "", total: 0, wholesalePriceTierId: "" }]);
    } else {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  };

  const loadOrderDetails = async (orderId: string | number) => {
    const loadingToast = toast.loading("جاري تحميل تفاصيل الطلب...");
    try {
      const response = await getWholesaleOrderById(orderId);
      if (!response?.success || !response.data) {
        toast.error(response?.error || "تعذر تحميل تفاصيل الطلب");
        return null;
      }
      return response.data;
    } catch (error) {
      toast.error("حدث خطأ أثناء تحميل تفاصيل الطلب");
      return null;
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const resetForm = () => {
    setIsOpen(false);
    setEditId(null);
    setStatus("PENDING");
    setWholesaleCustomerId("");
    setCustomerSearchQuery("");
    setShowCustomerDropdown(false);
    setPaymentMethod("عند الاستلام");
    setAmount("");
    setStockCountry("");
    setReceiverName("");
    setReceiverPhone([""]);
    setCountry("");
    setCity("");
    setMunicipality("");
    setFullAddress("");
    setGoogleMapsLink("");
    setDeliveryNotes("");
    setAdditionalNotes("");
    setManualCreatedAt("");
    setOverallDiscount(0);
    setItems([{ productId: "", name: "", price: 0, quantity: 1, discount: 0, note: "", total: 0, wholesalePriceTierId: "" }]);
    setSearchQueries({});
    setShowDropdown({});
  };

  const handleEditOrder = async (data: any) => {
    const supportDataReady = await ensureSupportingDataLoaded();
    if (!supportDataReady) return;

    const orderDetails = await loadOrderDetails(data.id);
    if (!orderDetails) return;

    const normalizedItems = (Array.isArray(orderDetails?.items) ? orderDetails.items : []).map((item: any) => {
      const price = Number(item?.price ?? 0);
      const quantity = Number(item?.quantity ?? 1);
      const discount = Number(item?.discount ?? 0);
      const productId = String(item?.productId ?? "");
      return {
        productId,
        name: item?.product?.name || "",
        price,
        quantity,
        discount,
        note: item?.note || "",
        wholesalePriceTierId: item?.wholesalePriceTierId ? String(item.wholesalePriceTierId) : "",
        total: getWholesaleEffectivePrice(price, discount) * quantity,
      };
    });

    const nextItems = normalizedItems.length > 0
      ? normalizedItems
      : [{ productId: "", name: "", price: 0, quantity: 1, discount: 0, note: "", total: 0, wholesalePriceTierId: "" }];

    const nextSearchQueries = nextItems.reduce((acc: Record<number, string>, item: any, index: number) => {
      acc[index] = item.name || "";
      return acc;
    }, {});

    setEditId(orderDetails?.id ?? null);
    setItems(nextItems);
    setSearchQueries(nextSearchQueries);
    setShowDropdown({});

    setWholesaleCustomerId(String(orderDetails?.wholesaleCustomerId || ""));
    setCustomerSearchQuery(orderDetails?.wholesaleCustomer?.name || "");
    setStatus(orderDetails?.status || "طلب جديد");
    setPaymentMethod(orderDetails?.paymentMethod || "عند الاستلام");
    setAmount(String(orderDetails?.amount ?? ""));
    setStockCountry(orderDetails?.warehouse?.location || "");

    setReceiverName(orderDetails?.receiverName || "");
    const receiverPhoneValues = Array.isArray(orderDetails?.receiverPhone)
      ? (orderDetails.receiverPhone.length ? orderDetails.receiverPhone : [""])
      : [orderDetails?.receiverPhone || ""];
    setReceiverPhone(receiverPhoneValues);

    setCountry(orderDetails?.country || "");
    setCity(orderDetails?.city || "");
    setMunicipality(orderDetails?.municipality || "");
    setFullAddress(orderDetails?.fullAddress || "");
    setGoogleMapsLink(orderDetails?.googleMapsLink || "");
    setDeliveryNotes(orderDetails?.deliveryNotes || "");
    setAdditionalNotes(orderDetails?.additionalNotes || "");
    setOverallDiscount(Number(orderDetails?.discount || 0));
    setManualCreatedAt(orderDetails?.manualCreatedAt ? new Date(orderDetails.manualCreatedAt).toISOString().slice(0, 16) : "");

    setIsOpen(true);
  };

  const handleSubmit = async () => {
    if (!wholesaleCustomerId) {
      toast.error("يرجى اختيار عميل الجملة");
      return;
    }

    if (items.length === 0 || !items[0].productId) {
      toast.error("يرجى إضافة منتج واحد على الأقل");
      return;
    }

    if (!receiverName || receiverName.trim() === "") {
      toast.error("يرجى تحديد اسم المستلم");
      return;
    }

    if (!stockCountry) {
      toast.error("يرجى اختيار بلد المخزون");
      return;
    }

    if (!country || !city) {
      toast.error("يرجى اختيار الدولة والمدينة");
      return;
    }

    if (paymentMethod === "مختلطة") {
      const amountValue = Number(amount);
      if (!amount || amountValue < 0 || amountValue > Number(grandTotal)) {
        toast.error("قيمة الحوالة غير صالحة");
        return;
      }
    }

    setIsSubmitting(true);
    const loadingMessage = editId ? "جاري تعديل طلب الجملة..." : "جاري حفظ طلب الجملة الجديد...";
    const loadingToast = toast.loading(loadingMessage);

    const orderData = {
      wholesaleCustomerId,
      status,
      receiverName,
      receiverPhone,
      country,
      city,
      municipality,
      fullAddress,
      googleMapsLink,
      deliveryNotes,
      paymentMethod,
      amount: paymentMethod === "مختلطة" ? amount : "",
      amountBank: paymentMethod === "مختلطة" ? String(remainingAmount) : "",
      additionalNotes,
      grandTotal: Number(grandTotal),
      overallDiscount: Number(overallDiscount),
      subTotal: Number(subTotal),
      stockCountry,
      manualCreatedAt: manualCreatedAt || null,
    };

    try {
      let res;
      if (editId) {
        res = await updateWholesaleOrder(orderData, editId, items);
      } else {
        res = await createWholesaleOrder(orderData, items, user?.id || "");
      }

      if (res.success) {
        toast.success(editId ? "تم تحديث طلب الجملة بنجاح" : "تم حفظ طلب الجملة بنجاح");
        await refreshOrders();
        resetForm();
      } else {
        toast.error((res as any).error || "فشل في معالجة الطلب");
      }
    } catch (error) {
      console.error("Submit Error:", error);
      toast.error("حدث خطأ غير متوقع في النظام");
    } finally {
      setIsSubmitting(false);
      toast.dismiss(loadingToast);
    }
  };

  const updatestatuschange = async (status: any, id: any) => {
    const loading = toast.loading("جاري تحديث حالة الطلب");
    try {
      const res = await updateWholesaleOrderStatus(status, id);
      if (res.success) {
        await refreshOrders();
        toast.success("تم تحديث الحالة");
      } else {
        toast.error((res as any).error || "فشل تحديث الحالة");
      }
    } catch (error) {
      toast.error("فشل تحديث الحالة");
    } finally {
      toast.dismiss(loading);
    }
  };

  const handleDelete = async (data: any) => {
    const confirm = window.confirm(`هل أنت متأكد من حذف الطلب رقم #${data.orderNumber}؟ سيتم إعادة الكميات للمخزون.`);
    if (confirm) {
      const loading = toast.loading("جاري حذف الطلب وتحديث المخزون...");
      try {
        const res = await deleteWholesaleOrder(data.id);
        if (res.success) {
          toast.success("تم حذف الطلب بنجاح");
          await refreshOrders();
        } else {
          toast.error((res as any).error || "خطأ");
        }
      } catch (err) {
        toast.error("حدث خطأ غير متوقع");
      } finally {
        toast.dismiss(loading);
      }
    }
  };

  const exportToExcel = () => {
    const worksheetData = orders.map((order) => {
      const itemsSummary = order.items?.map((i: any) =>
        `${i.product?.name || 'منتج'} (${i.quantity})`
      ).join(" - ");

      return {
        "رقم المرجع": order.orderNumber,
        "تاريخ الإنشاء": new Date(getWholesaleDisplayDate(order)).toLocaleString('ar-EG'),
        "حالة الطلب": order.status,
        "عميل الجملة": order.wholesaleCustomer?.name,
        "المبلغ الإجمالي": order.totalAmount,
        "الخصم": order.discount,
        "المبلغ النهائي": order.finalAmount,
        "طريقة الدفع": order.paymentMethod,
        "المنتجات المشتراة": itemsSummary,
        "اسم المستلم": order.receiverName || "نفس العميل",
        "هاتف المستلم": order.receiverPhone ? (Array.isArray(order.receiverPhone) ? order.receiverPhone.join(' - ') : order.receiverPhone) : "لم يسجل",
        "الدولة": order.country,
        "المدينة": order.city,
        "البلدية": order.municipality,
        "العنوان الكامل": order.fullAddress,
        "بلد المخزون": order?.warehouse?.location || "",
        "بواسطة الموظف": order.user?.username || "Admin",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "طلبات الجملة");
    worksheet['!dir'] = "rtl";
    XLSX.writeFile(workbook, `Skynova_Wholesale_Orders_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const canDelete = React.useMemo(() => {
    if (!user) return false;
    if (isAdmin(user)) return true;
    return Boolean(user?.permission?.deleteWholesaleCustomers);
  }, [user]);

  const tableActions: TableAction<any>[] = [
    {
      label: "تعديل",
      icon: <Pencil size={14} />,
      onClick: (data: any) => handleEditOrder(data),
    },
    canDelete && {
      label: "حذف",
      icon: <Trash size={14} />,
      variant: "danger",
      onClick: (data: any) => handleDelete(data),
    },
  ].filter(Boolean) as TableAction<any>[];

  const {
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
    visibleOrders,
    statusCounts,
    statusOptions,
    PAGE_SIZE,
  } = useWholesaleOrderFilters(orders, user);

  const filteredCustomers = React.useMemo(() => {
    const query = customerSearchQuery.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((c: any) =>
      String(c.name || "").toLowerCase().includes(query) ||
      String(c.city || "").toLowerCase().includes(query)
    );
  }, [customers, customerSearchQuery]);

  return (
    <div className="">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">إدارة طلبات الجملة</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-200 dark:shadow-none"
            title="تصدير طلبات الجملة"
          >
            <Download size={20} />
          </button>
        </div>
      </div>

      <SearchAndFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        warehouseLocation={warehouseLocation}
        onWarehouseChange={setWarehouseLocation}
        shippingCompany={shippingCompany}
        onShippingCompanyChange={setShippingCompany}
        shippingCompanyOptions={shippingCompanies.map((c: any) => String(c.name || "")).filter(Boolean)}
        monthFilterType={monthFilterType}
        onMonthFilterChange={(type) => setMonthFilterType(type as any)}
        customMonth={customMonth}
        onCustomMonthChange={setCustomMonth}
        warehouseOptions={["سوريا", "تركيا"]}
      />

      <StatusCards
        statusOptions={statusOptions}
        statusCounts={statusCounts}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
      />

      <WholesaleOrderTable
        orders={visibleOrders}
        actions={tableActions}
        onStatusChange={updatestatuschange}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={visibleOrders.length}
        onPageChange={setPage}
        isLoading={isLoading}
      />

      <AppModal size='full' isOpen={isOpen} onClose={() => !isSubmitting && resetForm()} title={editId ? 'تعديل طلب جملة' : 'طلب جملة جديد'}>
        <div className="space-y-6 p-2 max-h-[80vh] overflow-y-auto">
          {/* بيانات العميل */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-bold mb-1">عميل الجملة</label>
              <input
                type="text"
                placeholder="ابحث عن عميل الجملة..."
                value={customerSearchQuery}
                onChange={(e) => {
                  setCustomerSearchQuery(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                className="block w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-950 dark:text-white text-sm"
              />
              {showCustomerDropdown && filteredCustomers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredCustomers.map((customer: any) => (
                    <button
                      key={customer.id}
                      type="button"
                      className="w-full text-right px-4 py-2 hover:bg-blue-50 dark:hover:bg-slate-800 text-sm"
                      onClick={() => {
                        setWholesaleCustomerId(customer.id);
                        setCustomerSearchQuery(customer.name);
                        setShowCustomerDropdown(false);
                        setCountry(customer.country || "");
                        setCity(customer.city || "");
                        setFullAddress(customer.address || "");
                      }}
                    >
                      {customer.name} {customer.city ? `- ${customer.city}` : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">بلد المخزون</label>
              <select
                value={stockCountry}
                onChange={(e) => setStockCountry(e.target.value)}
                className="block w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-950 dark:text-white text-sm"
              >
                <option value="">اختر بلد المخزون</option>
                <option value="سوريا">سوريا</option>
                <option value="تركيا">تركيا</option>
              </select>
            </div>
          </div>

          {/* المنتجات */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg">المنتجات</h3>
              <button
                type="button"
                onClick={addNewItem}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-200"
              >
                + إضافة منتج
              </button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 border border-gray-200 dark:border-gray-800 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                <div className="md:col-span-4 relative">
                  <label className="block text-xs font-bold mb-1">المنتج</label>
                  <input
                    type="text"
                    placeholder="ابحث عن منتج..."
                    value={searchQueries[index] || item.name}
                    onChange={(e) => {
                      setSearchQueries({ ...searchQueries, [index]: e.target.value });
                      setShowDropdown({ ...showDropdown, [index]: true });
                    }}
                    onFocus={() => setShowDropdown({ ...showDropdown, [index]: true })}
                    className="block w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-950 dark:text-white text-sm"
                  />
                  {showDropdown[index] && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {products
                        .filter((p: any) => {
                          const query = (searchQueries[index] || item.name).toLowerCase();
                          return String(p.name || "").toLowerCase().includes(query);
                        })
                        .map((product: any) => (
                          <button
                            key={product.id}
                            type="button"
                            className="w-full text-right px-4 py-2 hover:bg-blue-50 dark:hover:bg-slate-800 text-sm"
                            onClick={() => updateItem(index, "productId", product.id)}
                          >
                            {product.name}
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold mb-1">الكمية</label>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", e.target.value)}
                    className="block w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-950 dark:text-white text-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold mb-1">سعر الوحدة</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.price}
                    onChange={(e) => updateItem(index, "price", e.target.value)}
                    className="block w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-950 dark:text-white text-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold mb-1">الخصم</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.discount}
                    onChange={(e) => updateItem(index, "discount", e.target.value)}
                    className="block w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-950 dark:text-white text-sm"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold mb-1">الإجمالي</label>
                  <div className="p-2 font-bold text-sm">{item.total.toLocaleString()}</div>
                </div>

                <div className="md:col-span-1 flex items-end">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* الخصم والإجمالي */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
            <div>
              <label className="block text-sm font-bold mb-1">الخصم الإجمالي</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={overallDiscount}
                onChange={(e) => setOverallDiscount(Number(e.target.value || 0))}
                className="block w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-950 dark:text-white text-sm"
              />
            </div>
            <div className="flex items-center">
              <div>
                <p className="text-sm text-slate-500">المجموع الفرعي</p>
                <p className="text-xl font-black">{subTotal.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center">
              <div>
                <p className="text-sm text-slate-500">الإجمالي النهائي</p>
                <p className="text-2xl font-black text-emerald-600">{grandTotal.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* بيانات المستلم والعنوان */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">اسم المستلم</label>
              <input
                type="text"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                className="block w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-950 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">هاتف المستلم</label>
              <input
                type="text"
                value={receiverPhone[0] || ""}
                onChange={(e) => setReceiverPhone([e.target.value])}
                className="block w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-950 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">الدولة</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="block w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-950 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">المدينة</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="block w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-950 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">البلدية / المنطقة</label>
              <input
                type="text"
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                className="block w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-950 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">العنوان الكامل</label>
              <input
                type="text"
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                className="block w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-950 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">رابط خرائط Google</label>
              <input
                type="text"
                value={googleMapsLink}
                onChange={(e) => setGoogleMapsLink(e.target.value)}
                className="block w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-950 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">تاريخ إنشاء يدوي</label>
              <input
                type="datetime-local"
                value={manualCreatedAt}
                onChange={(e) => setManualCreatedAt(e.target.value)}
                className="block w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-950 dark:text-white text-sm"
              />
            </div>
          </div>

          {/* الدفع والحالة */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">طريقة الدفع</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="block w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-950 dark:text-white text-sm"
              >
                <option value="عند الاستلام">عند الاستلام</option>
                <option value="تحويل بنكي">تحويل بنكي</option>
                <option value="مختلطة">مختلطة</option>
              </select>
            </div>

            {paymentMethod === "مختلطة" && (
              <div>
                <label className="block text-sm font-bold mb-1">قيمة الحوالة</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="block w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-950 dark:text-white text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-bold mb-1">حالة الطلب</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="block w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-950 dark:text-white text-sm"
              >
                {statusOptions.filter((s) => s !== "الكل").map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* الملاحظات */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">ملاحظات التوصيل</label>
              <textarea
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                rows={2}
                className="block w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-950 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">ملاحظات إضافية</label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={2}
                className="block w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-950 dark:text-white text-sm"
              />
            </div>
          </div>

          {/* الأزرار */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? "جاري الحفظ..." : (editId ? "تحديث الطلب" : "حفظ الطلب")}
            </Button>
          </div>
        </div>
      </AppModal>
    </div>
  );
}
