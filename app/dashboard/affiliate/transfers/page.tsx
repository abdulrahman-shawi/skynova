'use client';

import * as React from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { AppModal } from '@/components/ui/app-modal';
import {
  deleteAffiliateWalletTransferByAdmin,
  getAffiliateWalletTransfersAdminList,
  updateAffiliateWalletTransferByAdmin,
} from '@/server/affiliate';

type WalletTransferStatus = 'PENDING' | 'RECEIVED';

type TransferUser = {
  id: string;
  username: string;
  email: string;
  affiliateApproved?: boolean;
};

type TransferRow = {
  id: string;
  userId: string;
  amount: number;
  status: WalletTransferStatus;
  reference?: string | null;
  notes?: string | null;
  transferredAt: string | Date;
  receivedAt?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  user: TransferUser;
};

type TransferPayload = {
  summary: {
    total: number;
    pending: number;
    received: number;
    totalAmount: number;
  };
  users: TransferUser[];
  transfers: TransferRow[];
};

type EditFormState = {
  id: string;
  userId: string;
  amount: string;
  status: WalletTransferStatus;
  reference: string;
  notes: string;
  transferredAt: string;
  receivedAt: string;
};

const emptyPayload: TransferPayload = {
  summary: {
    total: 0,
    pending: 0,
    received: 0,
    totalAmount: 0,
  },
  users: [],
  transfers: [],
};

function formatMoney(value?: number | null) {
  return Number(value || 0).toFixed(2);
}

function formatDateTime(value?: string | Date | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('ar');
}

