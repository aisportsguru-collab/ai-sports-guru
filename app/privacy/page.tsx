export const metadata = {
  title: "Privacy Policy – AI Sports Guru",
  description:
    "Details on how AI Sports Guru collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 space-y-6">
      <h1 className="text-3xl font-bold text-secondary">Privacy Policy</h1>
      <p className="text-gray-700">
        At AI Sports Guru, your privacy is important to us. This policy outlines
        how we handle your data.
      </p>
      <ul className="list-disc list-inside text-gray-700 space-y-2">
        <li>
          We collect only essential information such as your email address for
          authentication purposes.
        </li>
        <li>
          Your data is stored securely using Supabase and never shared or sold
          to third parties.
        </li>
        <li>
          We use Stripe to handle all payments. We do not store or access your
          payment information.
        </li>
        <li>
          Usage data such as site visits and feature usage may be tracked
          anonymously to improve performance.
        </li>
        <li>
          You can request deletion of your account and data at any time by
          contacting support.
        </li>
      </ul>
      <p className="text-gray-700">
        This policy may be updated as needed. Continued use of our services
        constitutes acceptance of any changes.
      </p>
    </div>
  );
}
