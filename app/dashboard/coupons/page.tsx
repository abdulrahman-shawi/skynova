'use client';

import * as React from 'react';
import { z } from 'zod';
import { Controller } from 'react-hook-form';
import { Edit, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { DynamicForm } from '@/components/shared/dynamic-form';
import { DataTable } from '@/components/shared/DataTable';
import { AppModal } from '@/components/ui/app-modal';
import { Button } from '@/components/ui/button';
import { FormCheckbox } from '@/components/ui/formcheck';
import { FormInput } from '@/components/ui/form-input';
import { FormSelect } from '@/components/ui/select-form';
import { useAuth } from '@/context/AuthContext';
import { isAdmin } from '@/lib/utils';
import {
  createCoupon,
  deleteCoupon,
  getCoupons,
  updateCoupon,
} from '@/server/coupon';

const couponSchema = z.object({
  name: z.string().min(1, 'اسم الكوبون مطلوب'),
  code: z.string().min(1, 'كود الكوبون مطلوب'),
  discountType: z.enum(['PERCENTAGE', 'FIXED']).default('PERCENTAGE'),
  discountValue: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : Number(value)),
    z.number({ message: 'قيمة الخصم مطلوبة' }).positive('قيمة الخصم يجب أن تكون أكبر من صفر'),
  ),
  usageLimit: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : Number(value)),
    z.number({ message: 'عدد مرات الاستخدام مطلوب' }).int('يجب أن يكون رقماً صحيحاً').min(1, 'يجب أن يكون أكبر من صفر'),
  ),
  isActive: z.boolean().default(true),
});

type CouponFormValues = z.infer<typeof couponSchema>;

interface CouponFormFieldsProps {
  control: any;
  register: any;
  watch: any;
  errors: any;
}

const PAGE_SIZE = 10;

function CouponFormFields({ control, register, watch, errors }: CouponFormFieldsProps) {
  const discountType = watch('discountType');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormInput
        label="اسم الكوبون"
        {...register('name')}
        error={errors.name?.message as string}
      />

      <FormInput
        label="كود الكوبون"
        {...register('code')}
        error={errors.code?.message as string}
      />

      <Controller
        name="discountType"
        control={control}
        render={({ field }) => (
          <FormSelect
            label="نوع الخصم"
            value={field.value}
            onChange={field.onChange}
            options={[
              { label: 'نسبة مئوية', value: 'PERCENTAGE' },
              { label: 'مبلغ ثابت', value: 'FIXED' },
            ]}
            error={errors.discountType?.message as string}
          />
        )}
      />

      <FormInput
        type="number"
        step="0.01"
        label={discountType === 'PERCENTAGE' ? 'قيمة الخصم (%)' : 'قيمة الخصم (مبلغ)'}
        {...register('discountValue')}
        error={errors.discountValue?.message as string}
      />

      <FormInput
        type="number"
        label="عدد مرات الاستخدام"
        {...register('usageLimit')}
        error={errors.usageLimit?.message as string}
      />

      <div className="flex items-end">
        <Controller
          name="isActive"
          control={control}
          render={({ field }) => (
            <FormCheckbox
              label="تفعيل الكوبون"
              description="تعطيل الكوبون يمنع استخدامه دون حذفه"
              checked={field.value}
              onChange={(e) => field.onChange(e.target.checked)}
            />
          )}
        />
      </div>
    </div>
  );
}

