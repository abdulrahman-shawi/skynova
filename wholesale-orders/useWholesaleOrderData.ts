import React from 'react';
import {
  getWholesaleOrders,
  getWholesaleCustomerList,
  getWholesaleProductCatalog,
} from '@/server/wholesale-order';
import { getshipping } from '@/server/shipping';

interface User {
  id: string;
  username?: string;
  name?: string;
}

export const useWholesaleOrderData = (user?: User) => {
  const [products, setProducts] = React.useState<any[]>([]);
  const [customers, setCustomers] = React.useState<any[]>([]);
  const [orders, setOrders] = React.useState<any[]>([]);
  const [shippingCompanies, setShippingCompanies] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSupportingDataLoading, setIsSupportingDataLoading] = React.useState(false);
  const supportingDataPromiseRef = React.useRef<Promise<void> | null>(null);

  const refreshOrders = async () => {
    setIsLoading(true);
    try {
      const ordersRes = await getWholesaleOrders();
      setOrders(ordersRes?.success ? (ordersRes.data || []) : []);
    } catch (error) {
      console.error("Error refreshing wholesale orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = async () => {
    await refreshOrders();
  };

  const refreshCustomers = async () => {
    try {
      const customersRes = await getWholesaleCustomerList();
      setCustomers(customersRes?.success ? (customersRes.data || []) : []);
    } catch (error) {
      console.error("Error refreshing wholesale customers:", error);
    }
  };

  const refreshShippingCompanies = async () => {
    try {
      const shippingRes = await getshipping();
      setShippingCompanies(shippingRes?.success ? (Array.isArray(shippingRes.data) ? shippingRes.data : []) : []);
    } catch (error) {
      console.error("Error refreshing shipping companies:", error);
    }
  };

  const refreshProducts = async () => {
    try {
      const productsRes = await getWholesaleProductCatalog();
      setProducts(productsRes?.success ? (Array.isArray(productsRes.data) ? productsRes.data : []) : []);
    } catch (error) {
      console.error("Error refreshing wholesale products:", error);
    }
  };

  const ensureSupportingDataLoaded = async () => {
    const hasProducts = products.length > 0;
    const hasCustomers = customers.length > 0;
    const hasShippingCompanies = shippingCompanies.length > 0;

    if (hasProducts && hasCustomers && hasShippingCompanies) {
      return;
    }

    if (supportingDataPromiseRef.current) {
      return supportingDataPromiseRef.current;
    }

    setIsSupportingDataLoading(true);

    supportingDataPromiseRef.current = (async () => {
      try {
        const [productsData, customersRes, shippingRes] = await Promise.all([
          hasProducts ? Promise.resolve(products) : getWholesaleProductCatalog(),
          hasCustomers ? Promise.resolve({ success: true, data: customers }) : getWholesaleCustomerList(),
          hasShippingCompanies ? Promise.resolve({ success: true, data: shippingCompanies }) : getshipping(),
        ]);

        if (!hasProducts) {
          setProducts(productsData?.success ? (Array.isArray(productsData.data) ? productsData.data : []) : []);
        }

        if (!hasCustomers) {
          setCustomers(customersRes?.success ? (customersRes.data || []) : []);
        }

        if (!hasShippingCompanies) {
          setShippingCompanies(shippingRes?.success ? (Array.isArray(shippingRes.data) ? shippingRes.data : []) : []);
        }
      } finally {
        supportingDataPromiseRef.current = null;
        setIsSupportingDataLoading(false);
      }
    })();

    return supportingDataPromiseRef.current;
  };

  React.useEffect(() => {
    loadData();
  }, []);

  React.useEffect(() => {
    refreshShippingCompanies();
  }, []);

  return {
    products,
    setProducts,
    customers,
    setCustomers,
    orders,
    setOrders,
    shippingCompanies,
    setShippingCompanies,
    isLoading,
    isSupportingDataLoading,
    loadData,
    refreshOrders,
    refreshCustomers,
    refreshShippingCompanies,
    refreshProducts,
    ensureSupportingDataLoaded,
  };
};
