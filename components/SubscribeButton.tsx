'use client';

import { useState } from 'react';

export default function SubscribeButton() {
  const [loading, setLoading] = useState(false);

  const startCheckout = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/create-checkout-session', { method: 'POST' });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        alert('Checkout failed to start.');
        console.error('No checkout URL returned:', data);
      }
    } catch (e) {
      console.error(e);
      alert('Checkout failed to start.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={startCheckout}
      disabled={loading}
      className="rounded-lg bg-yellow-400 px-6 py-3 font-semibold text-black hover:bg-yellow-300 disabled:opacity-60"
    >
      {loading ? 'Redirecting…' : 'Start Free Trial'}
    </button>
  );
}
