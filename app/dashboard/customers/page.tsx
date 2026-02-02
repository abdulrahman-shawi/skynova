"use client";

import * as React from "react";
import * as z from "zod";
import { DynamicForm } from "@/components/shared/dynamic-form";
import { FormInput } from "@/components/ui/form-input";
import { FormCheckbox } from "@/components/ui/formcheck";
import { FormSelect } from "@/components/ui/select-form";
import { FormTextArea } from "@/components/ui/textera-form";
import { Button } from "@/components/ui/button";
import { AppModal } from "@/components/ui/app-modal";
import { createCustomerAction, deleteCustomer, getCustomer } from "@/server/customer";
import { useAuth } from "@/context/AuthContext";
import { DataTable } from "@/components/shared/DataTable";
import toast from "react-hot-toast";
import { Mail, Plus } from "lucide-react";

/* ===================== Constants ===================== */
const SOURCE_OPTIONS = [
  { label: "فيسبوك", value: "فيسبوك" },
  { label: "إنستغرام", value: "إنستغرام" },
  { label: "واتسأب", value: "واتسأب" },
  { label: "تيك توك", value: "تيك توك" },
  { label: "إحالة", value: "إحالة" },
  { label: "علاقة شخصية", value: "علاقة شخصية" },
  { label: "زيارة مباشرة", value: "زيارة مباشرة" },
  { label: "معرض", value: "معرض" },
  { label: "اخرى", value: "اخرى" },
];

export const countryOptions = [
  { label: "أفغانستان (+93)", value: "+93" },
  { label: "ألبانيا (+355)", value: "+355" },
  { label: "الجزائر (+213)", value: "+213" },
  { label: "أندورا (+376)", value: "+376" },
  { label: "أنغولا (+244)", value: "+244" },
  { label: "الأرجنتين (+54)", value: "+54" },
  { label: "أرمينيا (+374)", value: "+374" },
  { label: "أستراليا (+61)", value: "+61" },
  { label: "النمسا (+43)", value: "+43" },
  { label: "أذربيجان (+994)", value: "+994" },

  { label: "البحرين (+973)", value: "+973" },
  { label: "بنغلاديش (+880)", value: "+880" },
  { label: "بلجيكا (+32)", value: "+32" },
  { label: "بوليفيا (+591)", value: "+591" },
  { label: "البرازيل (+55)", value: "+55" },
  { label: "بلغاريا (+359)", value: "+359" },

  { label: "كندا (+1)", value: "+1" },
  { label: "تشيلي (+56)", value: "+56" },
  { label: "الصين (+86)", value: "+86" },
  { label: "كولومبيا (+57)", value: "+57" },
  { label: "كوبا (+53)", value: "+53" },

  { label: "الدنمارك (+45)", value: "+45" },
  { label: "جمهورية الدومينيكان (+1)", value: "+1" },

  { label: "مصر (+20)", value: "+20" },
  { label: "الإكوادور (+593)", value: "+593" },
  { label: "إستونيا (+372)", value: "+372" },
  { label: "إثيوبيا (+251)", value: "+251" },

  { label: "فنلندا (+358)", value: "+358" },
  { label: "فرنسا (+33)", value: "+33" },

  { label: "ألمانيا (+49)", value: "+49" },
  { label: "غانا (+233)", value: "+233" },
  { label: "اليونان (+30)", value: "+30" },

  { label: "المجر (+36)", value: "+36" },

  { label: "الهند (+91)", value: "+91" },
  { label: "إندونيسيا (+62)", value: "+62" },
  { label: "إيران (+98)", value: "+98" },
  { label: "العراق (+964)", value: "+964" },
  { label: "أيرلندا (+353)", value: "+353" },
  { label: "إيطاليا (+39)", value: "+39" },

  { label: "اليابان (+81)", value: "+81" },
  { label: "الأردن (+962)", value: "+962" },

  { label: "كازاخستان (+7)", value: "+7" },
  { label: "كينيا (+254)", value: "+254" },
  { label: "الكويت (+965)", value: "+965" },

  { label: "لبنان (+961)", value: "+961" },
  { label: "ليبيا (+218)", value: "+218" },
  { label: "ليتوانيا (+370)", value: "+370" },

  { label: "ماليزيا (+60)", value: "+60" },
  { label: "المكسيك (+52)", value: "+52" },
  { label: "المغرب (+212)", value: "+212" },

  { label: "هولندا (+31)", value: "+31" },
  { label: "نيوزيلندا (+64)", value: "+64" },
  { label: "نيجيريا (+234)", value: "+234" },
  { label: "النرويج (+47)", value: "+47" },

  { label: "عُمان (+968)", value: "+968" },

  { label: "باكستان (+92)", value: "+92" },
  { label: "فلسطين (+970)", value: "+970" },
  { label: "بيرو (+51)", value: "+51" },
  { label: "الفلبين (+63)", value: "+63" },
  { label: "بولندا (+48)", value: "+48" },
  { label: "البرتغال (+351)", value: "+351" },

  { label: "قطر (+974)", value: "+974" },

  { label: "رومانيا (+40)", value: "+40" },
  { label: "روسيا (+7)", value: "+7" },

  { label: "السعودية (+966)", value: "+966" },
  { label: "صربيا (+381)", value: "+381" },
  { label: "سنغافورة (+65)", value: "+65" },
  { label: "سلوفاكيا (+421)", value: "+421" },
  { label: "سلوفينيا (+386)", value: "+386" },
  { label: "جنوب أفريقيا (+27)", value: "+27" },
  { label: "إسبانيا (+34)", value: "+34" },
  { label: "السودان (+249)", value: "+249" },
  { label: "السويد (+46)", value: "+46" },
  { label: "سويسرا (+41)", value: "+41" },
  { label: "سوريا (+963)", value: "+963" },

  { label: "تايلاند (+66)", value: "+66" },
  { label: "تونس (+216)", value: "+216" },
  { label: "تركيا (+90)", value: "+90" },

  { label: "أوكرانيا (+380)", value: "+380" },
  { label: "الإمارات (+971)", value: "+971" },
  { label: "المملكة المتحدة (+44)", value: "+44" },
  { label: "الولايات المتحدة (+1)", value: "+1" },

  { label: "فنزويلا (+58)", value: "+58" },
  { label: "فيتنام (+84)", value: "+84" },

  { label: "اليمن (+967)", value: "+967" },
];