export default function CouponsPage() {
  const { user } = useAuth();
  const isUserAdmin = Boolean(user && isAdmin(user));

  const [rows, setRows] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isOpen, setIsOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState<CouponFormValues | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await getCoupons();
      if (res.success) {
        setRows(res.data || []);
      } else {
        toast.error((res as any).error || 'فشل في جلب الكوبونات');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setEditId(null);
    setFormData(null);
  };

  const handleAdd = () => {
    setEditId(null);
    setFormData({
      name: '',
      code: '',
      discountType: 'PERCENTAGE',
      discountValue: undefined as unknown as number,
      usageLimit: undefined as unknown as number,
      isActive: true,
    });
    setIsOpen(true);
  };

  const handleEdit = (row: any) => {
    setEditId(row.id);
    setFormData({
      name: row.name,
      code: row.code,
      discountType: row.discountType,
      discountValue: row.discountValue,
      usageLimit: row.usageLimit,
      isActive: row.isActive,
    });
    setIsOpen(true);
  };

  const handleDelete = async (row: any) => {
    if (!window.confirm('هل أنت متأكد من حذف الكوبون؟')) return;

    const loadingToast = toast.loading('جاري حذف الكوبون...');
    try {
      const res = await deleteCoupon(row.id);
      if (res.success) {
        toast.success('تم حذف الكوبون بنجاح');
      } else {
        toast.error((res as any).error || 'فشل في حذف الكوبون');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء حذف الكوبون');
    } finally {
      toast.dismiss(loadingToast);
      loadData();
    }
  };

  const onSubmit = async (data: CouponFormValues) => {
    const loadingToast = toast.loading(editId ? 'جاري تحديث الكوبون...' : 'جاري إنشاء الكوبون...');
    try {
      const payload = new FormData();
      payload.append('name', data.name);
      payload.append('code', data.code);
      payload.append('discountType', data.discountType);
      payload.append('discountValue', String(data.discountValue));
      payload.append('usageLimit', String(data.usageLimit));
      payload.append('isActive', data.isActive ? 'true' : 'false');

      const res = editId ? await updateCoupon(editId, payload) : await createCoupon(payload);

      if (res.success) {
        toast.success(editId ? 'تم تحديث الكوبون بنجاح' : 'تم إنشاء الكوبون بنجاح');
        handleClose();
      } else {
        toast.error((res as any).error || 'فشل في حفظ الكوبون');
      }
    } catch (error) {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      toast.dismiss(loadingToast);
      loadData();
    }
  };

  if (!isUserAdmin) {
    return (
      <div className="p-4" dir="rtl">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">الكوبونات</h1>
        <p className="mt-4 text-sm text-slate-500">لا تملك صلاحية عرض هذه الصفحة.</p>
      </div>
    );
  }

  const columns = [
    {
      header: 'اسم الكوبون',
      accessor: (row: any) => <span className="font-semibold">{row.name}</span>,
    },
    {
      header: 'الكود',
      accessor: (row: any) => (
        <span className="font-mono text-sm bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
          {row.code}
        </span>
      ),
    },
    {
      header: 'الخصم',
      accessor: (row: any) => (
        <div>
          <p className="text-sm font-medium">{row.discountType === 'PERCENTAGE' ? 'نسبة مئوية' : 'مبلغ ثابت'}</p>
          <p className="text-xs text-slate-500">
            القيمة: {row.discountValue}{row.discountType === 'PERCENTAGE' ? '%' : ''}
          </p>
        </div>
      ),
    },
    {
      header: 'الاستخدام',
      accessor: (row: any) => (
        <div className="text-xs text-slate-600 dark:text-slate-300">
          <p>الحد: {row.usageLimit}</p>
          <p>المستخدم: {row.usedCount ?? 0}</p>
        </div>
      ),
    },
    {
      header: 'الحالة',
      accessor: (row: any) => (
        <span className={row.isActive ? 'text-green-600 text-sm font-semibold' : 'text-slate-500 text-sm'}>
          {row.isActive ? 'نشط' : 'معطل'}
        </span>
      ),
    },
  ];

  const actions = [
    { label: 'تعديل', icon: <Edit size={16} />, onClick: handleEdit },
    { label: 'حذف', icon: <Trash2 size={16} />, onClick: handleDelete, variant: 'danger' as const },
  ];

  return (
    <div className="p-4" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">الكوبونات</h1>
          <p className="text-sm text-slate-500 mt-1">إدارة كوبونات الخصم وتحديد قيمة الخصم وعدد مرات الاستخدام</p>
        </div>
        <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-6">
          <Plus size={16} className="ml-2" />
          إضافة كوبون
        </Button>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        actions={actions}
        isLoading={isLoading}
        totalCount={rows.length}
        pageSize={PAGE_SIZE}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />

      <AppModal
        title={editId ? 'تعديل الكوبون' : 'إضافة كوبون جديد'}
        isOpen={isOpen}
        onClose={handleClose}
        size="xl"
      >
        <div className="p-2">
          <DynamicForm
            schema={couponSchema}
            onSubmit={onSubmit}
            defaultValues={formData || undefined}
            submitLabel={editId ? 'تحديث الكوبون' : 'إنشاء الكوبون'}
          >
            {({ register, control, watch, formState: { errors } }) => (
              <CouponFormFields
                control={control}
                register={register}
                watch={watch}
                errors={errors}
              />
            )}
          </DynamicForm>
        </div>
      </AppModal>
    </div>
  );
}
