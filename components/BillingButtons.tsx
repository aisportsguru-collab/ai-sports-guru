"use client";

import { useState } from "react";

export default function BillingButtons({
  userId,
  email,
  priceId, // optional if NEXT_PUBLIC_DEFAULT_PRICE_ID is set
}: {
  userId: string;
  email?: string;
  priceId?: string;
}) {
  const [loadingCheckout, setLC] = useState(false);
  const [loadingPortal, setLP] = useState(false);

  async function startCheckout() {
    try {
      setLC(true);
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email, priceId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Checkout failed");
      window.location.href = json.url;
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLC(false);
    }
  }

  async function openPortal() {
    try {
      setLP(true);
      const res = await fetch("/api/stripe/create-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Portal failed");
      window.location.href = json.url;
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLP(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 12 }}>
      <button
        onClick={startCheckout}
        disabled={loadingCheckout}
        className="px-4 py-2 rounded bg-black text-white"
      >
        {loadingCheckout ? "Loading…" : "Subscribe"}
      </button>
      <button
        onClick={openPortal}
        disabled={loadingPortal}
        className="px-4 py-2 rounded border"
      >
        {loadingPortal ? "Loading…" : "Manage billing"}
      </button>
    </div>
  );
}
