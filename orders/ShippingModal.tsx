import React from 'react';
import { AppModal } from '@/components/ui/app-modal';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { getFatihFormOptions, getFatihPricing, findBabelNeighbourhoodByAddress, calculateBabelExpressPrice, getBabelExpressAwbPdf, getBabelExpressAwbLink } from '@/server/shipping';
import { FATIH_COMPANY_NAME } from '@/lib/fatih';
import { BABEL_EXPRESS_COMPANY_NAME } from '@/lib/babel-express';
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

// بيانات شحنة بابل اكسبريس حسب واجهة createShipment في نظامهم
export interface BabelExpressShipmentInput {
  receiverName: string | null;
  phoneCountry: string | null;
  phone: string | null;
  address: string | null;
  neighbourhoodId: number | null;
  type: "box" | "envelope";
  weight: number | null;
  contents: string | null;
  reference: string | null;
  deliveryType: "address" | "hub";
  pickupType: "address" | "hub";
  codAmount: number | null;
  codCurrency: string;
  payer: "sender" | "receiver" | "reseller";
}

// يفصل رمز الدولة عن رقم الهاتف عند تعبئة النموذج من بيانات الطلب
const splitBabelPhone = (rawPhone: unknown, fallbackCountry: string) => {
  const digits = String(rawPhone || "").replace(/\D/g, "");
  for (const code of ["963", "964", "90"]) {
    if (digits.startsWith(code) && digits.length > code.length + 6) {
      return { country: code, phone: digits.slice(code.length) };
    }
  }
  return { country: fallbackCountry, phone: digits.replace(/^0+/, "") };
};

// يخمن رمز الدولة الافتراضي من دولة الطلب
const guessBabelPhoneCountry = (order: any) => {
  const saved = String(order?.customer?.countryCode || "").replace(/\D/g, "");
  if (saved) return saved;
  const country = String(order?.country || "");
  if (country.includes("سوريا")) return "963";
  if (country.includes("عراق")) return "964";
  return "90";
};

interface ShippingModalProps {
  isOpen: boolean;
  onClose: () => void;
  shippingForm: ShippingForm;
  onFormChange: (form: ShippingForm) => void;
  shippingCompanyOptions: string[];
  onSave: (fatihData?: FatihShipmentInput, babelData?: BabelExpressShipmentInput) => Promise<void>;
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
  const isBabelExpress = shippingForm.shippingCompanyName.trim() === BABEL_EXPRESS_COMPANY_NAME;
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
  const [babelForm, setBabelForm] = React.useState({
    receiverName: "",
    phoneCountry: "90",
    phone: "",
    address: "",
    neighbourhoodAddress: "",
    neighbourhoodId: null as number | null,
    type: "box",
    weight: "1",
    contents: "",
    reference: "",
    deliveryType: "address",
    pickupType: "address",
    codAmount: "",
    codCurrency: "USD",
    payer: "reseller",
  });
  const [babelNeighLoading, setBabelNeighLoading] = React.useState(false);
  const [babelNeighError, setBabelNeighError] = React.useState<string | null>(null);
  const [babelNeighResult, setBabelNeighResult] = React.useState<{
    city: { id: number | null; name: string } | null;
    area: { id: number | null; name: string } | null;
    neighbourhood: { id: number; name: string };
  } | null>(null);
  const [babelPricing, setBabelPricing] = React.useState<{ price: number | null; currency: string | null } | null>(null);
  const [babelPricingLoading, setBabelPricingLoading] = React.useState(false);
  const [babelPricingError, setBabelPricingError] = React.useState<string | null>(null);
  const [babelAwbLoading, setBabelAwbLoading] = React.useState(false);

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

    // تعبئة نموذج بابل اكسبريس من بيانات الطلب
    const fallbackCountry = guessBabelPhoneCountry(targetOrder);
    const phoneParts = splitBabelPhone(
      targetOrder?.receiverPhone?.[0] || targetOrder?.customer?.phone || "",
      fallbackCountry
    );
    const itemNames = Array.isArray(targetOrder?.items)
      ? targetOrder.items.map((i: any) => i?.product?.name || i?.name).filter(Boolean).join(" - ")
      : "";
    setBabelForm({
      receiverName: String(targetOrder?.receiverName || targetOrder?.customer?.name || ""),
      phoneCountry: phoneParts.country,
      phone: phoneParts.phone,
      address: String(targetOrder?.fullAddress || targetOrder?.city || ""),
      neighbourhoodAddress: String(targetOrder?.city || targetOrder?.fullAddress || ""),
      neighbourhoodId: null,
      type: "box",
      weight: "1",
      contents: itemNames,
      reference: String(targetOrder?.orderNumber || ""),
      deliveryType: "address",
      pickupType: "address",
      codAmount: String(Number(targetOrder?.finalAmount || 0)),
      codCurrency: "USD",
      payer: "reseller",
    });
    setBabelNeighResult(null);
    setBabelNeighError(null);
    setBabelPricing(null);
    setBabelPricingError(null);
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

