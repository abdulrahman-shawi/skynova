import { useAuth } from "@/context/AuthContext";
import { createmessage } from "@/server/customer";
import { MapPin, Phone, Send } from "lucide-react";
import React from "react";
import toast from "react-hot-toast";

export default function GetCustomerSingle({ data, getdatas }: { data: any, getdatas: any }) {
  const [msg, setMsg] = React.useState("")
  const scrollRef = React.useRef<any>(null);
  const { user } = useAuth()

  // التمرير التلقائي عند وصول رسالة جديدة
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: 0, // لأننا نستخدم الترتيب العكسي، فالأعلى هو الأحدث
        behavior: "smooth",
      });
    }
  }, [data.message]);

  const submit = async () => {
    if (!msg.trim()) return;
    const res = await createmessage(msg, data.id, user?.id);
    if (res.success) {
      setMsg("");
      await getdatas();
      toast.success("تم الإرسال");
    }
  };

  return (
    <div className="text-slate-800 dark:text-slate-50">
      {/* الهيدر - يبقى كما هو */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
            {data.name?.charAt(0) || "U"}
          </div>
          <div>
            <h3 className="text-xl font-bold dark:text-white">{data.name}</h3>
            <p className="text-xs text-slate-500">تم الانشاء في: {new Date(data.createdAt).toLocaleDateString('ar-EG')}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* معلومات الهاتف والدولة */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-3">
            <Phone size={18} className="text-blue-500" />
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase">الهاتف</p>
              <p className="text-sm font-bold dark:text-white">
                {data.phone.join(" - ")}
              </p>
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

        {/* حاوية المحادثة الجديدة */}
        <div className="flex flex-col border rounded-[2rem] overflow-hidden border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm min-h-[450px]">

          {/* 1. منطقة الإدخال أصبحت في الأعلى */}
          <div className="p-4 border-b dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30">
            <div className="flex gap-2 items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
              <input
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && msg.trim()) submit();
                }}
                placeholder="اكتب ملخص تواصل اليوم"
                className="flex-1 bg-transparent p-2.5 outline-none text-sm dark:text-white"
              />
              <button
                onClick={submit}
                disabled={!msg.trim()}
                className="p-2.5 bg-blue-600 text-white rounded-xl active:scale-95 transition-all disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
          </div>

          {/* عنوان سجل المحادثة */}
          <div className="px-4 py-2 border-b dark:border-slate-800">
            <h4 className="font-bold flex items-center gap-2 dark:text-white text-[11px] uppercase tracking-wider text-slate-400">
              سجل الأنشطة
            </h4>
          </div>

          {/* 2. منطقة الرسائل أصبحت تحت الإدخال */}
          {/* ملاحظة: استخدمنا flex-col-reverse لجعل الرسائل الجديدة تظهر في الأعلى دائماً */}
          <div
            ref={scrollRef}
            className="flex-1 h-[350px] overflow-y-auto p-4 flex flex-col-reverse gap-4 bg-transparent no-scrollbar"
          >
            {[...data.message].map((chat: any) => (
              <div key={chat.id} className="flex justify-start animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="w-full p-3 rounded-2xl rounded-tr-none text-sm bg-blue-600 text-white shadow-sm">
                  {chat.message}
                  <div className="flex items-end justify-between">
                    <div className="">
                        <p className="text-[9px] mt-1 opacity-70 text-left">
                          {chat.user.username}
                        </p>
                    </div>
                    <div className="">
                      <p className="text-[9px] mt-1 opacity-70 text-left">
                        {new Date(chat.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}

                      </p>
                      <p className="text-[9px] opacity-70 text-left">
                        {new Date(chat.createdAt).toLocaleDateString('ar-EG', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    
                  </div>
                </div>

              </div>
            ))}

            {data.message.length === 0 && (
              <p className="text-center text-slate-400 text-xs py-10 italic">
                لا توجد محادثات سابقة
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}