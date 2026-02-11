// components/SalesChart.tsx
"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function SalesChart({ data }: { data: any[] }) {
  // تحويل البيانات لتناسب Recharts
  const chartData = data.map(item => ({
    name: item.status,
    total: item._sum.finalAmount || 0
  }));

  return (
    <div className="h-[300px] w-full">
      <h2 className="mb-4 font-semibold">توزيع المبيعات حسب الحالة</h2>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}