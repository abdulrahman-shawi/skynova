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
import { AssignUsers, createCustomerAction, createmessage, deleteCustomer, getCustomer, UpdateStusa } from "@/server/customer";
import { useAuth } from "@/context/AuthContext";
import { DataTable } from "@/components/shared/DataTable";
import toast from "react-hot-toast";
import { CheckCircle, ListOrdered, Mail, MapPin, Phone, PhoneCallIcon, PieChart, Plus, Save, Search, Send, Trash2, UserPlus, Users, X } from "lucide-react";
import useState from 'react';
import { AnimatePresence, motion } from "framer-motion";
import { getProduct } from "@/server/product";
import { createOrder } from "@/server/order";

/* ===================== Constants ===================== */

const STATUS_OPTIONS = [
  { label: "عميل محتمل", value: "عميل محتمل" },
  { label: "تم التواصل معه", value: "تم التواصل معه" },
  { label: "تم الإتفاق", value: "تم الإتفاق" },
  { label: "مهتم", value: "مهتم" },
  { label: "تم الإلغاء", value: "تم الألغاء" },
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
  { label: "تركيا", value: "تركيا" },
  { label: "سوريا", value: "سوريا" },
  { label: "العراق", value: "العراق" },
  { label: "ليبيا", value: "ليبيا" },
  { label: "أوروبا", value: "أوروبا" },
  { label: "أميركا", value: "أميركا" },
  { label: "مختلطة", value: "مختلطة" },
];

