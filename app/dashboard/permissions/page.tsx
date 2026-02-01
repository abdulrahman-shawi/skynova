"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { 
    ShieldCheck, Save, CheckCircle2, Plus, Trash2, Loader2, Info, X
} from "lucide-react";
import toast, { Toaster } from 'react-hot-toast';

export default function PermissionsPage() {
    const [roles, setRoles] = useState<any[]>([]);
    const [selectedRole, setSelectedRole] = useState<any>(null);
    const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const res = await fetch('/api/permissions');
            const response = await res.json();
            if (response.success && Array.isArray(response.data)) {
                setRoles(response.data);
                if (response.data.length > 0) setSelectedRole(response.data[0]);
            }
        } catch (err) {
            toast.error("خطأ في جلب البيانات");
        }
    };

    const handleAddNewRole = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        
        try {
            const result = await fetch('/api/permissions', { method: 'POST', body: formData });
            const response = await result.json();
            
            if (response.success && response.data) {
                // إضافة الدور الجديد للمصفوفة وتحديده فوراً
                setRoles(prev => [...prev, response.data]);
                setSelectedRole(response.data);
                setIsAddRoleModalOpen(false);
                (e.target as HTMLFormElement).reset(); // تفريغ الحقل
                toast.success("تم إنشاء الدور بنجاح");
            } else {
                toast.error(response.error || "فشل الإنشاء");
            }
        } catch (err) {
            toast.error("حدث خطأ تقني");
        } finally {
            setLoading(false);
        }
    };

    const togglePermission = (fieldName: string) => {
        if (!selectedRole) return;
        const updatedRole = { ...selectedRole, [fieldName]: !selectedRole[fieldName] };
        setSelectedRole(updatedRole);
        setRoles(prev => prev.map(r => r.id === selectedRole.id ? updatedRole : r));
    };

    const handleSave = async () => {
        if (!selectedRole) return;
        setLoading(true);
        try {
            const result = await fetch(`/api/permissions/${selectedRole.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(selectedRole)
            });
            const response = await result.json();
            if (response.success) toast.success("تم حفظ التغييرات بنجاح");
        } catch (err) {
            toast.error("فشل الحفظ");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("هل أنت متأكد من حذف هذا الدور؟")) return;
        try {
            const res = await fetch(`/api/permissions/${id}`, { method: 'DELETE' });
            const response = await res.json();
            if (response.success) {
                const updated = roles.filter(r => r.id !== id);
                setRoles(updated);
                setSelectedRole(updated.length > 0 ? updated[0] : null);
                toast.success("تم حذف الدور");
            }
        } catch (err) {
            toast.error("فشل الحذف");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-12 text-right" dir="rtl">
            <Toaster position="top-center" />
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-indigo-600 text-white rounded-3xl shadow-xl shadow-indigo-500/20">
                            <ShieldCheck size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white">إدارة الصلاحيات</h1>
                            <p className="text-slate-500">التحكم في وصول المستخدمين للنظام</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Sidebar */}
                    <div className="lg:col-span-4 space-y-4">
                        {Array.isArray(roles) && roles.map((role) => (
                            <div 
                                key={role?.id || Math.random()} 
                                onClick={() => setSelectedRole(role)}
                                className={`group relative p-6 rounded-[2rem] border-2 cursor-pointer transition-all ${
                                    selectedRole?.id === role?.id 
                                    ? 'bg-white dark:bg-slate-900 border-indigo-500 shadow-xl' 
                                    : 'bg-slate-100/50 dark:bg-slate-900/50 border-transparent hover:border-slate-200'
                                }`}
                            >
                                <h4 className={`font-black ${selectedRole?.id === role?.id ? 'text-indigo-600' : ''}`}>
                                    {role?.roleName || "بدون اسم"}
                                </h4>
                                <h6 className="text-slate-500">{role?.users?.length || 0} مستخدمين</h6>
                                
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDelete(role.id); }}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        
                        <button onClick={() => setIsAddRoleModalOpen(true)}
                            className="w-full py-5 border-2 border-dashed border-indigo-200 rounded-[2rem] text-indigo-500 font-black flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all">
                            <Plus size={20} /> إضافة دور جديد
                        </button>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border dark:border-slate-800 overflow-hidden">
                        {selectedRole ? (
                            <>
                                <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/30">
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white">صلاحيات: {selectedRole.roleName}</h2>
                                    <button onClick={handleSave} disabled={loading}
                                        className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-indigo-700 disabled:bg-slate-400 transition-all">
                                        {loading ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} حفظ الصلاحيات
                                    </button>
                                </div>
                                <div className="p-8 space-y-8">
                                    <PermissionRow title="المنتجات" suffix="Products" role={selectedRole} onToggle={togglePermission} />
                                    <PermissionRow title="التقارير" suffix="Reports" role={selectedRole} onToggle={togglePermission} />
                                    <PermissionRow title="الطلبات" suffix="Orders" role={selectedRole} onToggle={togglePermission} />
                                </div>
                            </>
                        ) : (
                            <div className="p-20 text-center flex flex-col items-center gap-4 text-slate-400">
                                <Info size={48} className="opacity-20" />
                                <p className="font-bold">يرجى اختيار دور من القائمة الجانبية لتعديل صلاحياته</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isAddRoleModalOpen && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border dark:border-slate-800">
                            <h2 className="text-2xl font-black mb-6">إضافة دور جديد</h2>
                            <form onSubmit={handleAddNewRole} className="space-y-4">
                                <input name="roleName" required placeholder="مثلاً: مدير مبيعات" className="w-full p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-right outline-none ring-indigo-500 focus:ring-2 transition-all" />
                                <div className="flex gap-2">
                                    <button type="submit" disabled={loading} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black hover:bg-indigo-700 transition-all">
                                        {loading ? "جاري الإنشاء..." : "إنشاء الدور"}
                                    </button>
                                    <button type="button" onClick={() => setIsAddRoleModalOpen(false)} className="px-6 bg-slate-100 dark:bg-slate-800 dark:text-white rounded-2xl font-bold">إلغاء</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// مكون PermissionRow يبقى كما هو مع التأكد من استلام الـ Props بشكل صحيح
function PermissionRow({ title, suffix, role, onToggle }: any) {
    const actions = [
        { id: 'view', label: 'عرض' }, { id: 'add', label: 'إضافة' },
        { id: 'edit', label: 'تعديل' }, { id: 'delete', label: 'حذف' }
    ];

    return (
        <div className="border-b dark:border-slate-800 last:border-0 pb-8 text-right">
            <h4 className="font-black mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <div className="w-2 h-2 rounded-full bg-indigo-500"/> {title}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {actions.map((action) => {
                    const fieldName = `${action.id}${suffix}`;
                    const isActive = role ? role[fieldName] : false;
                    return (
                        <div key={fieldName} onClick={() => onToggle(fieldName)}
                            className={`p-3 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                                isActive 
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500' 
                                : 'border-slate-100 dark:border-slate-800 opacity-60'
                            }`}>
                            <span className={`text-xs font-bold ${isActive ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-500'}`}>{action.label}</span>
                            <div className={`w-5 h-5 rounded flex items-center justify-center border ${isActive ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                                {isActive && <CheckCircle2 size={12}/>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}