const AGE_GROUPS = [
  { label: "18-25", value: "18-25" },
  { label: "26-40", value: "26-40" },
  { label: "40+", value: "40+" },
];
const contry = [
  { label: "تركيا", value: "أميركا" },
  { label: "سوريا", value: "سوريا" },
  { label: "سوريا", value: "سوريا" },
  { label: "العراق", value: "العراق" },
  { label: "ليبيا", value: "ليبيا" },
  { label: "أوروبا", value: "أوروبا" },
  { label: "أميركا", value: "أميركا" },
  { label: "أخرى", value: "أخرى" },
];

const gender = [
  { label: "ذكر", value: "ذكر" },
  { label: "انثى", value: "انثى" },
]

const socialStatus = [
  { label: "عزباء", value: "عزباء" },
  { label: "مطلق/ة", value: "مطلق/ة" },
  { label: "متزوج/ة", value: "متزوج/ة" },
]

export const skinTypeOptions = [
  { label: "دهنية", value: "دهنية" },
  { label: "جافة", value: "جافة" },
  { label: "مختلطة", value: "مختلطة" },
  { label: "حساسة", value: "حساسة" },
  { label: "عادية", value: "عادية" },
];

export const skinColorOptions = [
  { label: "فاتحة", value: "فاتحة" },
  { label: "متوسطة", value: "متوسطة" },
  { label: "سمراء", value: "سمراء" },
  { label: "داكنة", value: "داكنة" },
];

export const hairColorOptions = [
  { label: "أشقر", value: "أشقر" },
  { label: "أبيض", value: "أبيض" },
  { label: "أسود", value: "أسود" },
];