/* ===================== Schema (التحقق المرن) ===================== */
// نصيحة خبير: استخدم .or(z.literal("")) لضمان أن الحقول الفارغة لا تكسر شرط الـ min
const customerSchema = z.object({
  name: z.string().min(3, "الاسم يجب أن يكون 3 حروف على الأقل"),
  phone: z.string().optional().or(z.literal("")),
  countryCode: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

/* ===================== Component ===================== */
const CustomrLayout: React.FC = () => {
  const [activeTabs, setActiveTabs] = React.useState<Array<"skin" | "laser" | "slimming">>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isOpencustomer, setIsOpencustomer] = React.useState(false);
  const [isOpencustomerchat, setIsOpencustomerchat] = React.useState(false);
  const [isOpenOrder, setisOpenOrder] = React.useState(false);
  const [customers, setCustomers] = React.useState<any[]>([])
  const [formdata, setFormdata] = React.useState<any>(null)
  const [editId, setEditId] = React.useState<string | null>(null);
  const [customer, setCustomer] = React.useState<any>({})
  const [items, setItems] = React.useState([
    { productId: "", name: "", price: 0, quantity: 1, discount: 0, note: "", total: 0, modelNumber: "" }
  ]);
  const [searchQueries, setSearchQueries] = React.useState<Record<number, string>>({});
  const [showDropdown, setShowDropdown] = React.useState<Record<number, boolean>>({});
  const [overallDiscount, setOverallDiscount] = React.useState(0);

  // بيانات العميل والمبالغ
  const [customerId, setCustomerId] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("عند الاستلام");

  // بيانات المستلم والعنوان
  const [receiverName, setReceiverName] = React.useState("");
  const [receiverPhone, setReceiverPhone] = React.useState("");
  const [country, setCountry] = React.useState("ليبيا"); // افتراضي حسب الصورة
  const [city, setCity] = React.useState("");
  const [municipality, setMunicipality] = React.useState("");
  const [fullAddress, setFullAddress] = React.useState("");
  const [status, setStatus] = React.useState("طلب جديد");
  // تفاصيل الشحن
  const [deliveryMethod, setDeliveryMethod] = React.useState("توصيل الى المنزل");
  const [shippingCompany, setShippingCompany] = React.useState("");
  const [trackingCode, setTrackingCode] = React.useState("");
  const [googleMapsLink, setGoogleMapsLink] = React.useState("");

  const [customerSearchQuery, setCustomerSearchQuery] = React.useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = React.useState(false);
  const [deliveryNotes, setDeliveryNotes] = React.useState("");
  const [additionalNotes, setAdditionalNotes] = React.useState("");
  const subTotal = items.reduce((sum, i) => sum + i.total, 0);
  const grandTotal = subTotal - overallDiscount;
  const [search, setSearch] = React.useState("")
  const [OpenAssignModal, setOpenAssignModal] = React.useState(false)

  const [dateFilter, setDateFilter] = React.useState('all');
  const [alluser, setUsers] = React.useState<any[]>([])
  const filterCustomer = customers.filter((e: any) => {
    // 1. منطق البحث النصي الحالي
    const matchesSearch =
      e.name?.toLowerCase().includes(search.toLowerCase()) ||
      e.phone?.toLowerCase().includes(search.toLowerCase()) ||
      e.city?.toLowerCase().includes(search.toLowerCase()) || // أضفت المدينة كما طلبت
      e.country?.toLowerCase().includes(search.toLowerCase());

    // 2. منطق تاريخ العميل
    const createdAt = new Date(e.createdAt);
    const now = new Date();

    let matchesDate = true;

    if (dateFilter === 'day') {
      matchesDate = createdAt.toDateString() === now.toDateString();
    } else if (dateFilter === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      matchesDate = createdAt >= oneWeekAgo;
    } else if (dateFilter === 'month') {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      matchesDate = createdAt >= oneMonthAgo;
    }

    return matchesSearch && matchesDate;
  });
  const updateItem = (index: number, field: string, value: any, products: any[]) => {
    const newItems = [...items];
    const item = newItems[index];

    if (field === "productId") {
      const product = products.find(p => p.id === Number(value));
      item.productId = value;
      item.name = product?.name || "";
      item.modelNumber = product?.modelNumber || "";
      item.price = product?.price || 0;
      setSearchQueries({ ...searchQueries, [index]: item.name });
      setShowDropdown({ ...showDropdown, [index]: false });
    } else {
      (item as any)[field] = value;
    }

    item.total = item.price * item.quantity - item.discount;
    setItems(newItems);
  };


  const addNewItem = () => {
    setItems([...items, { productId: "", name: "", price: 0, quantity: 1, discount: 0, note: "", total: 0, modelNumber: "" }]);
  };
  const toggleTab = (tab: "skin" | "laser" | "slimming") => {
    setActiveTabs((prev) =>
      prev.includes(tab) ? prev.filter((t) => t !== tab) : [...prev, tab]
    );
  };

  const getData = async () => {
    const res = await getCustomer();
    if (res.success) {
      const allCustomers = res.data;

      // 1. تحديث القائمة العامة (كما كنت تفعل)
      if (user?.accountType === "ADMIN") {
        setCustomers(allCustomers);
      } else {
        const filtered = allCustomers.filter((c) => c.users?.some((u) => u.id === user?.id));
        setCustomers(filtered);
      }

      // 2. السطر السحري: تحديث العميل المختار حالياً ببياناته الجديدة
      // نبحث عن العميل الحالي داخل البيانات الجديدة التي وصلت من السيرفر
      if (customer?.id) {
        const updatedCustomer = allCustomers.find(c => c.id === customer.id);
        if (updatedCustomer) {
          setCustomer(updatedCustomer); // هذا سيجعل الرسائل تظهر فوراً
        }
      }
    }
  };

  const getAlluser = async () => {
    try {
      const res = await fetch("/api/users")
      const data = await res.json()
      setUsers(data.data);
      console.log("Users:", res);
    } catch (error) {

    }
  }
  const [products, setProduct] = React.useState<any[]>([])
  const { user } = useAuth()
  React.useEffect(() => {
    getData();
    getAlluser();
    getProduct().then((products) => {
      setProduct(products);
    }).catch(console.error);
  }, [user])
  const [isPending, setIsPending] = React.useState(false);

  const resetForm = () => {
    // إغلاق المودال أولاً
    setisOpenOrder(false);

    // إعادة بيانات الطلب والمنتجات
    setStatus("طلب جديد");
    setEditId(null);
    setItems([{ productId: "", name: "", price: 0, quantity: 1, discount: 0, note: "", total: 0, modelNumber: "" }]);
    setSearchQueries({});
    setShowDropdown({});
    setOverallDiscount(0);

    // إعادة بيانات العميل
    setCustomerId("");
    setCustomerSearchQuery("");
    setShowCustomerDropdown(false);
    setPaymentMethod("عند الاستلام");

    // إعادة بيانات المستلم والعنوان
    setReceiverName("");
    setReceiverPhone("");
    setCountry("ليبيا");
    setCity("");
    setMunicipality("");
    setFullAddress("");

    // إعادة تفاصيل الشحن والملاحظات
    setDeliveryMethod("توصيل الى المنزل");
    setShippingCompany("");
    setTrackingCode("");
    setGoogleMapsLink("");
    setDeliveryNotes("");
    setAdditionalNotes("");
  };

  const handleStatus = async(customerId:any , status:any) =>{
    console.log(customerId , status)
    const loading = toast.loading("جار التحديث")
    try {
      const res = await UpdateStusa(customerId , status)
      if (res.success){
        toast.success("تم التحديث")
        getData()
      }else{toast.error("حدثث خطأ")}
    } catch (error) {
      
    }finally{
      toast.dismiss(loading)
    }
  }

  const onSubmit = async (data: CustomerFormValues) => {
    setIsPending(true);
    try {
      console.log("🚀 جاري إرسال البيانات...", data);

      const res = await createCustomerAction(data, activeTabs, (user?.id as any));

      if (res.success) {
        toast.success("✅ تم إضافة العميل بنجاح!");
        setIsOpen(false);
        getData()
        // يمكنك هنا عمل reset للنموذج إذا أردت
      } else {
        toast.error("❌ خطأ: " + res.error);
      }
    } catch (err) {
      toast.error("❌ حدث خطأ غير متوقع");
    } finally {
      setIsPending(false);
    }
  };

  const getSingleCustomer = async (data: any) => {
    setCustomer(data)
    console.log(data)
    setIsOpencustomer(true)
  }

  const handleAssignUsers = async (customerId: string, userIds: string[]) => {
    const loading = toast.loading("جار ربط الموظفين بالعميل")
    try {
      const res = await AssignUsers(customerId, userIds)

      if (res.success) {
        // تحديث البيانات محلياً أو إعادة جلبها
        toast.success("تم ربط الموظفين بنجاح");
        getData();
        setOpenAssignModal(false);
      } else {
        toast.error("خطأ")
      }
    } catch (error) {
      toast.error("خطأ في الربط");
    } finally {
      toast.dismiss(loading)
    }

    console.log(customerId, userIds)
  };

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const handleSubmit = async () => {
    // التحقق الأولي
    if (!customerId) {
      toast.error("يرجى اختيار العميل");
      return;
    }

    if (items.length === 0 || !items[0].productId) {
      toast.error("يرجى إضافة منتج واحد على الأقل");
      return;
    }

    // تفعيل حالة التحميل لمنع النقرات المتكررة (تعالج خطأ P2028)
    setIsSubmitting(true);

    // تصحيح رسالة الـ Toast
    const loadingMessage = "جاري حفظ الطلب الجديد...";
    const loadingToast = toast.loading(loadingMessage);

    const orderData = {
      customerId,
      status,
      receiverName,
      receiverPhone,
      country,
      city,
      municipality,
      fullAddress,
      googleMapsLink,
      shippingCompany,
      trackingCode,
      deliveryMethod,
      deliveryNotes,
      paymentMethod,
      additionalNotes,
      grandTotal: Number(grandTotal),
      overallDiscount: Number(overallDiscount),
      subTotal: Number(subTotal)
    };

    try {
      let res;
      // // حالة إنشاء طلب جديد
      res = await createOrder(orderData, items, user?.id);
      console.log(orderData, customerId, items, user?.id)
      if (res.success) {
        toast.success(editId ? "تم تحديث الطلب بنجاح" : "تم حفظ الطلب بنجاح");

        // تحديث قائمة الطلبات في الواجهة
        getData()

        // إغلاق المودال
        setisOpenOrder(false);

        // تنظيف الحقول (اختياري حسب حاجتك)
        // resetForm(); 
      } else {
        // عرض الخطأ القادم من السيرفر (مثل كمية غير كافية أو فشل Transaction)
        toast.error(res.success || "فشل في معالجة الطلب");
      }
    } catch (error) {
      console.error("Submit Error:", error);
      toast.error("حدث خطأ غير متوقع في النظام");
    } finally {
      // إنهاء حالة التحميل وإخفاء الـ Toast
      setIsSubmitting(false);
      toast.dismiss(loadingToast);
    }
  };




  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8 bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">نظام إدارة العملاء</h1>
        <Button onClick={() => setIsOpen(true)}>إضافة عميل جديد +</Button>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row gap-3 items-center">
          {/* حقل البحث الحالي */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالرقم أو الاسم أو المدينة"
            className="flex-1 h-11 rounded-lg border border-slate-800/50 dark:border-slate-100/50 text-slate-800 dark:text-slate-100 bg-transparent p-5 my-3"
          />

          {/* خيارات التاريخ */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1 h-11 items-center">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'day', label: 'اليوم' },
              { id: 'week', label: 'أسبوع' },
              { id: 'month', label: 'شهر' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDateFilter(tab.id)} // تأكد من تعريف هذا الـ State
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${dateFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className=" min-h-screen dir-rtl" dir="rtl">
        <div className=" mx-auto">

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filterCustomer
              .filter((customer) => {
                // إذا كان أدمن يرى الجميع، وإذا لم يكن يرى فقط المرتبطين به
                if (user.accountType === "ADMIN") return true;
                return customer.users.some((u: any) => u.id === user?.id);
              })
              .map((customer) => (
                <div
                  onClick={() => getSingleCustomer(customer)}
                  key={customer.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-6">
                    {/* معلومات الاسم والأداء */}
                    <div className="space-y-1">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        {customer.name}
                      </h3><select
                        value={customer.status}
                        onClick={(e) => {
                          e.stopPropagation()
                        }}
                        onChange={(e) => {
                          e.stopPropagation()
                          setStatus(e.target.value)
                          handleStatus(customer.id , e.target.value)
                        }} // دالة التحديث الخاصة بك
                        className={`
    appearance-none outline-none cursor-pointer
    px-4 py-1.5 rounded-full text-xs font-black text-center transition-all
    ${customer.status === "عميل محتمل" ? 'bg-rose-100 text-rose-600 border border-rose-200' :
                            customer.status === "تم الإتفاق" ? 'bg-green-100 text-green-600 border border-green-200' :
                              customer.status === "تم الإلغاء" || customer.status === "معرض" ? 'bg-slate-100 text-slate-500 border border-slate-200' :
                                'bg-amber-100 text-amber-600 border border-amber-200' // للحالات الأخرى (مهتم، تم التواصل)
                          }
  `}
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option
                            key={option.value}
                            value={option.value}
                            className="bg-white text-slate-900" // لضمان ظهور النص بوضوح داخل القائمة
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* الصورة الرمزية (Avatar) */}
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-amber-400 flex items-center justify-center text-xl font-black text-slate-800 border-2 border-white shadow-sm overflow-hidden">
                        {customer.name[0].toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {/* الإحصائيات السفلية */}
                  <div className="flex justify-between items-center text-sm font-bold text-slate-500 dark:text-slate-400 pt-4 border-t border-slate-50 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCustomerId(customer.id);
                          setisOpenOrder(true);
                        }}
                        className="hover:text-amber-500 transition-colors"
                      >
                        <ListOrdered size={20} />
                      </button>
                      {user.accountType === "ADMIN" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCustomer(customer); // تخزين العميل المختار
                            setOpenAssignModal(true);
                          }}
                          className="hover:text-blue-500 transition-colors"
                        >
                          <UserPlus size={20} />
                        </button>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const phoneNumber = customer.phone?.replace(/\D/g, '') || '';
                        const countryCode = customer.countryCode?.replace(/\D/g, '') || '';
                        window.open(`https://wa.me/${countryCode}${phoneNumber}`, '_blank');
                      }}
                      className="hover:text-green-500 transition-colors"
                    >
                      <PhoneCallIcon size={20} />
                    </button>
                  </div>
                </div>
              ))}
          </div>

        </div>
      </div>

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
              </div>

            </div>
          )}
        </DynamicForm>
      </AppModal>
      <AppModal size="lg" isOpen={isOpencustomer} onClose={() => setIsOpencustomer(false)} title="بيانات العميل">
        <GetCustomerSingle data={customer} getdatas={getData} />
      </AppModal>

      <AppModal footer={
        <div className="pt-6 w-full flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex gap-6 items-center">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-red-500 uppercase px-1">خصم إضافي (كلي)</label>
              <div className="relative">
                <input type="number" value={overallDiscount} onChange={(e) => setOverallDiscount(Number(e.target.value))} className="w-32 bg-red-50 dark:bg-red-900/10 p-3 rounded-2xl border border-red-100 dark:border-red-900/20 outline-none font-bold text-red-600 text-center" placeholder="0" />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400"> $</span>
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 px-8 py-4 rounded-3xl">
              <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">الإجمالي النهائي</p>
              <h3 className="text-3xl font-black font-sans text-blue-600 italic"> ${grandTotal.toLocaleString()}</h3>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleSubmit}
              className={`px-12 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2`}
            >
              <Save size={20} /> حفظ الفاتورة
            </button>
            <button
              onClick={resetForm}
              className="px-8 py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      } size='full' isOpen={isOpenOrder} onClose={resetForm} title='اضافة طلب'>
        <div>
          <div className="space-y-4 mb-4">
            {items.map((item: any, index: number) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 items-center">
                <div className="md:col-span-3 relative"> {/* تم إضافة relative هنا لضبط القائمة المنسدلة */}
                  <label className="text-[10px] font-bold text-slate-400 mb-1">المنتج</label>
                  <input
                    type="text"
                    value={searchQueries[index] || item.name || item.modelNumber}
                    placeholder="اكتب اسم المنتج..."
                    onFocus={() => setShowDropdown({ ...showDropdown, [index]: true })}
                    onChange={(e) => {
                      setSearchQueries({ ...searchQueries, [index]: e.target.value });
                      setShowDropdown({ ...showDropdown, [index]: true });
                    }}
                    className="w-full text-slate-900 dark:text-slate-50 bg-white dark:bg-slate-900 p-3 rounded-xl border-none outline-none font-bold text-sm shadow-sm"
                  />
                  <AnimatePresence>
                    {showDropdown[index] && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute z-[210] w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                        {products?.filter((p: any) =>
                          // البحث في الاسم
                          p.name.toLowerCase().includes((searchQueries[index] || "").toLowerCase()) ||
                          // البحث في رقم الموديل
                          (p.modelNumber && p.modelNumber.toLowerCase().includes((searchQueries[index] || "").toLowerCase()))
                        ).map((product: any) => (
                          <div
                            key={product.id}
                            onClick={() => updateItem(index, "productId", product.id.toString(), products)}
                            className="px-4 py-3 hover:bg-blue-50 text-slate-900 dark:text-slate-50 dark:hover:bg-blue-900/20 cursor-pointer text-sm font-bold border-b border-slate-50 dark:border-slate-700 last:border-0"
                          >
                            <div className="flex justify-between items-center">
                              <span className='text-slate-900 dark:text-slate-50'>{product.name}</span>
                              <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-500">
                                {product.modelNumber}
                              </span>
                            </div>
                            <div className="text-blue-500 text-xs mt-1"> $ {product.price}</div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="md:col-span-1">
                  <label className="text-[10px] font-bold text-slate-400 mb-1">الكمية</label>
                  <input type="number" value={item.quantity} onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 0, products)} className="w-full text-slate-900 dark:text-slate-50 bg-white dark:bg-slate-900 p-3 rounded-xl text-center font-bold outline-none text-sm shadow-sm" />
                </div>
                <div className="md:col-span-1 text-center">
                  <label className="text-[10px] font-bold text-slate-400 mb-1">السعر</label>
                  <div className="p-3 text-sm font-bold"> ${item.price}</div>
                </div>
                <div className="md:col-span-1">
                  <label className="text-[10px] font-bold text-red-400 mb-1">الخصم</label>
                  <input type="number" value={item.discount} onChange={(e) => updateItem(index, "discount", e.target.value, products)} className="w-full bg-red-50 dark:bg-red-900/10 p-3 rounded-xl text-center font-bold text-red-600 outline-none text-sm border border-red-100 dark:border-red-900/20" />
                </div>
                <div className="md:col-span-4">
                  <label className="text-[10px] font-bold text-slate-400 mb-1">ملاحظات المنتج</label>
                  <input type="text" value={item.note} onChange={(e) => updateItem(index, "note", e.target.value, products)} className="w-full bg-white dark:bg-slate-900 p-3 rounded-xl outline-none text-xs shadow-sm" placeholder="إضافة ملاحظة..." />
                </div>
                <div className="md:col-span-1 text-center font-black text-blue-600 italic"> ${item.total}</div>
                <div className="md:col-span-1 flex justify-center">
                  <button onClick={() => setItems(items.filter((_: any, i: number) => i !== index))} className="text-red-400 hover:text-red-600"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
            <button onClick={addNewItem} className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 font-bold text-xs hover:border-blue-500 hover:text-blue-500 transition-all">+ إضافة بند جديد</button>
          </div>
          <div className="space-y-8" dir="rtl">
            {/* القسم الأول: بيانات العميل والطلب */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 dark:bg-slate-800/20 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
              {/* العميل / المورد مع قائمة منسدلة للبحث */}
              <div className="space-y-2 md:col-span-2 relative">
                <label className="text-xs font-bold text-slate-500 mr-2">العميل / المورد</label>
                <div className="relative">
                  <input
                    type="text"
                    // يعرض اسم العميل المختار حالياً أو نص البحث
                    value={customerSearchQuery || customers?.find(c => c.id === customerId)?.name || ""}
                    placeholder="ابحث عن عميل..."
                    onFocus={() => setShowCustomerDropdown(true)}
                    onChange={(e) => {
                      setCustomerSearchQuery(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500 font-bold transition-all"
                  />

                  {/* أيقونة سهم أو بحث صغيرة للجمالية */}
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Search size={18} />
                  </div>
                </div>

                <AnimatePresence>
                  {showCustomerDropdown && (
                    <>
                      {/* طبقة شفافة لإغلاق القائمة عند الضغط خارجها */}
                      <div
                        className="fixed inset-0 z-[200]"
                        onClick={() => setShowCustomerDropdown(false)}
                      />

                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute z-[210] w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto"
                      >
                        {customers?.filter((c: any) =>
                          c.name.toLowerCase().includes((customerSearchQuery || "").toLowerCase()) ||
                          c.phone?.includes(customerSearchQuery || "")
                        ).length > 0 ? (
                          customers
                            ?.filter((c: any) =>
                              c.name.toLowerCase().includes((customerSearchQuery || "").toLowerCase())
                            )
                            .map((customer: any) => (
                              <div
                                key={customer.id}
                                onClick={() => {
                                  setCustomerId(customer.id);
                                  setCustomerSearchQuery(customer.name);
                                  setShowCustomerDropdown(false);
                                }}
                                className="px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer border-b border-slate-50 dark:border-slate-700 last:border-0 transition-colors"
                              >
                                <div className="font-bold text-slate-800 dark:text-slate-100">{customer.name}</div>
                                {customer.phone && (
                                  <div className="text-xs text-slate-500 mt-0.5">{customer.phone}</div>
                                )}
                              </div>
                            ))
                        ) : (
                          <div className="p-4 text-center text-slate-400 text-sm italic">
                            لا يوجد نتائج مطابقة...
                          </div>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 mr-2">اسم الشخص المستلم</label>
                <input type="text" value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="اسم المستلم" className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 mr-2">رقم هاتف المستلم</label>
                <input type="text" value={receiverPhone} onChange={(e) => setReceiverPhone(e.target.value)} placeholder="09XXXXXXXX" className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-left" dir="ltr" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-500 mr-2">طريقة الدفع</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500 font-bold">
                  <option value="عند الاستلام">عند الاستلام</option>
                  <option value="تحويل بنكي">تحويل بنكي</option>
                  <option value="مختلطة">مختلطة</option>
                </select>
              </div>
            </div>

            {/* القسم الثاني: تفاصيل العنوان والشحن */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 mr-2">الدولة</label>
                <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-50 p-3.5 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold transition-all">
                  <option value="">اختر الدولة</option>
                  <option value="تركيا">تركيا</option>
                  <option value="سوريا">سوريا</option>
                  <option value="العراق">العراق</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 mr-2">المدينة / المنطقة</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-50 p-3.5 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 mr-2">البلدية</label>
                <input type="text" value={municipality} onChange={(e) => setMunicipality(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-50 p-3.5 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
              </div>
            </div>

            {/* القسم الثالث: الشحن والملاحظات */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 mr-2">عنوان التسليم التفصيلي</label>
                <input type="text" value={fullAddress} onChange={(e) => setFullAddress(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 mr-2">شركة الشحن</label>
                <input type="text" value={shippingCompany} onChange={(e) => setShippingCompany(e.target.value)} placeholder="اسم الشركة..." className="w-full bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 mr-2">كود التتبع (Tracking)</label>
                <input type="text" value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} placeholder="رقم الشحنة..." className="w-full bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-left" dir="ltr" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 mr-2">رابط الخريطة</label>
                <input type="text" value={googleMapsLink} onChange={(e) => setGoogleMapsLink(e.target.value)} placeholder="رابط الخريطة" className="w-full bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-left" dir="ltr" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-500 mr-2">ملاحظات التوصيل</label>
                <textarea rows={2} value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} placeholder="ملاحظات للمندوب..." className="w-full bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold resize-none" />
              </div>
            </div>
          </div>

        </div>
      </AppModal>


      <AppModal isOpen={OpenAssignModal} onClose={() => setOpenAssignModal(false)} title="ربط المستخدمين بالعميل" >
        <AssignUserModal customer={customer} allUsers={alluser} onSave={handleAssignUsers} />
      </AppModal>  // فتح موديل الموظفين
    </div>
  );
};


function GetCustomerSingle({ data, getdatas }: { data: any, getdatas: any }) {
  const [msg, setMsg] = React.useState("")
  const scrollRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth", // تمرير سلس
      });
    }
  }, [data.message]);
  const { user } = useAuth()
  const submit = async () => {
    if (!msg.trim()) return;

    const res = await createmessage(msg, data.id, user?.id);

    if (res.success) {
      setMsg(""); // مسح الحقل فوراً
      await getdatas(); // انتظار جلب البيانات الجديدة وتحديث الـ State في الأب
      toast.success("تم الإرسال");
    }
  };
  return (
    <div className="text-slate-800 dark:text-slate-50">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200 dark:shadow-none">
            {data.name?.charAt(0) || "U"}
          </div>
          <div>
            <h3 className="text-xl font-bold dark:text-white">{data.name}</h3>
            <p className="text-xs text-slate-500 flex items-center gap-1">تم الانشاء في  :{new Date(data.createdAt).toLocaleDateString('ar-EG')}</p>
          
          </div>
        </div>
        <div className="flex flex-col gap-1">
          
            <p className="text-sm text-slate-500 flex items-center gap-1">حالة الزبون :{data.status}</p>
            <div className="flex items-center gap-1">
              <p className="text-sm text-slate-500 flex items-center gap-1">الموظفين المسؤلين عنه:</p>
              {data.users.map((e: any) => (
                <p className="text-xs text-slate-500 flex items-center gap-1"> {e.username}</p>

              ))}
            </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-3">
            <Phone size={18} className="text-blue-500" />
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase">الهاتف</p>
              <p className="text-sm font-bold dark:text-white">{data.phone}</p>
            </div>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-3">
            <MapPin size={18} className="text-red-500" />
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase">الدولة</p>
              <p className="text-sm font-bold dark:text-white truncate">{data.country || "غير محدد"}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 flex flex-col h-full">
          {/* العنوان وسجل المحادثة */}
          <div className="space-y-4 flex flex-col h-full">
            {/* حاوية المحادثة */}
            <div className="flex flex-col flex-1 border rounded-[2rem] overflow-hidden border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="p-4 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <h4 className="font-bold flex items-center gap-2 dark:text-white text-sm">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  سجل المحادثة
                </h4>
              </div>

              {/* منطقة الرسائل - هنا نضع الـ scrollRef */}
              <div
                ref={scrollRef}
                className="h-[300px] overflow-y-auto p-4 space-y-4 bg-transparent scroll-smooth no-scrollbar"
              >
                {data.message.length === 0 && (
                  <p className="text-center text-slate-400 text-xs py-10 italic">
                    لا توجد محادثات سابقة
                  </p>
                )}

                {data.message.map((chat: any) => (
                  <div key={chat.id} className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="w-full p-3 rounded-2xl rounded-tr-none text-sm bg-blue-600 text-white shadow-sm">
                      {chat.message}
                      <p className="text-[9px] mt-1 opacity-70 text-left">
                        {new Date(chat.createdAt || Date.now()).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* منطقة الإدخال */}
              <div className="p-3 border-t dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="flex gap-2 items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
                  <input
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && msg.trim()) submit();
                    }}
                    placeholder="اكتب رسالة..."
                    className="flex-1 bg-transparent p-2.5 outline-none text-sm dark:text-white"
                  />
                  <button
                    onClick={submit}
                    disabled={!msg.trim()}
                    className="p-2.5 bg-blue-600 text-white rounded-xl active:scale-95 transition-all"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

function NessageCustomer({ data, getdatas, setisopen }: { data: any, getdatas: any, setisopen: any }) {
  const scrollRef = React.useRef<any>(null);
  const [msg, setMsg] = React.useState("")
  const { user } = useAuth()


  const submit = async () => {
    if (!msg.trim()) return;

    const res = await createmessage(msg, data.id, user?.id);

    if (res.success) {
      setMsg(""); // مسح الحقل فوراً
      await getdatas(); // انتظار جلب البيانات الجديدة وتحديث الـ State في الأب
      toast.success("تم الإرسال");
    }
  };
  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100]" onClick={() => { }} />
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} className="fixed left-0 top-0 bottom-0 w-full md:w-[400px] bg-white dark:bg-slate-900 z-[200] shadow-2xl flex flex-col">
        <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">{data.name[0]}</div>
            <h3 className="font-black dark:text-white">{data.name}</h3>
          </div>
          <button onClick={setisopen} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
          {data.message.length === 0 && <p className="text-center text-slate-400 text-xs py-10 italic">لا توجد محادثات سابقة مع هذا العميل</p>}
          {data.message.map((chat: any) => (
            <div key={chat.id} className={`flex justify-start`}>
              <div className={`max-w-[85%] p-3 rounded-2xl text-sm  bg-blue-600 text-white rounded-tr-none}`}>
                {chat.message}
                {/* <p className="text-[8px] mt-1 opacity-50">{chat.time}</p> */}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t dark:border-slate-800">
          <div className="flex gap-2">
            <input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="اكتب رسالة..."
              className="flex-1 bg-slate-100 dark:bg-slate-800 p-3 rounded-xl outline-none text-sm"
            />
            <button onClick={submit} className="p-3 bg-blue-600 text-white rounded-xl active:scale-90 transition-all"><Send size={20} /></button>
          </div>
        </div>
      </motion.div>
    </>
  )
}


function AssignUserModal({ customer, allUsers, onSave }: { customer: any, allUsers: any, onSave: any }) {
  // تخزين المعرفات (IDs) للموظفين المختارين
  const [selectedUserIds, setSelectedUserIds] = React.useState(
    customer?.users?.map((u: any) => u.id) || []
  );


  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev: any) =>
      prev.includes(userId)
        ? prev.filter((id: any) => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] p-8 shadow-2xl border border-slate-200 dark:border-slate-800">
        <h2 className="text-xl font-black mb-2 dark:text-white">ربط الموظفين</h2>
        <p className="text-slate-500 text-sm mb-6">العميل: {customer?.name}</p>

        <div className="max-h-[300px] overflow-y-auto space-y-2 mb-8 pr-2 custom-scrollbar">
          {allUsers.map((user: any) => (
            <div
              key={user.id}
              onClick={() => toggleUser(user.id)}
              className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border-2 ${selectedUserIds.includes(user.id)
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                  : "border-transparent bg-slate-50 dark:bg-slate-800"
                }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold">
                  {user.username[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-sm dark:text-white">{user.username}</p>
                  <p className="text-[10px] text-slate-500">{user.email}</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={selectedUserIds.includes(user.id)}
                readOnly
                className="w-5 h-5 accent-blue-600"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => onSave(customer.id, selectedUserIds)}
            className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30"
          >
            حفظ التغييرات
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomrLayout;