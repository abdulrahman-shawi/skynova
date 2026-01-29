// app/dashboard/permissions/page.tsx
import { GetRoles } from "@/server/permissions";
import PermissionsPage from "./permissionPage";

export default async function Page() {
    // جلب البيانات من السيرفر قبل تحميل الصفحة
    const roles = await GetRoles();

    return (
        <PermissionsPage initialRoles={roles} />
    );
}