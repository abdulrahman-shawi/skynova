"use client"
import React from "react";

export default function AssignUserModal({ customer, allUsers, onSave }: { customer: any, allUsers: any, onSave: any }) {
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