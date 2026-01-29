'use client';
import { DynamicForm } from '@/components/shared/dynamic-form';
import { FormInput } from '@/components/ui/form-input';
import { useAuth } from '@/context/AuthContext';
import { User } from '@/lib/type';
import { getalluser, login } from '@/server/user';
import { u } from 'framer-motion/client';

import * as React from 'react';
import z from 'zod';

interface ILogInProps {
}

const logInSchema = z.object({
  name: z.string().min(3, "الاسم يجب أن يكون 3 أحرف على الأقل"),
  password: z.string().min(5, "كلمة المرور يجب أن تكون 5 أحرف على الأقل"),
});

const handlwsubmit = async (data: z.infer<typeof logInSchema>) => {
  try {
    const user = await login(data);
    if (user) {
      console.log("تم تسجيل الدخول بنجاح:", user);
    } else {
      console.log("فشل تسجيل الدخول: اسم المستخدم أو كلمة المرور غير صحيحة.");
    }
  } catch (err) {
    console.log("error", err);
  }
}

const LogIn: React.FunctionComponent<ILogInProps> = (props) => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Log In</h1>
        <DynamicForm
        schema={logInSchema}
        onSubmit={handlwsubmit}
        >
          {({ register, formState: { errors } }) => (
          <div className="grid gap-4 py-4">
            <FormInput
              label="اسم المستخدم"
              {...register("name")}
              error={typeof errors.name?.message === "string" ? errors.name.message : undefined}
            />
            <FormInput
              label="كلمة المرور"
              placeholder="أكتب وصف القسم"
              {...register("password")}
              error={typeof errors.password?.message === "string" ? errors.password.message : undefined}
            />
          </div>
        )}
        </DynamicForm>
        {user && (<div className="mt-4 p-4 bg-green-100 text-green-800 rounded">
          مرحباً، {user.accountType}!
        </div>
        )}
      </div>
    </div>
  );
};

export default LogIn;
