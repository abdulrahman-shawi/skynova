import { create } from 'zustand';

interface OrderState {
  grandTotal: number;
  amountCash: number;
  setGrandTotal: (val: number) => void;
  setAmountCash: (val: string | number) => void;
  resetOrder: () => void; // إضافة تعريف الدالة هنا
}

export const useOrderStore = create<OrderState>((set) => ({
  grandTotal: 0,
  amountCash: 0,
  
  setGrandTotal: (val) => set({ grandTotal: val }),
  
  setAmountCash: (val) => set({ amountCash: Number(val) }),

  // الدالة التي تقوم بحذف القيم وإعادتها للصفر
  resetOrder: () => set({ 
    grandTotal: 0, 
    amountCash: 0 
  }),
}));