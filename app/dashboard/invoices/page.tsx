"use client";

import { DataTable } from "@/components/shared/DataTable";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/select-form";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/utils";
import { createPurchaseInvoiceAction, getPurchaseInvoiceData } from "@/server/invoices";
import { Eye, Plus, Trash2 } from "lucide-react";
import React from "react";
import toast from "react-hot-toast";

type InvoiceItemForm = {
  productId: string;
  quantity: number;
  price: number;
};

const emptyItem = (): InvoiceItemForm => ({ productId: "", quantity: 1, price: 0 });

export default function PurchaseInvoicesPage() {
  const { user } = useAuth();
  const canView = Boolean(user && hasPermission(user, "viewInvoices"));
  const canAdd = Boolean(user && hasPermission(user, "addInvoices"));

  const [invoices, setInvoices] = React.useState<any[]>([]);
  const [products, setProducts] = React.useState<any[]>([]);
  const [warehouses, setWarehouses] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [viewingInvoice, setViewingInvoice] = React.useState<any | null>(null);
  const [page, setPage] = React.useState(1);
  const PAGE_SIZE = 10;

  // حقول الفاتورة الجديدة
  const [supplierName, setSupplierName] = React.useState("");
  const [warehouseId, setWarehouseId] = React.useState<string>("");
  const [notes, setNotes] = React.useState("");
  const [items, setItems] = React.useState<InvoiceItemForm[]>([emptyItem()]);

  const loadData = React.useCallback(async () => {
    if (!canView) return;
    const res = await getPurchaseInvoiceData();
    if (!res.success) {
      toast.error(String(res.error || "فشل في جلب بيانات الفواتير"));
      return;
    }

    const payload = res.data as any;
    setInvoices(payload?.invoices || []);
    setProducts(payload?.products || []);
    setWarehouses(payload?.warehouses || []);
  }, [canView]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const resetForm = () => {
    setSupplierName("");
    setWarehouseId("");
    setNotes("");
    setItems([emptyItem()]);
  };

  const handleClose = () => {
    setIsOpen(false);
    resetForm();
  };

  const updateItem = (index: number, field: keyof InvoiceItemForm, value: any) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalAmount = React.useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0), 0),
    [items]
  );

  const handleSubmit = async () => {
    if (!warehouseId) {
      toast.error("يرجى اختيار المستودع");
      return;
    }

    const validItems = items.filter((item) => item.productId && Number(item.quantity) > 0);
    if (validItems.length === 0) {
      toast.error("يرجى إضافة منتج واحد على الأقل بكمية صحيحة");
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading("جاري حفظ الفاتورة وإضافة الكميات للمخزون...");
    try {
      const res = await createPurchaseInvoiceAction(
        { supplierName: supplierName || null, warehouseId, notes: notes || null },
        validItems
      );
      if (!res.success) {
        throw new Error(String(res.error || "فشل حفظ الفاتورة"));
      }

      toast.success("تم حفظ الفاتورة وإضافة الكميات إلى المخزون بنجاح");
      handleClose();
      loadData();
    } catch (error: any) {
      toast.error(error?.message || "حدث خطأ أثناء حفظ الفاتورة");
    } finally {
      setLoading(false);
      toast.dismiss(loadingToast);
    }
  };

  const productOptions = products.map((product) => ({
    value: String(product.id),
    label: product.name,
  }));

  const warehouseOptions = warehouses.map((warehouse) => ({
    value: String(warehouse.id),
    label: `${warehouse.name} (${warehouse.location})`,
  }));

  if (!canView) {
    return (
      <div className="p-4" dir="rtl">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">فواتير الشراء</h1>
        <p className="mt-4 text-sm text-slate-500">لا تملك صلاحية عرض هذه الصفحة.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">فواتير الشراء</h1>
          <p className="text-sm text-slate-500 mt-1">
            إضافة فاتورة شراء تزيد كميات المنتجات في المستودع فوراً
          </p>
        </div>
        {canAdd && (
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white px-6"
            onClick={() => setIsOpen(true)}
          >
            <Plus size={16} className="ml-2" />
            فاتورة جديدة
          </Button>
        )}
      </div>

      <DataTable
        data={invoices}
        totalCount={invoices.length}
        pageSize={PAGE_SIZE}
        currentPage={page}
        onPageChange={(p) => setPage(p)}
        actions={[
          {
            label: "عرض",
            icon: <Eye size={14} />,
            variant: "default" as const,
            onClick: (row: any) => setViewingInvoice(row),
          },
        ]}
        columns={[
          { header: "رقم الفاتورة", accessor: (row: any) => <span className="font-mono font-bold">{row.invoiceNumber}</span> },
          { header: "المورد", accessor: (row: any) => row.supplierName || "-" },
          { header: "المستودع", accessor: (row: any) => row.warehouse?.name || "-" },
          { header: "عدد الأصناف", accessor: (row: any) => row.items?.length || 0 },
          {
            header: "الإجمالي",
            accessor: (row: any) => <span className="font-black text-blue-600">{Number(row.totalAmount || 0).toLocaleString()}$</span>,
          },
          { header: "الموظف", accessor: (row: any) => row.user?.username || "-" },
          {
            header: "التاريخ",
            accessor: (row: any) =>
              new Date(row.createdAt).toLocaleDateString("ar-EG", {
                year: "numeric",
                month: "long",
                day: "numeric",
              }),
          },
          { header: "ملاحظات", accessor: (row: any) => row.notes || "-" },
        ]}
      />

      {/* نافذة إنشاء فاتورة جديدة */}
      <AppModal title="فاتورة شراء جديدة" isOpen={isOpen} onClose={handleClose} size="full">
        <div className="p-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormInput
              className="text-gray-800 dark:text-white"
              label="اسم المورد (اختياري)"
              value={supplierName}
              onChange={(e: any) => setSupplierName(e.target.value)}
              placeholder="اسم المورد"
            />
            <FormSelect
              className="text-gray-800 dark:text-white"
              label="المستودع"
              options={warehouseOptions}
              value={warehouseId}
              onChange={(e: any) => setWarehouseId(e.target.value)}
            />
            <FormInput
              className="text-gray-800 dark:text-white"
              label="ملاحظات (اختياري)"
              value={notes}
              onChange={(e: any) => setNotes(e.target.value)}
              placeholder="ملاحظات"
            />
          </div>

          <div className="space-y-3">
            <h3 className="font-black text-slate-800 dark:text-slate-100">المنتجات والكميات</h3>
            {items.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800"
              >
                <div className="md:col-span-6">
                  <SearchableSelect
                    label="المنتج"
                    placeholder="اختر المنتج..."
                    searchPlaceholder="ابحث باسم المنتج..."
                    options={productOptions}
                    value={item.productId}
                    onChange={(val) => updateItem(index, "productId", String(val))}
                  />
                </div>
                <div className="md:col-span-2">
                  <FormInput
                    className="text-gray-800 dark:text-white"
                    type="number"
                    min={1}
                    label="الكمية"
                    value={item.quantity}
                    onChange={(e: any) => updateItem(index, "quantity", Number(e.target.value))}
                  />
                </div>
                <div className="md:col-span-2">
                  <FormInput
                    className="text-gray-800 dark:text-white"
                    type="number"
                    min={0}
                    step="any"
                    label="سعر الشراء"
                    value={item.price}
                    onChange={(e: any) => updateItem(index, "price", Number(e.target.value))}
                  />
                </div>
                <div className="md:col-span-2 flex justify-center pb-1">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-red-400 hover:text-red-600 disabled:opacity-30"
                    disabled={items.length === 1}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setItems((prev) => [...prev, emptyItem()])}
              className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 font-bold text-xs hover:border-blue-500 hover:text-blue-500 transition-all"
            >
              + إضافة منتج آخر
            </button>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-t pt-4 dark:border-slate-800">
            <div className="bg-blue-50 dark:bg-blue-900/20 px-8 py-4 rounded-3xl">
              <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">إجمالي الفاتورة</p>
              <h3 className="text-3xl font-black text-blue-600 italic">{totalAmount.toLocaleString()}$</h3>
            </div>
            <div className="flex gap-3">
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white px-10"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? "جاري الحفظ..." : "حفظ وإضافة للمخزون"}
              </Button>
              <Button
                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-8"
                onClick={handleClose}
              >
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      </AppModal>

      {/* نافذة عرض تفاصيل الفاتورة */}
      <AppModal
        title={`فاتورة ${viewingInvoice?.invoiceNumber || ""}`}
        isOpen={Boolean(viewingInvoice)}
        onClose={() => setViewingInvoice(null)}
      >
        {viewingInvoice && (
          <div className="p-2 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <p className="font-bold text-slate-600 dark:text-slate-300">
                المورد: <span className="text-slate-900 dark:text-white">{viewingInvoice.supplierName || "-"}</span>
              </p>
              <p className="font-bold text-slate-600 dark:text-slate-300">
                المستودع: <span className="text-slate-900 dark:text-white">{viewingInvoice.warehouse?.name || "-"}</span>
              </p>
              <p className="font-bold text-slate-600 dark:text-slate-300">
                الموظف: <span className="text-slate-900 dark:text-white">{viewingInvoice.user?.username || "-"}</span>
              </p>
              <p className="font-bold text-slate-600 dark:text-slate-300">
                الإجمالي: <span className="text-blue-600 font-black">{Number(viewingInvoice.totalAmount || 0).toLocaleString()}$</span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-right">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="px-4 py-2 font-black text-xs">المنتج</th>
                    <th className="px-4 py-2 font-black text-xs text-center">الكمية</th>
                    <th className="px-4 py-2 font-black text-xs text-center">سعر الشراء</th>
                    <th className="px-4 py-2 font-black text-xs text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {viewingInvoice.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 font-bold text-slate-800 dark:text-slate-100">{item.product?.name || "-"}</td>
                      <td className="px-4 py-2 text-center font-bold text-emerald-600">+{item.quantity}</td>
                      <td className="px-4 py-2 text-center font-bold text-slate-600">{Number(item.price || 0).toLocaleString()}$</td>
                      <td className="px-4 py-2 text-left font-black text-slate-900 dark:text-white">
                        {(Number(item.quantity) * Number(item.price || 0)).toLocaleString()}$
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {viewingInvoice.notes && (
              <p className="text-sm font-bold text-slate-500">ملاحظات: {viewingInvoice.notes}</p>
            )}
          </div>
        )}
      </AppModal>
    </div>
  );
}
