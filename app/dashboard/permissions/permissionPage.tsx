"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { 
    ShieldCheck, Lock, Save, CheckCircle2, X, Plus, Trash2, Loader2, Info
} from "lucide-react";
import { updateRolePermissions, createRole, deleteRole } from '@/server/permissions';

export default function PermissionsPage({ initialRoles = [] }: { initialRoles: any[] }) {
    // 1. معالجة الحالة الابتدائية بحذر
    const [roles, setRoles] = useState(initialRoles);
    const [selectedRole, setSelectedRole] = useState<any>(initialRoles.length > 0 ? initialRoles[0] : null);
    const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // تحديث الدور المختار إذا تغيرت قائمة الأدوار (مثلاً عند الحذف)
    useEffect(() => {
        if (!selectedRole && roles.length > 0) {
            setSelectedRole(roles[0]);
        }
    }, [roles, selectedRole]);

    useEffect(() => {
        setRoles(initialRoles);
        if (initialRoles.length > 0 && !selectedRole) {
            setSelectedRole(initialRoles[0]);
        }
    }, [initialRoles]);

    const handleAddNewRole = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const result = await createRole(formData);
        
        if (result.success) {
            const newRole = result.data;
            setRoles(prev => [...prev, newRole]);
            setSelectedRole(newRole);
            setIsAddRoleModalOpen(false);
            (e.target as HTMLFormElement).reset();
        }
        setLoading(false);
    };

    const togglePermission = (fieldName: string) => {
        if (!selectedRole) return;
        
        const updatedRole = { 
            ...selectedRole, 
            [fieldName]: !selectedRole[fieldName] 
        };
        
        setSelectedRole(updatedRole);
        setRoles(prev => prev.map(r => r.id === selectedRole.id ? updatedRole : r));
    };

    const handleSave = async () => {
        if (!selectedRole) return;
        setLoading(true);
        const formData = new FormData();
        formData.append("id", selectedRole.id);
        formData.append("roleName", selectedRole.roleName);

        const keys = [
            "viewProducts", "addProducts", "editProducts", "deleteProducts",
            "viewReports", "addReports", "editReports", "deleteReports",
            "viewOrders", "addOrders", "editOrders", "deleteOrders"
        ];

        keys.forEach(key => formData.append(key, String(selectedRole[key] || false)));

        const result = await updateRolePermissions(formData);
        if (result.success) alert("تم تحديث البيانات بنجاح ✅");
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("هل أنت متأكد من الحذف؟")) return;
        const result = await deleteRole(id);
        if (result.success) {
            const newRoles = roles.filter(r => r.id !== id);
            setRoles(newRoles);
            setSelectedRole(newRoles.length > 0 ? newRoles[0] : null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-12 font-sans text-right" dir="rtl">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-indigo-600 text-white rounded-3xl shadow-xl shadow-indigo-500/20">
                            <ShieldCheck size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white">إدارة الصلاحيات</h1>
                            <p className="text-slate-500">مزامنة مباشرة مع Prisma ORM</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Sidebar */}
                    <div className="lg:col-span-4 space-y-4">
                        {roles.map((role) => (
                            <div 
                                key={role.id}
                                onClick={() => setSelectedRole(role)}
                                className={`group relative p-6 rounded-[2rem] border-2 cursor-pointer transition-all ${
                                    selectedRole?.id === role.id 
                                    ? 'bg-white dark:bg-slate-900 border-indigo-500 shadow-xl' 
                                    : 'bg-slate-100/50 dark:bg-slate-900/50 border-transparent hover:border-slate-200'
                                }`}
                            >
                                <h4 className={`font-black ${selectedRole?.id === role.id ? 'text-indigo-600' : ''}`}>{role.roleName}</h4>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDelete(role.id); }}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        <button 
                            onClick={() => setIsAddRoleModalOpen(true)}
                            className="w-full py-5 border-2 border-dashed border-indigo-200 rounded-[2rem] text-indigo-500 font-black flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all"
                        >
                            <Plus size={20} /> إضافة دور جديد
                        </button>
                    </div>

                    {/* Main Section */}
                    <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border dark:border-slate-800 overflow-hidden">
                        {selectedRole ? (
                            <>
                                <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/30">
                                    <h2 className="text-xl font-black dark:text-white">صلاحيات: {selectedRole.roleName}</h2>
                                    <button 
                                        onClick={handleSave}
                                        disabled={loading}
                                        className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg hover:bg-indigo-700 disabled:bg-slate-400 transition-all"
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                                        حفظ التغييرات
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
                                <p className="font-bold">لا يوجد دور محدد. أضف دوراً جديداً للبدء.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isAddRoleModalOpen && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
                            <h2 className="text-2xl font-black mb-6 text-right">إضافة دور جديد</h2>
                            <form onSubmit={handleAddNewRole} className="space-y-4">
                                <input 
                                    name="roleName" 
                                    required 
                                    placeholder="اسم الدور (مثلاً: مدير مبيعات)" 
                                    className="w-full p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl outline-none focus:ring-2 ring-indigo-500 text-right" 
                                />
                                <div className="flex gap-2">
                                    <button type="submit" disabled={loading} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black">
                                        {loading ? "جاري الإضافة..." : "إنشاء"}
                                    </button>
                                    <button type="button" onClick={() => setIsAddRoleModalOpen(false)} className="px-6 bg-slate-100 rounded-2xl font-bold">إلغاء</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function PermissionRow({ title, suffix, role, onToggle }: any) {
    const actions = [
        { id: 'view', label: 'عرض' },
        { id: 'add', label: 'إضافة' },
        { id: 'edit', label: 'تعديل' },
        { id: 'delete', label: 'حذف' }
    ];

    return (
        <div className="border-b dark:border-slate-800 last:border-0 pb-8">
            <h4 className="font-black text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500"/> {title}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {actions.map((action) => {
                    const fieldName = `${action.id}${suffix}`;
                    const isActive = role ? role[fieldName] : false;

                    return (
                        <div 
                            key={fieldName}
                            onClick={() => onToggle(fieldName)}
                            className={`p-3 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                                isActive ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500' : 'border-slate-100 dark:border-slate-800 opacity-60'
                            }`}
                        >
                            <span className={`text-xs font-bold ${isActive ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-500'}`}>{action.label}</span>
                            <div className={`w-5 h-5 rounded flex items-center justify-center border ${isActive ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                                {isActive && <CheckCircle2 size={12}/>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}