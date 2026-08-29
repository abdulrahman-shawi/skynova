import React from 'react';
import { AppModal } from '@/components/ui/app-modal';
import { Button } from '@/components/ui/button';
import { getFatihFormOptions } from '@/server/shipping';
import { FATIH_COMPANY_NAME } from '@/lib/fatih';

interface ShippingForm {
  shippingCompanyName: string;
  shippingPrice: string;
  moneyTransferCommission: string;
  otherCommissions: string;
}

interface ShippingModalProps {
  isOpen: boolean;
  onClose: () => void;
  shippingForm: ShippingForm;
  onFormChange: (form: ShippingForm) => void;
  shippingCompanyOptions: string[];
  onSave: (fatihData?: {
    citySourceId: number | null;
    cityTargetId: number | null;
    unitId: number | null;
    weightId: number | null;
    sizeId: number | null;
  }) => Promise<void>;
  isSaving: boolean;
  targetOrder?: any;
}

export const ShippingModal: React.FC<ShippingModalProps> = ({
  isOpen,
  onClose,
  shippingForm,
  onFormChange,
  shippingCompanyOptions,
  onSave,
  isSaving,
  targetOrder,
}) => {
  const isFatih = shippingForm.shippingCompanyName.trim() === FATIH_COMPANY_NAME;
  const [fatihOptions, setFatihOptions] = React.useState<{
    cities: any[];
    units: any[];
    weights: any[];
    sizes: any[];
  }>({ cities: [], units: [], weights: [], sizes: [] });
  const [fatihLoading, setFatihLoading] = React.useState(false);
  const [fatihError, setFatihError] = React.useState<string | null>(null);
  const [fatihForm, setFatihForm] = React.useState({
    citySourceId: "",
    cityTargetId: "",
    unitId: "",
    weightId: "",
    sizeId: "",
  });

  React.useEffect(() => {
    if (!isOpen) return;
    setFatihForm({
      citySourceId: targetOrder?.fatihCitySourceId ? String(targetOrder.fatihCitySourceId) : "",
      cityTargetId: targetOrder?.fatihCityTargetId ? String(targetOrder.fatihCityTargetId) : "",
      unitId: targetOrder?.fatihUnitId ? String(targetOrder.fatihUnitId) : "",
      weightId: targetOrder?.fatihWeightId ? String(targetOrder.fatihWeightId) : "",
      sizeId: targetOrder?.fatihSizeId ? String(targetOrder.fatihSizeId) : "",
    });
  }, [isOpen, targetOrder]);

  React.useEffect(() => {
    if (!isOpen || !isFatih) return;
    let cancelled = false;

    const load = async () => {
      setFatihLoading(true);
      setFatihError(null);
      try {
        const res = await getFatihFormOptions();
        if (cancelled) return;
        if (res.success) {
          setFatihOptions(res.data as any);
        } else {
          setFatihError(res.error || "تعذر جلب بيانات الفاتح");
        }
      } catch {
        if (!cancelled) setFatihError("تعذر جلب بيانات الفاتح");
      } finally {
        if (!cancelled) setFatihLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, isFatih]);

  const handleSave = () => {
    if (!isFatih) {
      void onSave();
      return;
    }
    const toId = (v: string) => {
      const n = Number(v);
      return Number.isInteger(n) && n > 0 ? n : null;
    };
    void onSave({
      citySourceId: toId(fatihForm.citySourceId),
      cityTargetId: toId(fatihForm.cityTargetId),
      unitId: toId(fatihForm.unitId),
      weightId: toId(fatihForm.weightId),
      sizeId: toId(fatihForm.sizeId),
    });
  };

  const renderFatihSelect = (
    label: string,
    value: string,
    key: keyof typeof fatihForm,
    options: any[],
    emptyLabel: string
  ) => (
    <div>
      <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-200">
        {label}
      </label>
      <select
        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2"
        value={value}
        onChange={(e) => setFatihForm({ ...fatihForm, [key]: e.target.value })}
        disabled={isSaving || fatihLoading}
      >
        <option value="">{emptyLabel}</option>
        {options.map((opt: any) => (
          <option key={opt.id} value={String(opt.id)}>
            {opt.parent_city_name ? `${opt.parent_city_name} - ${opt.name}` : opt.name}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <AppModal
      size="md"
      isOpen={isOpen}
      onClose={onClose}
      title="بيانات الشحن والعمولات"
      description={targetOrder ? `الطلب #${targetOrder.orderNumber}` : undefined}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            إلغاء
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || (isFatih && fatihLoading)}
          >
            {isSaving ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4">
        {/* اسم شركة الشحن */}
        <div>
          <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-200">
            اسم شركة الشحن
          </label>
          <select
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2"
            value={shippingForm.shippingCompanyName}
            onChange={(e) =>
              onFormChange({ ...shippingForm, shippingCompanyName: e.target.value })
            }
            disabled={isSaving}
          >
            <option value="">اختر شركة الشحن</option>
            {shippingCompanyOptions.map((name: string) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* حقول شركة الفاتح */}
        {isFatih && (
          <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 p-4 space-y-4">
            <div className="text-sm font-black text-blue-700 dark:text-blue-300">
              بيانات شحنة الفاتح (سيتم إنشاء الشحنة تلقائياً عند الحفظ)
            </div>
            {fatihLoading ? (
              <div className="text-sm text-slate-500">جاري تحميل قوائم الفاتح...</div>
            ) : fatihError ? (
              <div className="text-sm text-red-500">{fatihError}</div>
            ) : (
              <>
                {renderFatihSelect("مدينة المصدر", fatihForm.citySourceId, "citySourceId", fatihOptions.cities, "اختر مدينة المصدر")}
                {renderFatihSelect("مدينة الوجهة", fatihForm.cityTargetId, "cityTargetId", fatihOptions.cities, "اختر مدينة الوجهة")}
                {renderFatihSelect("الوحدة", fatihForm.unitId, "unitId", fatihOptions.units, "اختر الوحدة")}
                {renderFatihSelect("الوزن", fatihForm.weightId, "weightId", fatihOptions.weights, "اختر الوزن")}
                {renderFatihSelect("الحجم", fatihForm.sizeId, "sizeId", fatihOptions.sizes, "اختر الحجم")}
                {targetOrder?.fatihQrCode && (
                  <div className="text-sm text-slate-600 dark:text-slate-300">
                    رقم الشحنة الحالي: <span className="font-bold">{targetOrder.fatihQrCode}</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* سعر الشحنة */}
        <div>
          <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-200">
            سعر الشحنة
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 px-3 py-2"
            value={shippingForm.shippingPrice}
            onChange={(e) =>
              onFormChange({ ...shippingForm, shippingPrice: e.target.value })
            }
            disabled={isSaving}
          />
        </div>

        {/* عمولة تحويل الأموال */}
        <div>
          <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-200">
            عمولة تحويل الأموال
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 px-3 py-2"
            value={shippingForm.moneyTransferCommission}
            onChange={(e) =>
              onFormChange({
                ...shippingForm,
                moneyTransferCommission: e.target.value,
              })
            }
            disabled={isSaving}
          />
        </div>

        {/* عمولات أخرى */}
        <div>
          <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-200">
            عمولات أخرى
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 px-3 py-2"
            value={shippingForm.otherCommissions}
            onChange={(e) =>
              onFormChange({ ...shippingForm, otherCommissions: e.target.value })
            }
            disabled={isSaving}
          />
        </div>
      </div>
    </AppModal>
  );
};