  const canEstimateBabel = Boolean(babelForm.neighbourhoodId) && Number(babelForm.weight) > 0;

  // تقدير أجور شحن بابل اكسبريس تلقائياً عند اكتمال الحقول (بتأخير بسيط لتجنب كثرة الطلبات)
  React.useEffect(() => {
    if (!isOpen || !isBabelExpress || !canEstimateBabel) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setBabelPricingLoading(true);
      setBabelPricingError(null);
      try {
        const res = await calculateBabelExpressPrice({
          neighbourhoodId: babelForm.neighbourhoodId as number,
          type: babelForm.type === "envelope" ? "envelope" : "box",
          weight: babelForm.type === "envelope" ? 1 : Number(babelForm.weight),
          deliveryType: babelForm.deliveryType === "hub" ? "hub" : "address",
          pickupType: babelForm.pickupType === "hub" ? "hub" : "address",
          payer: (["sender", "receiver", "reseller"] as const).includes(babelForm.payer as any)
            ? (babelForm.payer as "sender" | "receiver" | "reseller")
            : "reseller",
        });
        if (cancelled) return;
        if (res.success) {
          setBabelPricing(res.data);
          // تعبئة سعر الشحنة تلقائياً بالقيمة المقدرة
          if (res.data.price != null && res.data.price > 0) {
            onFormChange({ ...shippingForm, shippingPrice: String(res.data.price) });
          }
        } else {
          setBabelPricing(null);
          setBabelPricingError(res.error || "تعذر تقدير أجور الشحن");
        }
      } catch {
        if (!cancelled) {
          setBabelPricing(null);
          setBabelPricingError("تعذر تقدير أجور الشحن");
        }
      } finally {
        if (!cancelled) setBabelPricingLoading(false);
      }
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isBabelExpress, canEstimateBabel, babelForm.neighbourhoodId, babelForm.type, babelForm.weight, babelForm.deliveryType, babelForm.pickupType, babelForm.payer]);

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

  const handleFindBabelNeighbourhood = async () => {
    const text = babelForm.neighbourhoodAddress.trim();
    if (!text || babelNeighLoading) return;
    setBabelNeighLoading(true);
    setBabelNeighError(null);
    setBabelNeighResult(null);
    try {
      const res = await findBabelNeighbourhoodByAddress(text);
      if (res.success) {
        setBabelNeighResult(res.data);
      } else {
        setBabelNeighError(res.error || "لم يتم العثور على منطقة مطابقة");
        toast.error(res.error || "لم يتم العثور على منطقة مطابقة");
      }
    } catch {
      setBabelNeighError("تعذر البحث عن المنطقة");
      toast.error("تعذر البحث عن المنطقة");
    } finally {
      setBabelNeighLoading(false);
    }
  };

  const handleConfirmBabelNeighbourhood = () => {
    if (!babelNeighResult) return;
    setBabelForm((f) => ({ ...f, neighbourhoodId: babelNeighResult.neighbourhood.id }));
    toast.success(`تم تأكيد المنطقة: ${babelNeighResult.neighbourhood.name}`);
  };