function toDateTimeLocalValue(value?: string | Date | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function buildEditState(transfer: TransferRow): EditFormState {
  return {
    id: String(transfer.id),
    userId: String(transfer.userId),
    amount: String(Number(transfer.amount || 0)),
    status: transfer.status === 'RECEIVED' ? 'RECEIVED' : 'PENDING',
    reference: String(transfer.reference || ''),
    notes: String(transfer.notes || ''),
    transferredAt: toDateTimeLocalValue(transfer.transferredAt),
    receivedAt: toDateTimeLocalValue(transfer.receivedAt),
  };
}

export default function AffiliateWalletTransfersPage() {
  const [payload, setPayload] = React.useState<TransferPayload>(emptyPayload);
  const [loading, setLoading] = React.useState(true);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editForm, setEditForm] = React.useState<EditFormState | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAffiliateWalletTransfersAdminList();
      if (!result.success || !result.data) {
        toast.error(result.error || 'تعذر تحميل تحويلات المحفظة');
        setPayload(emptyPayload);
        return;
      }

      setPayload(result.data as TransferPayload);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleOpenEdit = (transfer: TransferRow) => {
    setEditForm(buildEditState(transfer));
    setIsEditOpen(true);
  };

  const handleCloseEdit = () => {
    if (saving) return;
    setIsEditOpen(false);
    setEditForm(null);
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editForm) return;

    const amount = Number(editForm.amount || 0);
    if (!editForm.userId) {
      toast.error('يرجى اختيار مستخدم أفلييت');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('قيمة التحويل يجب أن تكون أكبر من صفر');
      return;
    }

    if (!editForm.transferredAt) {
      toast.error('يرجى إدخال تاريخ التحويل');
      return;
    }

    if (editForm.status === 'RECEIVED' && !editForm.receivedAt) {
      toast.error('يرجى إدخال تاريخ الاستلام عند اعتماد التحويلة كمستلمة');
      return;
    }

    setSaving(true);
    const loadingToast = toast.loading('جاري تحديث التحويلة...');

    try {
      const result = await updateAffiliateWalletTransferByAdmin({
        id: editForm.id,
        userId: editForm.userId,
        amount,
        status: editForm.status,
        reference: editForm.reference,
        notes: editForm.notes,
        transferredAt: editForm.transferredAt,
        receivedAt: editForm.status === 'RECEIVED' ? editForm.receivedAt : null,
      });

      if (!result.success) {
        toast.error(result.error || 'تعذر تحديث التحويلة');
        return;
      }

      toast.success('تم تحديث التحويلة بنجاح');
      handleCloseEdit();
      await loadData();
    } finally {
      setSaving(false);
      toast.dismiss(loadingToast);
    }
  };

  const handleDelete = async (transferId: string) => {
    const confirmed = window.confirm('هل أنت متأكد من حذف هذه التحويلة؟');
    if (!confirmed) return;

    setDeletingId(transferId);
    const loadingToast = toast.loading('جاري حذف التحويلة...');

    try {
      const result = await deleteAffiliateWalletTransferByAdmin(transferId);
      if (!result.success) {
        toast.error(result.error || 'تعذر حذف التحويلة');
        return;
      }

      toast.success('تم حذف التحويلة بنجاح');
      await loadData();
    } finally {
      setDeletingId(null);
      toast.dismiss(loadingToast);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">تحويلات محفظة الأفلييت</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">مراجعة جميع التحويلات المسجلة مع إمكانية تعديلها أو حذفها.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/affiliate"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              لوحة الأفلييت
            </Link>
            <Link
              href="/dashboard/affiliate/users"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              مستخدمو الأفلييت
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي التحويلات</div>
            <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{payload.summary.total}</div>
          </div>
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
            <div className="text-xs font-bold text-amber-700 dark:text-amber-300">تحويلات معلقة</div>
            <div className="mt-2 text-3xl font-black text-amber-800 dark:text-amber-200">{payload.summary.pending}</div>
          </div>
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">تحويلات مستلمة</div>
            <div className="mt-2 text-3xl font-black text-emerald-800 dark:text-emerald-200">{payload.summary.received}</div>
          </div>
          <div className="rounded-3xl border border-sky-200 bg-sky-50 p-5 shadow-sm dark:border-sky-900/40 dark:bg-sky-950/20">
            <div className="text-xs font-bold text-sky-700 dark:text-sky-300">إجمالي المبالغ</div>
            <div className="mt-2 text-3xl font-black text-sky-800 dark:text-sky-200">{formatMoney(payload.summary.totalAmount)}</div>
          </div>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">جدول التحويلات</h2>
            {loading ? <span className="text-sm text-slate-500 dark:text-slate-400">جاري التحميل...</span> : null}
          </div>

          {payload.transfers.length === 0 && !loading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">لا توجد تحويلات محفظة مسجلة حتى الآن.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="min-w-full text-right text-sm">
                <thead className="bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                  <tr>
                    <th className="px-3 py-3">المستخدم</th>
                    <th className="px-3 py-3">المبلغ</th>
                    <th className="px-3 py-3">الحالة</th>
                    <th className="px-3 py-3">المرجع</th>
                    <th className="px-3 py-3">تاريخ التحويل</th>
                    <th className="px-3 py-3">تاريخ الاستلام</th>
                    <th className="px-3 py-3">الملاحظات</th>
                    <th className="px-3 py-3">الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.transfers.map((transfer) => (
                    <tr key={transfer.id} className="border-t border-slate-100 dark:border-slate-800/80">
                      <td className="px-3 py-4">
                        <div className="font-black text-slate-900 dark:text-white">{transfer.user?.username || '-'}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{transfer.user?.email || '-'}</div>
                      </td>
                      <td className="px-3 py-4 font-bold text-sky-700 dark:text-sky-300">{formatMoney(transfer.amount)}</td>
                      <td className="px-3 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${transfer.status === 'RECEIVED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'}`}>
                          {transfer.status === 'RECEIVED' ? 'مستلمة' : 'معلقة'}
                        </span>
                      </td>
                      <td className="px-3 py-4 font-mono text-xs text-slate-600 dark:text-slate-300">{transfer.reference || '-'}</td>
                      <td className="px-3 py-4">{formatDateTime(transfer.transferredAt)}</td>
                      <td className="px-3 py-4">{formatDateTime(transfer.receivedAt)}</td>
                      <td className="max-w-xs px-3 py-4 text-xs text-slate-600 dark:text-slate-300">{transfer.notes || '-'}</td>
                      <td className="px-3 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(transfer)}
                            className="rounded-xl border border-sky-200 px-3 py-2 text-xs font-bold text-sky-700 hover:bg-sky-50 dark:border-sky-900/50 dark:text-sky-300 dark:hover:bg-sky-950/30"
                          >
                            تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(String(transfer.id))}
                            disabled={deletingId === String(transfer.id)}
                            className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-950/30"
                          >
                            {deletingId === String(transfer.id) ? 'جار الحذف...' : 'حذف'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <AppModal title="تعديل تحويلة المحفظة" isOpen={isEditOpen} onClose={handleCloseEdit}>
        {editForm ? (
          <form onSubmit={handleSave} className="grid gap-4 p-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">المستخدم</label>
                <select
                  value={editForm.userId}
                  onChange={(event) => setEditForm((current) => current ? { ...current, userId: event.target.value } : current)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="">اختر المستخدم</option>
                  {payload.users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username} - {user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">المبلغ</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(event) => setEditForm((current) => current ? { ...current, amount: event.target.value } : current)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">الحالة</label>
                <select
                  value={editForm.status}
                  onChange={(event) => {
                    const nextStatus = event.target.value === 'RECEIVED' ? 'RECEIVED' : 'PENDING';
                    setEditForm((current) => current ? {
                      ...current,
                      status: nextStatus,
                      receivedAt: nextStatus === 'RECEIVED' ? current.receivedAt || current.transferredAt : '',
                    } : current);
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="PENDING">معلقة</option>
                  <option value="RECEIVED">مستلمة</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">المرجع</label>
                <input
                  type="text"
                  value={editForm.reference}
                  onChange={(event) => setEditForm((current) => current ? { ...current, reference: event.target.value } : current)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">تاريخ التحويل</label>
                <input
                  type="datetime-local"
                  value={editForm.transferredAt}
                  onChange={(event) => setEditForm((current) => current ? { ...current, transferredAt: event.target.value } : current)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">تاريخ الاستلام</label>
                <input
                  type="datetime-local"
                  value={editForm.receivedAt}
                  disabled={editForm.status !== 'RECEIVED'}
                  onChange={(event) => setEditForm((current) => current ? { ...current, receivedAt: event.target.value } : current)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">الملاحظات</label>
              <textarea
                rows={4}
                value={editForm.notes}
                onChange={(event) => setEditForm((current) => current ? { ...current, notes: event.target.value } : current)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCloseEdit}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900"
              >
                {saving ? 'جار الحفظ...' : 'حفظ التعديلات'}
              </button>
            </div>
          </form>
        ) : null}
      </AppModal>
    </>
  );
}