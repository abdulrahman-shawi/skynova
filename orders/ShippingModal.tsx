import React from 'react';
import { AppModal } from '@/components/ui/app-modal';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { getFatihFormOptions, getFatihPricing } from '@/server/shipping';
import { FATIH_COMPANY_NAME } from '@/lib/fatih';
import toast from 'react-hot-toast';

interface ShippingForm {
  shippingCompanyName: string;
  shippingPrice: string;
  moneyTransferCommission: string;
  otherCommissions: string;
}

// توحيد الحروف العربية لتسهيل المطابقة (أ/إ/آ -> ا)
const normalizeAr = (value: unknown) =>
  String(value || "").replace(/[أإآ]/g, "ا").replace(/\s+/g, " ").trim();

// مدينة المصدر الافتراضية: محافظة حمص - حمص
const pickFatihSourceCity = (cities: any[]) => {
  const exact = cities.find(
    (c: any) =>
      normalizeAr(c?.parent_city_name).includes("حمص") && normalizeAr(c?.name) === "حمص"
  );
  if (exact) return exact;
  return cities.find((c: any) =>
    normalizeAr(`${c?.parent_city_name || ""} ${c?.name || ""}`).includes("حمص")
  );
};

// الوحدة الافتراضية: إلكترونيات
const pickFatihElectronicsUnit = (units: any[]) =>
  units.find((u: any) => normalizeAr(u?.name || u?.title).includes("الكترونيات"));

