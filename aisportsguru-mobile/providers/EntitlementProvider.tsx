import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import Purchases, { CustomerInfo, PurchasesStoreProduct } from "react-native-purchases";

type EntitlementCtx = {
  isReady: boolean;
  isPro: boolean;
  loading: boolean;
  error: string | null;
  monthly: PurchasesStoreProduct | null;
  yearly: PurchasesStoreProduct | null;
  purchaseMonthly: () => Promise<void>;
  purchaseYearly: () => Promise<void>;
  restore: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<EntitlementCtx | null>(null);

const ENTITLEMENT_ID = "pro";
const FALLBACK_MONTHLY = "com.aisportsguru.pro.monthly";
const FALLBACK_YEARLY  = "com.aisportsguru.pro.yearly";

export function EntitlementProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthly, setMonthly] = useState<PurchasesStoreProduct | null>(null);
  const [yearly, setYearly] = useState<PurchasesStoreProduct | null>(null);
  const configured = useRef(false);

  useEffect(() => {
    (async () => {
      if (configured.current) return;
      configured.current = true;
      try {
        const apiKey = process.env.EXPO_PUBLIC_RC_API_KEY_IOS || "";
        await Purchases.configure({ apiKey });
        Purchases.setDebugLogsEnabled(true);

        Purchases.addCustomerInfoUpdateListener((ci: CustomerInfo) => {
          const pro = Boolean(ci.entitlements.active[ENTITLEMENT_ID]);
          console.log("[RC] customerInfo update, pro =", pro);
          setIsPro(pro);
        });

        await refreshProducts();
        await refreshEntitlement();
      } catch (e: any) {
        console.log("[RC] configure error", e);
        setError(e?.message ?? "Failed to configure purchases");
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  async function refreshProducts() {
    try {
      setError(null);
      console.log("[RC] refreshProducts()");
      const offerings = await Purchases.getOfferings();

      if (offerings.current && offerings.current.availablePackages.length > 0) {
        const m =
          offerings.current.availablePackages.find(p => p.packageType === "MONTHLY")?.product ??
          offerings.current.availablePackages[0]?.product ?? null;
        const y =
          offerings.current.availablePackages.find(p => p.packageType === "ANNUAL")?.product ??
          offerings.current.availablePackages.find(p => p.packageType !== "MONTHLY")?.product ??
          offerings.current.availablePackages[0]?.product ?? null;

        console.log("[RC] offerings products:", { monthly: m?.identifier, yearly: y?.identifier });
        setMonthly(m);
        setYearly(y);
      } else {
        const prods = await Purchases.getProducts([FALLBACK_MONTHLY, FALLBACK_YEARLY]);
        const m = prods.find(p => p.identifier === FALLBACK_MONTHLY) ?? null;
        const y = prods.find(p => p.identifier === FALLBACK_YEARLY) ?? null;
        console.log("[RC] fallback products:", { monthly: m?.identifier, yearly: y?.identifier });
        setMonthly(m);
        setYearly(y);
      }
    } catch (e: any) {
      console.log("[RC] refreshProducts error", e);
      setError(e?.message ?? "Failed to load products");
    }
  }

  async function refreshEntitlement() {
    try {
      const ci = await Purchases.getCustomerInfo();
      const pro = Boolean(ci.entitlements.active[ENTITLEMENT_ID]);
      console.log("[RC] refreshEntitlement pro =", pro);
      setIsPro(pro);
    } catch {}
  }

  async function purchaseStoreProductOrId(product: PurchasesStoreProduct | null, fallbackId: string) {
    setLoading(true);
    setError(null);
    try {
      let item = product;
      if (!item) {
        const prods = await Purchases.getProducts([fallbackId]);
        item = prods.find(p => p.identifier === fallbackId) ?? null;
        console.log("[RC] hydrated product by id:", item?.identifier);
      }
      if (item) {
        console.log("[RC] purchaseStoreProduct:", item.identifier);
        const { customerInfo } = await Purchases.purchaseStoreProduct(item);
        const pro = Boolean(customerInfo.entitlements.active[ENTITLEMENT_ID]);
        console.log("[RC] purchase result, pro =", pro);
        setIsPro(pro);
      } else {
        console.log("[RC] product missing, purchasing by id:", fallbackId);
        const { customerInfo } = await Purchases.purchaseProduct(fallbackId);
        const pro = Boolean(customerInfo.entitlements.active[ENTITLEMENT_ID]);
        setIsPro(pro);
      }
    } catch (e: any) {
      console.log("[RC] purchase error", e);
      if (e?.userCancelled) setError("Purchase cancelled");
      else setError(e?.message ?? "Purchase failed");
    } finally {
      setLoading(false);
    }
  }

  const purchaseMonthly = () => purchaseStoreProductOrId(monthly, FALLBACK_MONTHLY);
  const purchaseYearly  = () => purchaseStoreProductOrId(yearly,  FALLBACK_YEARLY);

  const restore = async () => {
    setLoading(true);
    setError(null);
    try {
      const ci = await Purchases.restorePurchases();
      const pro = Boolean(ci.entitlements.active[ENTITLEMENT_ID]);
      setIsPro(pro);
    } catch (e: any) {
      setError(e?.message ?? "Restore failed");
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await Promise.all([refreshProducts(), refreshEntitlement()]);
  };

  const value = useMemo(() => ({
    isReady, isPro, loading, error, monthly, yearly,
    purchaseMonthly, purchaseYearly, restore, refresh
  }), [isReady, isPro, loading, error, monthly, yearly]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEntitlement() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useEntitlement must be used within EntitlementProvider");
  return ctx;
}
