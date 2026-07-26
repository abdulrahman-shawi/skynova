import React from 'react';
import {
  getWholesaleOrders,
  getWholesaleCustomerList,
  getWholesaleProductCatalog,
} from '@/server/wholesale-order';
import { getshipping } from '@/server/shipping';
import { getAllowedWarehouses } from '@/server/warehouse';

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
  const [warehouses, setWarehouses] = React.useState<any[]>([]);
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

  const refreshWarehouses = async () => {
    try {
      const warehousesRes = await getAllowedWarehouses();
      setWarehouses(Array.isArray(warehousesRes) ? warehousesRes : []);
    } catch (error) {
      console.error("Error refreshing warehouses:", error);
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
    const hasWarehouses = warehouses.length > 0;

    if (hasProducts && hasCustomers && hasShippingCompanies && hasWarehouses) {
      return true;
    }

    if (supportingDataPromiseRef.current) {
      await supportingDataPromiseRef.current;
      return true;
    }

    setIsSupportingDataLoading(true);

    supportingDataPromiseRef.current = (async () => {
      try {
        const productsData = hasProducts
          ? { success: true, data: products }
          : await getWholesaleProductCatalog();
        const customersRes = hasCustomers
          ? { success: true, data: customers }
          : await getWholesaleCustomerList();
        const shippingRes = hasShippingCompanies
          ? { success: true, data: shippingCompanies }
          : await getshipping();
        const warehousesRes = hasWarehouses
          ? warehouses
          : await getAllowedWarehouses();

        if (!hasProducts) {
          setProducts(productsData?.success ? (Array.isArray(productsData.data) ? productsData.data : []) : []);
        }

        if (!hasCustomers) {
          setCustomers(customersRes?.success ? (customersRes.data || []) : []);
        }

        if (!hasShippingCompanies) {
          setShippingCompanies(shippingRes?.success ? (Array.isArray(shippingRes.data) ? shippingRes.data : []) : []);
        }

        if (!hasWarehouses) {
          setWarehouses(Array.isArray(warehousesRes) ? warehousesRes : []);
        }
      } finally {
        supportingDataPromiseRef.current = null;
        setIsSupportingDataLoading(false);
      }
    })();

    await supportingDataPromiseRef.current;
    return true;
  };

  React.useEffect(() => {
    loadData();
  }, []);

  React.useEffect(() => {
    refreshWarehouses();
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
    warehouses,
    setWarehouses,
    isLoading,
    isSupportingDataLoading,
    loadData,
    refreshOrders,
    refreshCustomers,
    refreshShippingCompanies,
    refreshWarehouses,
    refreshProducts,
    ensureSupportingDataLoaded,
  };
};
