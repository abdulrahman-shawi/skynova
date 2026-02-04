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
  { label: "مختلطة", value: "مختلطة" },
];

const STATUS_PHONE_OPTIONS = [
  { label: "أجاب", value: "أجاب" },
  { label: "لم يجب", value: "لم يجب" },
  { label: "مختلطة", value: "مختلطة" },
];

const STATUS_OPTIONS = [
  { label: "عميل محتمل", value: "عميل محتمل" },
  { label: "تم التواصل معه", value: "تم التواصل معه" },
  { label: "تم الإتفاق", value: "تم الإتفاق" },
  { label: "مهتم", value: "مهتم" },
  { label: "تم الإلغاء", value: "معرض" },
  { label: "مختلطة", value: "مختلطة" },
];

const countryOptions = [
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

const contry = [
  { label: "تركيا", value: "أميركا" },
  { label: "سوريا", value: "سوريا" },
  { label: "سوريا", value: "سوريا" },
  { label: "العراق", value: "العراق" },
  { label: "ليبيا", value: "ليبيا" },
  { label: "أوروبا", value: "أوروبا" },
  { label: "أميركا", value: "أميركا" },
  { label: "مختلطة", value: "مختلطة" },
];

const socialStatus = [
  { label: "عزباء", value: "عزباء" },
  { label: "مطلق/ة", value: "مطلق/ة" },
  { label: "متزوج/ة", value: "متزوج/ة" },
]

const ageGroup = [
  { label: "18-25", value: "18-25" },
  { label: "26-35", value: "26-35" },
  { label: "36-45", value: "36-45" },
  { label: "+45", value: "+45" },
]

/* ===================== Schema (التحقق المرن) ===================== */
// نصيحة خبير: استخدم .or(z.literal("")) لضمان أن الحقول الفارغة لا تكسر شرط الـ min
 const customerSchema = z.object({
  name: z.string().min(3, "الاسم يجب أن يكون 3 حروف على الأقل"),
  phone: z.string().optional().or(z.literal("")),
  countryCode: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  source: z.string().optional().or(z.literal("")),
  ageGroup: z.string().optional().or(z.literal("")),
  socialStatus: z.string().optional().or(z.literal("")),
  status: z.string().optional().or(z.literal("")),
  phonestatus: z.string().optional().or(z.literal("")),
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
                <FormSelect label="حال العميل" options={STATUS_OPTIONS} placeholder="اختر الحالة" {...register("status")} error={errors.status?.message?.toString()} />
                <FormSelect label="جواب العميل" options={STATUS_PHONE_OPTIONS} placeholder="اختر الجواب" {...register("phonestatus")} error={errors.phonestatus?.message?.toString()} />
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