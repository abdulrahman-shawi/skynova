"use client"
import { DataTable } from '@/components/shared/DataTable';
import { AppModal } from '@/components/ui/app-modal';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { getCustomer } from '@/server/customer';
import { createOrder, getOrders, updateOrder } from '@/server/order';
import { getProduct } from '@/server/product';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, Mail, Plus, Printer, Save, Trash2, X } from 'lucide-react';
import * as React from 'react';
import toast from 'react-hot-toast';
import { TableAction } from '../../../components/shared/DataTable';

interface IOrderLayoutProps {
}

const OrderLayout: React.FunctionComponent<IOrderLayoutProps> = (props) => {
    const [products, setProduct] = React.useState<any[]>([])
    const [customers, setCustomers] = React.useState<any[]>([])
    const [orders, setorders] = React.useState<any[]>([])
    const [order, setorder] = React.useState<any>({})
    const [isOpen, setIsOpen] = React.useState(false);
    const [isOpenorder, setisOpenorder] = React.useState(false);
    const [status, setStatus] = React.useState("طلب جديد");
    const [editId, setEditId] = React.useState<string | number | null>(null);
    const [items, setItems] = React.useState([
        { productId: "", name: "", price: 0, quantity: 1, discount: 0, note: "", total: 0, modelNumber: "" }
    ]);
    const [searchQueries, setSearchQueries] = React.useState<Record<number, string>>({});
    const [showDropdown, setShowDropdown] = React.useState<Record<number, boolean>>({});
    const [overallDiscount, setOverallDiscount] = React.useState(0);

    // بيانات العميل والمبالغ
    const [customerId, setCustomerId] = React.useState("");
    const [totalAmount, setTotalAmount] = React.useState(0);
    const [discount, setDiscount] = React.useState(0);
    const [finalAmount, setFinalAmount] = React.useState(0);
    const [paymentMethod, setPaymentMethod] = React.useState("عند الاستلام");

    // بيانات المستلم والعنوان
    const [receiverName, setReceiverName] = React.useState("");
    const [receiverPhone, setReceiverPhone] = React.useState("");
    const [country, setCountry] = React.useState("ليبيا"); // افتراضي حسب الصورة
    const [city, setCity] = React.useState("");
    const [municipality, setMunicipality] = React.useState("");
    const [fullAddress, setFullAddress] = React.useState("");

    // تفاصيل الشحن
    const [deliveryMethod, setDeliveryMethod] = React.useState("توصيل الى المنزل");
    const [shippingCompany, setShippingCompany] = React.useState("");
    const [trackingCode, setTrackingCode] = React.useState("");
    const [googleMapsLink, setGoogleMapsLink] = React.useState("");

    const [deliveryNotes, setDeliveryNotes] = React.useState("");
    const [additionalNotes, setAdditionalNotes] = React.useState("");
    const subTotal = items.reduce((sum, i) => sum + i.total, 0);
    const grandTotal = subTotal - overallDiscount;

     
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

    const {user} = useAuth()

    const addNewItem = () => {
        setItems([...items, { productId: "", name: "", price: 0, quantity: 1, discount: 0, note: "", total: 0, modelNumber: "" }]);
    };

    const getAlluser = async () => {
        const res = await getCustomer();
        if (res.success) {
            const allCustomers = res.data;

            // منطق الفلترة بناءً على الرتبة
            setCustomers(allCustomers);
        }
    }

    const Order = async () => {
        const res = await getOrders()
        if(res.success){
            setorders(res.data)
        }
    }


// 1. تأكد من وجود حالة للتحميل في المكون الخاص بك
// const [isSubmitting, setIsSubmitting] = useState(false);
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
    const loadingMessage = editId ? "جاري تعديل الطلب..." : "جاري حفظ الطلب الجديد...";
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
        if (editId) {
            // حالة التعديل
            res = await updateOrder(orderData, editId, items);
        } else {
            // حالة إنشاء طلب جديد
            res = await createOrder(orderData, items, user?.id);
        }

        if (res.success) {
            toast.success(editId ? "تم تحديث الطلب بنجاح" : "تم حفظ الطلب بنجاح");
            
            // تحديث قائمة الطلبات في الواجهة
            if (typeof Order === 'function') Order(); 
            
            // إغلاق المودال
            setIsOpen(false);
            
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
    React.useEffect(() => {
        getAlluser();
        Order();
        getProduct().then((products) => {
            setProduct(products);
        }).catch(console.error);

    }, []);

   

    const tableActions: any[] = [
        {
  label: "إظهار الفاتورة",
  icon: <Eye size={14} />, // تأكد من استيراد Eye من lucide-react
  onClick: (data: any) => {
    // تعيين بيانات الطلب المختار لعرضها في الفاتورة
    setorder(data); 
    console.log(data)
    // فتح مودال الفاتورة
    setisOpenorder(true);
  }
},
            {
  label: "تعديل",
  icon: <Mail size={14} />,
  onClick: (data: any) => {
    // 1. تعيين المعرف الأساسي لحالة التعديل
    setEditId(data.id);

    // 2. تعيين بيانات العميل والحالة الأساسية
    setCustomerId(data.customerId); // تأكد أنه ID وليس الكائن كاملاً
    setStatus(data.status);
    setPaymentMethod(data.paymentMethod);

    // 3. تعيين بيانات المستلم
    setReceiverName(data.receiverName || "");
    setReceiverPhone(data.receiverPhone || "");
    setCountry(data.country || "ليبيا");
    setCity(data.city || "");
    setMunicipality(data.municipality || "");
    setFullAddress(data.fullAddress || "");

    // 4. تعيين بيانات الشحن
    setDeliveryMethod(data.deliveryMethod || "توصيل الى المنزل");
    setShippingCompany(data.shippingCompany || "");
    setTrackingCode(data.trackingCode || "");
    setGoogleMapsLink(data.googleMapsLink || "");
    setDeliveryNotes(data.deliveryNotes || "");
    setAdditionalNotes(data.additionalNotes || "");

    // 5. تعيين المبالغ المالية
    setOverallDiscount(data.overallDiscount || 0);
    // المبالغ الأخرى (subTotal, grandTotal) يتم حسابها تلقائياً من الـ items

    
    // 6. تعيين المنتجات (Items) 
    // ملاحظة: تأكد أن العلاقة في Prisma تسمى items أو OrderItems
    if (data.items && data.items.length > 0) {
      const formattedItems = data.items.map((item: any) => ({
        productId: item.productId.toString(),
        name: item.product?.name || item.name,
        price: item.price,
        quantity: item.quantity,
        discount: item.discount || 0,
        note: item.note || "",
        total: (item.price * item.quantity) - (item.discount || 0),
        modelNumber: item.product?.modelNumber || ""
      }));
      setItems(formattedItems);
      
      // تحديث مصفوفة البحث السريع لضمان ظهور أسماء المنتجات في الحقول
      const searches: Record<number, string> = {};
      formattedItems.forEach((item:any, idx:any) => {
        searches[idx] = item.name;
      });
      setSearchQueries(searches);
    } else {
      // إذا لم توجد منتجات، نضع سطراً فارغاً
      setItems([{ productId: "", name: "", price: 0, quantity: 1, discount: 0, note: "", total: 0, modelNumber: "" }]);
    }

    // 7. فتح المودال
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
                 
                }
              }
            },
            
          ];
    return (
        <div className="">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">إدارة الطلبات</h1>
                <Button onClick={() => { setEditId(null); setIsOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-6">
                    إضافة طلب جديد
                </Button>
            </div>
            <DataTable data={orders} actions={tableActions} columns={[
                { 
        header: "رقم الطلب", 
        accessor: "orderNumber" 
    },
    { 
        header: "العميل", 
        accessor: (e: any) => (
            <div className="flex flex-col">
                <span className="font-bold">{e.customer?.name}</span>
            </div>
        ) 
    },
    { 
        header: "رقم التواصل", 
        accessor: (e: any) => (
            <a 
                href={`tel:${e.receiverPhone || e.customer?.phone}`} 
                className="text-blue-600 hover:underline font-bold dir-ltr"
            >
                {e.receiverPhone || e.customer?.phone}
            </a>
        ) 
    },
    {header:"بيعت من قبل" ,accessor:(e:any) => e.user.username},
    { 
        header: "طريقة الدفع", 
        accessor: (e: any) => (
            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-xs">
                {e.paymentMethod}
            </span>
        )
    },
    { 
        header: "إجمالي المنتجات", 
        accessor: (e: any) => e.items?.length || 0 
    },
    { 
        header: "قيمة الفاتورة", 
        accessor: (e: any) => (
            <span className="font-black text-blue-600">
                {e.finalAmount?.toLocaleString()} ل.س
            </span>
        ) 
    },
    { 
        header: "طريقة التسليم", 
        accessor: (e: any) => (
            <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full border border-yellow-100">
                {e.deliveryMethod}
            </span>
        )
    },
    { 
        header: "حالة الطلب", 
        accessor: (e: any) => {
            const statusColors: Record<string, string> = {
                "طلب جديد": "bg-blue-100 text-blue-700 border-blue-200",
                "تم التجهيز": "bg-purple-100 text-purple-700 border-purple-200",
                "تم الاستلام": "bg-green-100 text-green-700 border-green-200",
                "تم الغاء الطلب": "bg-red-100 text-red-700 border-red-200",
                "فشل التسليم": "bg-slate-100 text-slate-700 border-slate-200",
            };

            return (
                <button className={`px-4 py-1.5 rounded-2xl text-xs font-black border transition-all hover:opacity-80 ${statusColors[e.status] || "bg-gray-100"}`}>
                    {e.status}
                </button>
            );
        } 
    },
    {
        header: "تاريخ الإنشاء",
        accessor: (e: any) => new Date(e.createdAt).toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    },
            ]}/>
            <AppModal footer={
                <div className="pt-6 w-full flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex gap-6 items-center">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-red-500 uppercase px-1">خصم إضافي (كلي)</label>
                            <div className="relative">
                                <input type="number" value={overallDiscount} onChange={(e) => setOverallDiscount(Number(e.target.value))} className="w-32 bg-red-50 dark:bg-red-900/10 p-3 rounded-2xl border border-red-100 dark:border-red-900/20 outline-none font-bold text-red-600 text-center" placeholder="0" />
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400">ل.س</span>
                            </div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 px-8 py-4 rounded-3xl">
                            <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">الإجمالي النهائي</p>
                            <h3 className="text-3xl font-black font-sans text-blue-600 italic">ل.س{grandTotal.toLocaleString()}</h3>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={handleSubmit}
                            className={`px-12 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2`}
                        >
                            <Save size={20} /> حفظ الفاتورة
                        </button>
                        <button onClick={() => setIsOpen(false)} className="px-8 py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold">إلغاء</button>
                    </div>
                </div>
            } size='full' isOpen={isOpen} onClose={() => setIsOpen(false)} title='اضافة طلب'>
                <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* بيانات التواصل */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-500 px-1">العميل / المورد</label>
                            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-50 p-4 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold">
                                <option value="">اختر من القائمة...</option>
                                {customers?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-500 px-1">حالة الطلب</label>
                            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-50 p-4 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold">
                                <option value="">اختر الحالة</option>
                                <option value="طلب جديد">طلب جديد</option>
                                <option value="تم التجهيز">تم التجهيز</option>
                                <option value="قيد الاستلام">قيد الاستلام</option>
                                <option value="تم الاستلام">تم الاستلام</option>
                                <option value="معلق / نقص معلومات">معلق / نقص معلومات</option>
                                <option value="تم الغاء الطلب">تم إلغاء الطلب</option>
                                <option value="فشل التسليم">فشل التسليم</option>
                                <option value="حجز بمبلغ مال">حجز بمبلغ مال</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-500">اسم الشخص المستلم</label>
                            <input type="text" value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="اسم المستلم" className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-50 p-4 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-500 px-1">رقم هاتف المستلم</label>
                            <input
                                type="text"
                                value={receiverPhone}
                                onChange={(e) => setReceiverPhone(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 p-4 text-slate-800 dark:text-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                placeholder="09XXXXXXXX"
                            />
                        </div>

                        <div className="space-y-2 col-span-2">
                            <label className="text-sm font-bold text-slate-500 px-1">طريقة الدفع</label>
                            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-50 p-4 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold">
                                <option value="عند الاستلام">عند الاستلام</option>
                                <option value="تحويل بنكي">تحويل بنكي</option>
                                <option value="أخرى">أخرى</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {/* تفاصيل العنوان */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-500 px-1">الدولة</label>
                            <select
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-50 p-4 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                            >
                                <option value="">اختر الدولة</option>
                                <option value="تركيا">تركيا</option>
                                <option value="سوريا">سوريا</option>
                                <option value="العراق">العراق</option>
                                <option value="ليبيا">ليبيا</option>
                                <option value="اوربا">أوروبا</option>
                                <option value="امريكا">أمريكا</option>
                                <option value="أخرى">أخرى</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-500 px-1">المدينة / المنطقة</label>
                            <input
                                type="text"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                className="w-full bg-slate-50 text-slate-800 dark:text-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-500 px-1">البلدية</label>
                            <input
                                type="text"
                                value={municipality}
                                onChange={(e) => setMunicipality(e.target.value)}
                                className="w-full bg-slate-50 text-slate-800 dark:text-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                            />
                        </div>

                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-500 px-1">عنوان التسليم</label>
                            <input
                                type="text"
                                value={fullAddress}
                                onChange={(e) => setFullAddress(e.target.value)}
                                className="w-full bg-slate-50 text-slate-800 dark:text-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-500 px-1">رابط خرائط جوجل</label>
                            <input
                                type="text"
                                value={googleMapsLink}
                                onChange={(e) => setGoogleMapsLink(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-50 p-4 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                placeholder="https://goo.gl/maps/..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-500 px-1">شركة الشحن</label>
                            <input
                                type="text"
                                value={shippingCompany}
                                onChange={(e) => setShippingCompany(e.target.value)}
                                placeholder="اسم الشركة..."
                                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-50 p-4 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-500 px-1">كود التتبع (Tracking)</label>
                            <input
                                type="text"
                                value={trackingCode}
                                onChange={(e) => setTrackingCode(e.target.value)}
                                placeholder="رقم الشحنة..."
                                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-50 p-4 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                            />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <label className="text-sm font-bold text-slate-500 px-1">طريقة التسليم</label>
                            <select
                                value={deliveryMethod}
                                onChange={(e) => setDeliveryMethod(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-50 p-4 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                            >
                                <option value="توصيل الى المنزل">توصيل إلى المنزل</option>
                                <option value="استلام الى أقرب منطقة">استلام من المكتب</option>
                                <option value="اخرى">اخرى</option>
                            </select>
                        </div>
                        <div className="space-y-2 mb-8 text-right col-span-2" dir="rtl">
                            <label className="text-sm font-bold text-slate-500 px-1">ملاحظات التوصيل (للشركة/المندوب)</label>
                            <textarea
                                rows={2}
                                value={deliveryNotes}
                                onChange={(e) => setDeliveryNotes(e.target.value)}
                                placeholder="مثال: يرجى الاتصال قبل الوصول بنصف ساعة..."
                                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-50 p-4 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                            />
                        </div>
                    </div>
                    <div className="space-y-4 mt-4">
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
                                                        <div className="text-blue-500 text-xs mt-1">ل.س {product.price}</div>
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
                                    <div className="p-3 text-sm font-bold">ل.س{item.price}</div>
                                </div>
                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold text-red-400 mb-1">الخصم</label>
                                    <input type="number" value={item.discount} onChange={(e) => updateItem(index, "discount", e.target.value, products)} className="w-full bg-red-50 dark:bg-red-900/10 p-3 rounded-xl text-center font-bold text-red-600 outline-none text-sm border border-red-100 dark:border-red-900/20" />
                                </div>
                                <div className="md:col-span-4">
                                    <label className="text-[10px] font-bold text-slate-400 mb-1">ملاحظات المنتج</label>
                                    <input type="text" value={item.note} onChange={(e) => updateItem(index, "note", e.target.value, products)} className="w-full bg-white dark:bg-slate-900 p-3 rounded-xl outline-none text-xs shadow-sm" placeholder="إضافة ملاحظة..." />
                                </div>
                                <div className="md:col-span-1 text-center font-black text-blue-600 italic">ل.س{item.total}</div>
                                <div className="md:col-span-1 flex justify-center">
                                    <button onClick={() => setItems(items.filter((_: any, i: number) => i !== index))} className="text-red-400 hover:text-red-600"><Trash2 size={18} /></button>
                                </div>
                            </div>
                        ))}
                        <button onClick={addNewItem} className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 font-bold text-xs hover:border-blue-500 hover:text-blue-500 transition-all">+ إضافة بند جديد</button>
                    </div>

                </div>
            </AppModal>

            <AppModal size='full' isOpen={isOpenorder} onClose={() => setisOpenorder(false)} title='ملخص الطلب' >
                <ViewOrder data={order} products={products}  />
            </AppModal>
        </div>
    );
};

function ViewOrder({ data, products }: { data: any, products: any }){
    const subtotal = Number(data.finalAmount) || 0;
    const getProductName = (productId: any) => {
        const product = products?.find((p: any) => p.id === productId);
        return product ? product.name : `منتج رقم #${productId}`;
    };
    return (
        <div className="p-12 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-50" id="printable-area">
                        {/* الهيدر */}
                        <div className="flex justify-between items-start mb-12 border-b-2 border-slate-100 pb-10">
                            <div>
                                <h1 className="text-4xl font-black text-blue-600 mb-2 italic tracking-tighter">
                                    فاتورة الطلب
                                </h1>
                                <p className=" font-bold">رقم المرجع: <span className="font-mono ">#{data.orderNumber}</span></p>
                                <p className=" font-bold">
  التاريخ: 
  <span className="">
    {data.createdAt instanceof Date 
      ? data.createdAt.toLocaleDateString('ar-EG') 
      : String(data.createdAt)}
  </span>
</p>
                            </div>
                            <div className="text-left">
                                <div className="text-2xl font-black text-slate-900">skynova</div>
                            </div>
                        </div>

                        {/* معلومات العميل */}
                        <div className="mb-12  p-8 rounded-[2.5rem] flex justify-between items-center">
                            <div className={`px-5 py-2 rounded-full text-md font-black shadow-sm`}>
                                العميل: {data.customer.name}
                            </div>
                            <div className={`px-5 py-2 rounded-full text-xs font-black shadow-sm ${data.status === 'مدفوعة' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                                الحالة: {data.status}
                            </div>
                        </div>

                        {/* جدول المنتجات الحقيقي */}
                        <table className="w-full mb-10 text-right ">
                            <thead>
                                <tr className="bg-slate-900 text-white">
                                    <th className="px-6 py-4 rounded-r-2xl">المنتج (ID)</th>
                                    <th className="px-6 py-4 text-center">الكمية</th>
                                    <th className="px-6 py-4 text-center">سعر الوحدة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.items && data.items.length > 0 ? (
                                    data.items.map((item: any, idx: number) => (
                                        <tr key={idx} className="border-b border-slate-100">
                                            <td className="px-6 py-6 font-bold text-slate-700">
                                                {/* هنا نستخدم الدالة لجلب الاسم بدلاً من الرقم */}
                                                {getProductName(item.productId)}
                                            </td>
                                            <td className="px-6 py-6 text-center font-bold">{item.quantity}</td>
                                            <td className="px-6 py-6 text-center text-slate-500">ل.س{item.price.toLocaleString()}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr className="border-b border-slate-100">
                                        <td colSpan={4} className="px-6 py-8 text-center text-slate-400 font-bold">لا توجد تفاصيل للمواد</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* ملخص الحسابات */}
                        <div className="flex justify-end">
                            <div className="w-80 space-y-3 p-6 rounded-[2.5rem] border border-slate-100">

                                <div className="flex justify-between text-2xl font-black text-blue-600 pt-3 ">
                                    <span>الإجمالي:</span>
                                    <span className="italic font-sans">${subtotal.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
    )
}
export default OrderLayout;