// يستخرج قيمة رقمية من عنصر قائمة (من حقول معروفة أو من الاسم)
const fatihNumericValue = (item: any): number | null => {
  for (const key of ["value", "weight", "size", "min", "min_weight", "from"]) {
    const n = Number(item?.[key]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const match = String(item?.name || "").replace(/[,،]/g, ".").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
};

// الوزن/الحجم الافتراضي: أقل قيمة (وإن تعذر استخراج رقم نأخذ أول عنصر)
const pickFatihLowest = (list: any[]) => {
  if (!Array.isArray(list) || list.length === 0) return undefined;
  const valued = list.map((item) => ({ item, value: fatihNumericValue(item) }));
  if (valued.every((v) => v.value === null)) return list[0];
  return valued.reduce((best, current) =>
    (current.value ?? Infinity) < (best.value ?? Infinity) ? current : best
  ).item;
};

// بيانات شحنة الفاتح المطلوبة حسب واجهة إنشاء الشحنة في نظامهم
export interface FatihShipmentInput {
  citySourceId: number | null;
  cityTargetId: number | null;
  unitId: number | null;
  weightId: number | null;
  sizeId: number | null;
  qrCode: string | null;
  packageCount: number | null;
  senderPhone: string | null;
  senderAddress: string | null;
  globalName: string | null;
  receivePhone: string | null;
  receiveAddress: string | null;
  price: number | null;
  orderValue: number | null;
  isOrderValueMatchesCollection: boolean;
  insuranceBreakage: boolean;
  insuranceLoss: boolean;
  farSender: boolean;
  requiresCustomFee: boolean;
  receiveAtBranch: boolean;
  note: string | null;
}

interface ShippingModalProps {
  isOpen: boolean;
  onClose: () => void;
  shippingForm: ShippingForm;
  onFormChange: (form: ShippingForm) => void;
  shippingCompanyOptions: string[];
  onSave: (fatihData?: FatihShipmentInput) => Promise<void>;
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
  const [pricingLoading, setPricingLoading] = React.useState(false);
  const [pricingError, setPricingError] = React.useState<string | null>(null);
  const [pricingResult, setPricingResult] = React.useState<{
    far: number;
    farTr: number;
    farSyp: number;
    requiresCustomFee: boolean;
    customFeeMessage: string | null;
  } | null>(null);
  const [fatihForm, setFatihForm] = React.useState({
    citySourceId: "",
    cityTargetId: "",
    unitId: "",
    weightId: "",
    sizeId: "",
    qrCode: "",
    packageCount: "1",
    senderPhone: "",
    senderAddress: "",
    globalName: "",
    receivePhone: "",
    receiveAddress: "",
    price: "0",
    orderValue: "",
    isOrderValueMatchesCollection: true,
    insuranceBreakage: false,
    insuranceLoss: false,
    farSender: false,
    requiresCustomFee: false,
    receiveAtBranch: false,
    note: "",
  });

  React.useEffect(() => {
    if (!isOpen) return;
    setFatihForm({
      citySourceId: targetOrder?.fatihCitySourceId ? String(targetOrder.fatihCitySourceId) : "",
      cityTargetId: targetOrder?.fatihCityTargetId ? String(targetOrder.fatihCityTargetId) : "",
      unitId: targetOrder?.fatihUnitId ? String(targetOrder.fatihUnitId) : "",
      weightId: targetOrder?.fatihWeightId ? String(targetOrder.fatihWeightId) : "",
      sizeId: targetOrder?.fatihSizeId ? String(targetOrder.fatihSizeId) : "",
      qrCode: "",
      packageCount: "1",
      senderPhone: String(targetOrder?.user?.phone || targetOrder?.customer?.phone || ""),
      senderAddress: String(targetOrder?.warehouse?.location || targetOrder?.country || ""),
      globalName: String(targetOrder?.receiverName || targetOrder?.customer?.name || ""),
      receivePhone: String(targetOrder?.receiverPhone?.[0] || targetOrder?.customer?.phone || ""),
      receiveAddress: String(targetOrder?.fullAddress || targetOrder?.city || ""),
      price: "0",
      orderValue: String(Number(targetOrder?.finalAmount || 0)),
      isOrderValueMatchesCollection: true,
      insuranceBreakage: false,
      insuranceLoss: false,
      farSender: false,
      requiresCustomFee: false,
      receiveAtBranch: false,
      note: "",
    });
    setPricingResult(null);
    setPricingError(null);
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
          const data = res.data as any;
          setFatihOptions(data);
          // تعبئة القيم الافتراضية للحقول الفارغة فقط (لا تكتب فوق القيم المحفوظة)
          const sourceCity = pickFatihSourceCity(data.cities || []);
          const electronicsUnit = pickFatihElectronicsUnit(data.units || []);
          const lowestWeight = pickFatihLowest(data.weights || []);
          const lowestSize = pickFatihLowest(data.sizes || []);
          setFatihForm((f) => ({
            ...f,
            citySourceId: f.citySourceId || (sourceCity ? String(sourceCity.id) : ""),
            unitId: f.unitId || (electronicsUnit ? String(electronicsUnit.id) : ""),
            weightId: f.weightId || (lowestWeight ? String(lowestWeight.id) : ""),
            sizeId: f.sizeId || (lowestSize ? String(lowestSize.id) : ""),
          }));
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

  const cityOptions = React.useMemo(
    () =>
      fatihOptions.cities.map((c: any) => ({
        value: c.id,
        label: c.parent_city_name ? `${c.parent_city_name} - ${c.name}` : c.name,
      })),
    [fatihOptions.cities]
  );

  const canEstimate = Boolean(fatihForm.cityTargetId && fatihForm.weightId && fatihForm.sizeId);

  const handleEstimatePricing = async () => {
    if (!canEstimate || pricingLoading) return;
    setPricingLoading(true);
    setPricingError(null);
    setPricingResult(null);
    try {
      const res = await getFatihPricing({
        cityId: Number(fatihForm.cityTargetId),
        weightId: Number(fatihForm.weightId),
        sizeId: Number(fatihForm.sizeId),
        packageCount: Number(fatihForm.packageCount) || 1,
        orderValue: Number(fatihForm.orderValue) || 0,
        receiveAtBranch: fatihForm.receiveAtBranch,
        insuranceAgainstLoss: fatihForm.insuranceLoss,
        insuranceAgainstBreakage: fatihForm.insuranceBreakage,
      });
      if (res.success) {
        setPricingResult(res.data);
        // تعبئة سعر الشحنة تلقائياً بالأجور المقدرة
        if (res.data.far > 0) {
          onFormChange({ ...shippingForm, shippingPrice: String(res.data.far) });
        }
        if (res.data.requiresCustomFee) {
          setFatihForm((f) => ({ ...f, requiresCustomFee: true }));
        }
        toast.success(`الأجور المقدرة: ${res.data.far} $`);
      } else {
        setPricingError(res.error || "تعذر تقدير أجور الشحن");
        toast.error(res.error || "تعذر تقدير أجور الشحن");
      }
    } catch {
      setPricingError("تعذر تقدير أجور الشحن");
      toast.error("تعذر تقدير أجور الشحن");
    } finally {
      setPricingLoading(false);
    }
  };

  const handleSave = () => {
    if (!isFatih) {
      void onSave();
      return;
    }
    const toId = (v: string) => {
      const n = Number(v);
      return Number.isInteger(n) && n > 0 ? n : null;
    };
    const toAmount = (v: string) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? n : null;
    };
    void onSave({
      citySourceId: toId(fatihForm.citySourceId),
      cityTargetId: toId(fatihForm.cityTargetId),
      unitId: toId(fatihForm.unitId),
      weightId: toId(fatihForm.weightId),
      sizeId: toId(fatihForm.sizeId),
      qrCode: fatihForm.qrCode.trim() || null,
      packageCount: toId(fatihForm.packageCount),
      senderPhone: fatihForm.senderPhone.trim() || null,
      senderAddress: fatihForm.senderAddress.trim() || null,
      globalName: fatihForm.globalName.trim() || null,
      receivePhone: fatihForm.receivePhone.trim() || null,
      receiveAddress: fatihForm.receiveAddress.trim() || null,
      price: toAmount(fatihForm.price),
      orderValue: toAmount(fatihForm.orderValue),
      isOrderValueMatchesCollection: fatihForm.isOrderValueMatchesCollection,
      insuranceBreakage: fatihForm.insuranceBreakage,
      insuranceLoss: fatihForm.insuranceLoss,
      farSender: fatihForm.farSender,
      requiresCustomFee: fatihForm.requiresCustomFee,
      receiveAtBranch: fatihForm.receiveAtBranch,
      note: fatihForm.note.trim() || null,
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

  const renderFatihInput = (
    label: string,
    key: keyof typeof fatihForm,
    opts?: { type?: string; placeholder?: string; maxLength?: number }
  ) => (
    <div>
      <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-200">
        {label}
      </label>
      <input
        type={opts?.type || "text"}
        {...(opts?.type === "number" ? { min: 0, step: "0.01" } : {})}
        {...(opts?.maxLength ? { maxLength: opts.maxLength } : {})}
        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 px-3 py-2"
        placeholder={opts?.placeholder}
        value={String(fatihForm[key] ?? "")}
        onChange={(e) => setFatihForm({ ...fatihForm, [key]: e.target.value })}
        disabled={isSaving || fatihLoading}
      />
    </div>
  );

  const renderFatihCheckbox = (label: string, key: keyof typeof fatihForm) => (
    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 dark:border-slate-600"
        checked={Boolean(fatihForm[key])}
        onChange={(e) => setFatihForm({ ...fatihForm, [key]: e.target.checked })}
        disabled={isSaving || fatihLoading}
      />
      {label}
    </label>
  );

  return (
    <AppModal
      size="lg"
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
            {/* رقم الشحنة QR — أول الحقول ويظهر دائماً */}
            <div>
              <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-200">
                رقم الشحنة QR
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={7}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 px-3 py-2"
                placeholder="اختياري — اتركه فارغاً للتوليد التلقائي"
                value={fatihForm.qrCode}
                onChange={(e) =>
                  setFatihForm({ ...fatihForm, qrCode: e.target.value.replace(/\D/g, "").slice(0, 7) })
                }
                disabled={isSaving}
              />
            </div>
            {targetOrder?.fatihQrCode && (
              <div className="text-sm text-slate-600 dark:text-slate-300">
                رقم الشحنة الحالي: <span className="font-bold">{targetOrder.fatihQrCode}</span>
              </div>
            )}
            {fatihLoading ? (
              <div className="text-sm text-slate-500">جاري تحميل قوائم الفاتح...</div>
            ) : fatihError ? (
              <div className="text-sm text-red-500">{fatihError}</div>
            ) : (
              <>
                <SearchableSelect
                  label="مدينة المصدر"
                  options={cityOptions}
                  value={fatihForm.citySourceId}
                  onChange={(v) => setFatihForm({ ...fatihForm, citySourceId: String(v) })}
                  placeholder="اختر مدينة المصدر"
                  searchPlaceholder="ابحث عن مدينة المصدر..."
                  disabled={isSaving || fatihLoading}
                  defaultLimit={5}
                />
                <SearchableSelect
                  label="مدينة الوجهة"
                  options={cityOptions}
                  value={fatihForm.cityTargetId}
                  onChange={(v) => setFatihForm({ ...fatihForm, cityTargetId: String(v) })}
                  placeholder="اختر مدينة الوجهة"
                  searchPlaceholder="ابحث عن مدينة الوجهة..."
                  disabled={isSaving || fatihLoading}
                  defaultLimit={5}
                />
                {renderFatihSelect("الوحدة", fatihForm.unitId, "unitId", fatihOptions.units, "اختر الوحدة")}
                {renderFatihSelect("الوزن", fatihForm.weightId, "weightId", fatihOptions.weights, "اختر الوزن")}
                {renderFatihSelect("الحجم", fatihForm.sizeId, "sizeId", fatihOptions.sizes, "اختر الحجم")}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {renderFatihInput("عدد الطرود", "packageCount", { type: "number", placeholder: "1" })}
                  {renderFatihInput("هاتف المرسل", "senderPhone", { maxLength: 20 })}
                  {renderFatihInput("عنوان المرسل", "senderAddress", { maxLength: 255 })}
                  {renderFatihInput("اسم المستلم", "globalName")}
                  {renderFatihInput("هاتف المستلم", "receivePhone", { maxLength: 20 })}
                  {renderFatihInput("عنوان المستلم", "receiveAddress", { maxLength: 500 })}
                  {renderFatihInput("قيمة الطلب", "orderValue", { type: "number" })}
                  {renderFatihInput("السعر (price)", "price", { type: "number" })}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  أجور الشحن (far) تؤخذ من حقل «سعر الشحنة» أدناه
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {renderFatihCheckbox("قيمة الطلب تطابق التحصيل", "isOrderValueMatchesCollection")}
                  {renderFatihCheckbox("تأمين ضد الكسر", "insuranceBreakage")}
                  {renderFatihCheckbox("تأمين ضد الفقدان", "insuranceLoss")}
                  {renderFatihCheckbox("الأجور على المرسل", "farSender")}
                  {renderFatihCheckbox("أجور مخصصة", "requiresCustomFee")}
                  {renderFatihCheckbox("الاستلام من الفرع", "receiveAtBranch")}
                </div>
                {renderFatihInput("ملاحظة (اختياري)", "note")}
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleEstimatePricing}
                    disabled={isSaving || fatihLoading || pricingLoading || !canEstimate}
                  >
                    {pricingLoading ? "جاري التقدير..." : "تقدير أجور الشحن"}
                  </Button>
                  {!canEstimate && (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      اختر مدينة الوجهة والوزن والحجم أولاً
                    </div>
                  )}
                  {pricingError && (
                    <div className="text-sm text-red-500">{pricingError}</div>
                  )}
                  {pricingResult && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-900 dark:bg-emerald-950/40 space-y-1">
                      <div className="font-bold text-emerald-700 dark:text-emerald-300">
                        الأجور المقدرة: {pricingResult.far} $
                        {pricingResult.farTr > 0 && ` — ${pricingResult.farTr} ₺`}
                        {pricingResult.farSyp > 0 && ` — ${pricingResult.farSyp} ل.س`}
                      </div>
                      <div className="font-bold text-blue-700 dark:text-blue-300">
                        المتبقي من قيمة الطلب بعد الأجور:{" "}
                        {Math.max(0, (Number(fatihForm.orderValue) || 0) - pricingResult.far)} $
                      </div>
                      {pricingResult.far > 0 && (
                        <div className="text-xs text-emerald-600 dark:text-emerald-400">
                          تمت تعبئة حقل «سعر الشحنة» تلقائياً بالقيمة المقدرة
                        </div>
                      )}
                      {pricingResult.customFeeMessage && (
                        <div className="text-amber-600 dark:text-amber-400">{pricingResult.customFeeMessage}</div>
                      )}
                    </div>
                  )}
                </div>
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