  // يفتح بوليصة بابل اكسبريس كملف PDF (تصل من الـ API بصيغة base64)
  const handleOpenBabelAwbPdf = async () => {
    const awb = String(targetOrder?.babelAwb || "").trim();
    if (!awb || babelAwbLoading) return;
    setBabelAwbLoading(true);
    try {
      const res = await getBabelExpressAwbPdf(awb);
      if (!res.success) {
        toast.error(res.error || "تعذر تحميل البوليصة");
        return;
      }
      const byteChars = atob(res.data.pdfBase64);
      const bytes = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch {
      toast.error("تعذر تحميل البوليصة");
    } finally {
      setBabelAwbLoading(false);
    }
  };

  // يفتح رابط بوليصة بابل اكسبريس مباشرة في تبويب جديد
  const handleOpenBabelAwbLink = async () => {
    const awb = String(targetOrder?.babelAwb || "").trim();
    if (!awb || babelAwbLoading) return;
    setBabelAwbLoading(true);
    try {
      const res = await getBabelExpressAwbLink(awb);
      if (!res.success) {
        toast.error(res.error || "تعذر جلب رابط البوليصة");
        return;
      }
      window.open(res.data.url, "_blank");
    } catch {
      toast.error("تعذر جلب رابط البوليصة");
    } finally {
      setBabelAwbLoading(false);
    }
  };

  const handleSave = () => {
    if (isBabelExpress) {
      if (babelForm.address.trim().length <= 10) {
        toast.error("عنوان المستلم يجب أن يتجاوز 10 أحرف (اكتب العنوان كاملاً: الشارع، البناء، الطابق...)");
        return;
      }
      const toNum = (v: string) => {
        const n = Number(v);
        return Number.isFinite(n) && String(v).trim() !== "" ? n : null;
      };
      void onSave(undefined, {
        receiverName: babelForm.receiverName.trim() || null,
        phoneCountry: babelForm.phoneCountry.replace(/\D/g, "") || null,
        phone: babelForm.phone.replace(/\D/g, "") || null,
        address: babelForm.address.trim() || null,
        neighbourhoodId: babelForm.neighbourhoodId,
        type: babelForm.type === "envelope" ? "envelope" : "box",
        weight: babelForm.type === "envelope" ? 1 : toNum(babelForm.weight),
        contents: babelForm.contents.trim() || null,
        reference: babelForm.reference.trim() || null,
        deliveryType: babelForm.deliveryType === "hub" ? "hub" : "address",
        pickupType: babelForm.pickupType === "hub" ? "hub" : "address",
        codAmount: toNum(babelForm.codAmount),
        codCurrency: babelForm.codCurrency || "USD",
        payer: (["sender", "receiver", "reseller"] as const).includes(babelForm.payer as any)
          ? (babelForm.payer as "sender" | "receiver" | "reseller")
          : "reseller",
      });
      return;
    }
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

  const renderBabelInput = (
    label: string,
    key: keyof typeof babelForm,
    opts?: { type?: string; placeholder?: string; maxLength?: number; disabled?: boolean }
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
        value={String(babelForm[key] ?? "")}
        onChange={(e) => setBabelForm({ ...babelForm, [key]: e.target.value })}
        disabled={isSaving || opts?.disabled}
      />
    </div>
  );

  const renderBabelSelect = (
    label: string,
    key: keyof typeof babelForm,
    options: { value: string; label: string }[]
  ) => (
    <div>
      <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-200">
        {label}
      </label>
      <select
        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2"
        value={String(babelForm[key])}
        onChange={(e) => {
          const value = e.target.value;
          setBabelForm((f) => ({
            ...f,
            [key]: value,
            // عند اختيار ظرف (envelope) يجب أن يكون الوزن 1
            ...(key === "type" && value === "envelope" ? { weight: "1" } : {}),
          }));
        }}
        disabled={isSaving}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
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

        {/* حقول شركة بابل اكسبريس */}
        {isBabelExpress && (
          <div className="rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/30 p-4 space-y-4">
            <div className="text-sm font-black text-purple-700 dark:text-purple-300">
              بيانات شحنة بابل اكسبريس (سيتم إنشاء الشحنة تلقائياً عند الحفظ)
            </div>
            {targetOrder?.babelAwb && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-900 dark:bg-emerald-950/40 space-y-2">
                <div className="text-slate-600 dark:text-slate-300">
                  رقم البوليصة الحالي (AWB): <span className="font-bold">{targetOrder.babelAwb}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleOpenBabelAwbPdf}
                    disabled={isSaving || babelAwbLoading}
                  >
                    {babelAwbLoading ? "جاري التحميل..." : "تحميل البوليصة PDF"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleOpenBabelAwbLink}
                    disabled={isSaving || babelAwbLoading}
                  >
                    فتح رابط البوليصة
                  </Button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderBabelInput("اسم المستلم", "receiverName")}
              <div className="grid grid-cols-2 gap-2">
                {renderBabelInput("رمز الدولة", "phoneCountry", { placeholder: "90", maxLength: 4 })}
                {renderBabelInput("هاتف المستلم", "phone", { maxLength: 20 })}
              </div>
              {renderBabelInput("عنوان المستلم", "address", { maxLength: 500 })}
              {renderBabelInput("محتويات الشحنة", "contents", { placeholder: "مثال: ملابس" })}
              {renderBabelSelect("نوع الشحنة", "type", [
                { value: "box", label: "صندوق (box)" },
                { value: "envelope", label: "ظرف (envelope)" },
              ])}
              {renderBabelInput("الوزن (كغ)", "weight", {
                type: "number",
                placeholder: "1",
                disabled: babelForm.type === "envelope",
              })}
              {renderBabelInput("المرجع (اختياري)", "reference")}
              {renderBabelSelect("نوع التوصيل", "deliveryType", [
                { value: "address", label: "إلى العنوان (address)" },
                { value: "hub", label: "إلى المركز (hub)" },
              ])}
              {renderBabelSelect("نوع الاستلام", "pickupType", [
                { value: "address", label: "من العنوان (address)" },
                { value: "hub", label: "من المركز (hub)" },
              ])}
              {renderBabelInput("قيمة التحصيل (COD)", "codAmount", { type: "number" })}
              {renderBabelSelect("عملة التحصيل", "codCurrency", [
                { value: "USD", label: "دولار (USD)" },
                { value: "TRY", label: "ليرة تركية (TRY)" },
                { value: "SYP", label: "ليرة سورية (SYP)" },
                { value: "IQD", label: "دينار عراقي (IQD)" },
                { value: "EUR", label: "يورو (EUR)" },
              ])}
              {renderBabelSelect("الدافع", "payer", [
                { value: "reseller", label: "الموزع (reseller)" },
                { value: "sender", label: "المرسل (sender)" },
                { value: "receiver", label: "المستلم (receiver)" },
              ])}
              <div className="sm:col-span-2 space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                  عنوان المنطقة (للبحث عن الحي)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 px-3 py-2"
                    placeholder="مثال: دمشق أبو رمانة"
                    value={babelForm.neighbourhoodAddress}
                    onChange={(e) => {
                      setBabelForm({ ...babelForm, neighbourhoodAddress: e.target.value, neighbourhoodId: null });
                      setBabelNeighResult(null);
                      setBabelNeighError(null);
                    }}
                    disabled={isSaving || babelNeighLoading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleFindBabelNeighbourhood}
                    disabled={isSaving || babelNeighLoading || !babelForm.neighbourhoodAddress.trim()}
                  >
                    {babelNeighLoading ? "جاري البحث..." : "بحث عن المنطقة"}
                  </Button>
                </div>
                {babelNeighError && (
                  <div className="text-sm text-red-500">{babelNeighError}</div>
                )}
                {babelForm.neighbourhoodId ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-900 dark:bg-emerald-950/40 flex items-center justify-between gap-2">
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">
                      المنطقة المؤكدة:{" "}
                      {babelNeighResult
                        ? [babelNeighResult.city?.name, babelNeighResult.area?.name, babelNeighResult.neighbourhood.name]
                            .filter(Boolean)
                            .join(" - ")
                        : `#${babelForm.neighbourhoodId}`}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setBabelForm({ ...babelForm, neighbourhoodId: null })}
                      disabled={isSaving}
                    >
                      تغيير
                    </Button>
                  </div>
                ) : (
                  babelNeighResult && (
                    <div className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm dark:border-purple-900 dark:bg-purple-950/40 space-y-2">
                      <div className="font-bold text-purple-700 dark:text-purple-300">
                        النتيجة:{" "}
                        {[babelNeighResult.city?.name, babelNeighResult.area?.name, babelNeighResult.neighbourhood.name]
                          .filter(Boolean)
                          .join(" - ")}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        اضغط «تأكيد المنطقة» لاعتماد هذا الحي في الشحنة
                      </div>
                      <Button
                        type="button"
                        onClick={handleConfirmBabelNeighbourhood}
                        disabled={isSaving}
                      >
                        تأكيد المنطقة
                      </Button>
                    </div>
                  )
                )}
              </div>
            </div>
            {canEstimateBabel ? (
              babelPricingLoading ? (
                <div className="text-sm text-slate-500 dark:text-slate-400">جاري تقدير أجور الشحن...</div>
              ) : babelPricingError ? (
                <div className="text-sm text-red-500">{babelPricingError}</div>
              ) : (
                babelPricing?.price != null && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-900 dark:bg-emerald-950/40 space-y-1">
                    <div className="font-bold text-emerald-700 dark:text-emerald-300">
                      السعر التقديري للشحن: {babelPricing.price} {babelPricing.currency || ""}
                    </div>
                    {babelPricing.price > 0 && (
                      <div className="text-xs text-emerald-600 dark:text-emerald-400">
                        تمت تعبئة حقل «سعر الشحنة» تلقائياً بالقيمة المقدرة
                      </div>
                    )}
                  </div>
                )
              )
            ) : (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                أكّد المنطقة وأدخل الوزن ليظهر السعر التقديري تلقائياً
              </div>
            )}
            {babelForm.type === "envelope" && (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                عند اختيار ظرف (envelope) يتم تثبيت الوزن على 1 كغ تلقائياً
              </div>
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
