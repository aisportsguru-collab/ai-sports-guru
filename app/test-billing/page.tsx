import BillingButtons from "@/components/BillingButtons";

export default function Page() {
  const userId = "3de1f3d5-cc7e-4c6c-92ab-5e52c47b7137";
  const email = "aisportsguru@gmail.com";
  // If you set NEXT_PUBLIC_DEFAULT_PRICE_ID in .env.local, you can omit priceId.
  // const priceId = process.env.NEXT_PUBLIC_DEFAULT_PRICE_ID;

  return (
    <main style={{ padding: 24 }}>
      <h1>Test Billing</h1>
      <p>Use these buttons to test Checkout and the Billing Portal.</p>
      <div style={{ marginTop: 16 }}>
        <BillingButtons userId={userId} email={email} />
        {/* Or: <BillingButtons userId={userId} email={email} priceId={priceId} /> */}
      </div>
    </main>
  );
}