const bodyType = [
  { label: "نحيف", value: "نحيف" },
  { label: "ممتلئ", value: "ممتلئ" },
  { label: "يعاني من ترهلات", value: "يعاني من ترهلات" },
]

const laiserProps = [
  { label: "إزالة شعر", value: "إزالة شعر" },
  { label: "رتوش", value: "رتوش" },
]

const ageGroup = [
  { label: "18-25", value: "18-25" },
  { label: "26-35", value: "26-35" },
  { label: "-36-45", value: "36-45" },
  { label: "+45", value: "+45" },
]

const SKIN_PROBLEMS = [
  { id: "حب الشباب", label: "حب شباب" },
  { id: "تصبغات", label: "تصبغات" },
  { id: "كلف / نمش", label: "كلف / نمش" },
  { id: "مسامات واسعة", label: "مسامات واسعة" },
  { id: "ترهلات", label: "ترهلات" },
  { id: "علامات تمدد", label: "علامات تمدد" },
  { id: "تساقط شعر", label: "تساقط شعر" },
  { id: "خطوط دقيقة", label: "خطوط دقيقة" },
  { id: "اخرى", label: "اخرى" },
];

/* ===================== Schema (التحقق المرن) ===================== */
// نصيحة خبير: استخدم .or(z.literal("")) لضمان أن الحقول الفارغة لا تكسر شرط الـ min
export const customerSchema = z.object({
  name: z.string().min(3, "الاسم يجب أن يكون 3 حروف على الأقل"),
  phone: z.string().optional().or(z.literal("")),
  countryCode: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  source: z.string().optional().or(z.literal("")),
  ageGroup: z.string().optional().or(z.literal("")),
  socialStatus: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  genderfit: z.string().optional().or(z.literal("")),
  skinType: z.string().optional().or(z.literal("")),
  skinProblems: z.array(z.string()).default([]),
  skinColor: z.string().optional().or(z.literal("")),
  hairColor: z.string().optional().or(z.literal("")),
  laserPurpose: z.string().optional().or(z.literal("")),
  genderlaser: z.string().optional().or(z.literal("")),
  bodyType: z.string().optional().or(z.literal("")),
  weight: z.preprocess((v) => (v === "" || v === null ? undefined : Number(v)), z.number().optional()),
  height: z.preprocess((v) => (v === "" || v === null ? undefined : Number(v)), z.number().optional()),
  mainProblem: z.string().optional().or(z.literal("")),
  isDiabetic: z.boolean().default(false),
  isPregnant: z.boolean().default(false),
  hasHypertension: z.boolean().default(false),
  isBreastfeeding: z.boolean().default(false),
  hormonalTherapy: z.boolean().default(false),
  followsDiet: z.boolean().default(false),
  regularExercise: z.boolean().default(false),
  interestedInAds: z.boolean().default(false),
  isTargetClient: z.boolean().default(false),
  inquiresForElse: z.boolean().default(false),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

/* ===================== Component ===================== */
const CustomrLayout: React.FC = () => {
  const [activeTabs, setActiveTabs] = React.useState<Array<"skin" | "laser" | "slimming">>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [customers, setCustomers] = React.useState<any[]>([])
  const [formdata, setFormdata] = React.useState<any>(null)
  const [editId, setEditId] = React.useState<string | null>(null);

  const toggleTab = (tab: "skin" | "laser" | "slimming") => {
    setActiveTabs((prev) =>
      prev.includes(tab) ? prev.filter((t) => t !== tab) : [...prev, tab]
    );
  };

  const getData = async () => {
    const res = await getCustomer();
    if (res.success) {
      const allCustomers = res.data;

      // منطق الفلترة بناءً على الرتبة
      if (user?.accountType === "ADMIN") {
        setCustomers(allCustomers);
      } else {
        // إذا كان موظف: نظهر فقط العملاء الذين يحتوي حقل users لديهم على id الموظف الحالي
        const filtered = allCustomers.filter((customer: any) => 
          customer.users?.some((u: any) => u.id === user?.id)
        );
        setCustomers(filtered);
      }
    }
  };
const { user } = useAuth()
  React.useEffect(() => { getData() }, [user])
  const [isPending, setIsPending] = React.useState(false);
  

  const onSubmit = async (data: CustomerFormValues) => {
    setIsPending(true);
    try {
      console.log("🚀 جاري إرسال البيانات...", data);

      const res = await createCustomerAction(data, activeTabs, (user?.id as any));

      if (res.success) {
        alert("✅ تم إضافة العميل بنجاح!");
        setIsOpen(false);
        // يمكنك هنا عمل reset للنموذج إذا أردت
      } else {
        alert("❌ خطأ: " + res.error);
      }
    } catch (err) {
      alert("❌ حدث خطأ غير متوقع");
    } finally {
      setIsPending(false);
    }
  };

  const tableActions: any[] = [
    {
      label: "تعديل",
      icon: <Mail size={14} />,
      onClick: (data: any) => {
        setFormdata({
          ...data,
          skinProblems:data.skinProblems
        })
        console.log("data", data);
        setIsOpen(true);
      }
    },
    {
      label: "حذف",
      icon: <Plus className="rotate-45" size={14} />,
      variant: "danger",
      onClick: async (data: any) => {
        const confirm = window.confirm("هل أنت متأكد من حذف هذا المستخدم؟");
        if (confirm) {
          const loadingToast = toast.loading('جاري الحذف...');
          try {
            // استدعاء دالة الحذف من السيرفر هنا
            const res = await deleteCustomer(data);
            if (res.success) {
              toast.success('تم حذف العميل بنجاح');
              getData(); // تحديث قائمة المستخدمين بعد الحذف
            } else {
              toast.error('فشل في حذف العميل');
            }
          } catch (error) {
            toast.error('فشل في حذف العميل');
          } finally {
            toast.dismiss(loadingToast);
          }
        }
      }
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8 bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">نظام إدارة العملاء</h1>
        <Button onClick={() => setIsOpen(true)}>إضافة عميل جديد +</Button>
      </div>
      <DataTable data={customers} actions={tableActions} columns={
        [
          { header: "الاسم", accessor: "name" },
          { header: "الرقم", accessor: (e: any) => `${e.phone} ${e.countryCode} ` },
          { header: "الدولة", accessor: "country" },
          { header: "المدينة", accessor: "city" },
          {
            header: "المستخدم المسؤول عنه",
            // تأكد من وجود users أولاً ثم حول الـ IDs إلى نص مفصول بفاصلة
            accessor: (e: any) => e.users?.map((c: any) => c.username).join(", ") || "غير محدد"
          },
        ]
      } />

      <AppModal size="lg" isOpen={isOpen} onClose={() => setIsOpen(false)} title="إضافة ملف عميل شامل">
        <DynamicForm schema={customerSchema} onSubmit={onSubmit} defaultValues={formdata}>
          {({ register, formState: { errors } }) => (
            <div className="space-y-6">

              {/* القسم الأول: المعلومات الأساسية */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput label="اسم العميل *" {...register("name")} error={errors.name?.message?.toString()} />
                <FormSelect label="اختر رمز الدولة" options={countryOptions} {...register("countryCode")} error={errors.countryCode?.message?.toString()} />
                <FormInput label="رقم الهاتف" {...register("phone")} error={errors.phone?.message?.toString()} />
                <FormSelect label="الدولة" options={contry} {...register("country")} error={errors.country?.message?.toString()} />
                <FormInput label="المدينة" {...register("city")} error={errors.city?.message?.toString()} />
                <FormSelect label="مصدر العميل" options={SOURCE_OPTIONS} placeholder="اختر المصدر" {...register("source")} error={errors.source?.message?.toString()} />
              </div>

              <hr className="border-slate-200 dark:border-slate-800" />

              {/* القسم الثاني: التبديل الديناميكي */}
              <div className="flex flex-col gap-3">
                <label className="text-sm text-right font-bold text-slate-700 dark:text-slate-300">الأقسام المطلوبة</label>
                <div className="flex flex-wrap gap-2 justify-end pr-3">
                  {(["skin", "laser", "slimming"] as const).map((tab) => (
                    <Button
                      key={tab}
                      type="button"
                      variant={activeTabs.includes(tab) ? "danger" : "outline"}
                      onClick={() => toggleTab(tab)}
                      className="min-w-[100px]"
                    >
                      {tab === "skin" ? "أجهزة البشرة" : tab === "laser" ? "أجهزة الليزر" : "برامج التنحيف"}
                    </Button>
                  ))}
                </div>
              </div>

              {/* قسم البشرة */}
              {activeTabs.includes("skin") && (
                <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
                  <h3 className="font-bold mb-4 text-blue-700 dark:text-blue-400 text-right text-sm">تفاصيل العناية بالبشرة</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <FormSelect label="نوع البشرة" options={skinTypeOptions} {...register("skinType")} />
                    <FormSelect label="جنس العميل" options={gender}  {...register("gender")} error={errors.gender?.message?.toString()} />
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-slate-950 dark:text-slate-100 text-right font-semibold pt-2">المشاكل الحالية</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {SKIN_PROBLEMS.map((prob) => (
                          <FormCheckbox key={prob.id} label={prob.label} value={prob.id} {...register("skinProblems")} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {activeTabs.includes("laser") && (
                <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
                  <h3 className="font-bold mb-4 text-blue-700 dark:text-blue-400 text-sm">تفاصيل منتجات الليزر</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormSelect label="لون البشؤة" options={skinColorOptions} {...register("skinColor")} />
                    <FormSelect label="لون الشعر" options={hairColorOptions} {...register("hairColor")} />
                    <FormSelect label="جنس العميل" options={gender}  {...register("genderlaser")} error={errors.genderlaser?.message?.toString()} />
                    <FormSelect label="الغرض" options={laiserProps}  {...register("laserPurpose")} error={errors.laserPurpose?.message?.toString()} />
                  </div>
                </div>
              )}
              {activeTabs.includes("slimming") && (
                <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
                  <h3 className="font-bold mb-4 text-blue-700 dark:text-blue-400 text-sm">تفاصيل ومعلومات التنحيف</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormSelect label="نوع الجسم" options={bodyType} {...register("bodyType")} />
                    <FormInput label="الوزن" {...register("weight")} error={errors.weight?.message?.toString()} />
                    <FormInput label="الطول" {...register("height")} error={errors.height?.message?.toString()} />
                    <FormSelect label="جنس العميل" options={gender}  {...register("genderfit")} error={errors.genderlaser?.message?.toString()} />
                    <FormInput label="المشكلة التي يرغب في حلها" {...register("mainProblem")} error={errors.mainProblem?.message?.toString()} />
                  </div>
                </div>
              )}

              {/* القسم الصحي */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                <h3 className="font-bold mb-4 text-sm text-slate-600 dark:text-slate-400">التاريخ الصحي</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormCheckbox label="سكري" {...register("isDiabetic")} />
                  <FormCheckbox label="ضغط" {...register("hasHypertension")} />
                  <FormCheckbox label="حامل" {...register("isPregnant")} />
                  <FormCheckbox label="مرضع" {...register("isBreastfeeding")} />
                  <FormCheckbox label="تخضع لعلاج هرموني" {...register("hormonalTherapy")} />
                  <FormCheckbox label="تتبع حمية غذائية" {...register("followsDiet")} />
                  <FormCheckbox label="تمارس الرياضة بانتظام" {...register("regularExercise")} />
                  <FormCheckbox label="مهتم بالعروض أو الاشتراكات" {...register("interestedInAds")} />
                  <FormCheckbox label="العميل هو المهتم" {...register("isTargetClient")} />
                  <FormCheckbox label="يستفسر لشخص آخر" {...register("inquiresForElse")} />
                </div>
              </div>
              <FormSelect label="الفئة العمرية" options={ageGroup} {...register("ageGroup")} />
              <FormSelect label="الحالة الاجتماعية" options={socialStatus} {...register("socialStatus")} />

            </div>
          )}
        </DynamicForm>
      </AppModal>
    </div>
  );
};

export default CustomrLayout;