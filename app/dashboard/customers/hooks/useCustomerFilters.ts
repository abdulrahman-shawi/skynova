import * as React from "react";

// فلترة تاريخ الإنشاء أصبحت على الخادم (getCustomerList)، وهنا نفلتر فقط البحث والحالة والجنس
const normalizeStatus = (value: unknown) =>
  String(value ?? "")
    .replace(/[ً-ٰٟ]/g, "")
    .replace(/ـ/g, "")
    .replace(/[‎‏‪-‮]/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();

export function useCustomerFilters(
  customers: any[],
  search: string,
  dateFilter: string,
  genderFilter: string
) {
  return React.useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();

    return customers.filter((customer: any) => {
      const hasAssignedUserMatch = Array.isArray(customer.users)
        ? customer.users.some((assignedUser: any) => {
            const username = String(assignedUser?.username ?? "").toLowerCase();
            const name = String(assignedUser?.name ?? "").toLowerCase();
            const email = String(assignedUser?.email ?? "").toLowerCase();
            return (
              username.includes(normalizedSearch) ||
              name.includes(normalizedSearch) ||
              email.includes(normalizedSearch)
            );
          })
        : false;

      const matchesSearch =
        customer.name?.toLowerCase().includes(normalizedSearch) ||
        customer.countryCode?.toLowerCase().includes(normalizedSearch) ||
        customer.phone?.some((phone: any) => String(phone ?? "").toLowerCase().includes(normalizedSearch)) ||
        customer.city?.toLowerCase().includes(normalizedSearch) ||
        customer.country?.toLowerCase().includes(normalizedSearch) ||
        hasAssignedUserMatch;

      const selectedStatus = normalizeStatus(dateFilter);
      const currentStatus = normalizeStatus(customer?.status);
      const matchesStatus = selectedStatus !== normalizeStatus("الكل")
        ? currentStatus === selectedStatus
        : true;

      const selectedGender = normalizeStatus(genderFilter);
      const currentGender = normalizeStatus(customer?.gender);
      const matchesGender = selectedGender !== normalizeStatus("الكل")
        ? currentGender === selectedGender
        : true;

      return matchesSearch && matchesStatus && matchesGender;
    });
  }, [customers, search, dateFilter, genderFilter]);
}
