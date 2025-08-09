export const metadata = {
  title: "Terms of Service – AI Sports Guru",
  description:
    "The rules and terms that govern your use of the AI Sports Guru website and services.",
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 space-y-6">
      <h1 className="text-3xl font-bold text-secondary">Terms of Service</h1>
      <p className="text-gray-700">
        By using AI Sports Guru, you agree to comply with and be bound by the
        following terms and conditions.
      </p>
      <ul className="list-disc list-inside text-gray-700 space-y-2">
        <li>
          You must be at least 18 years old or the legal age for gambling in
          your jurisdiction.
        </li>
        <li>
          You are solely responsible for your own betting activities and
          financial decisions.
        </li>
        <li>
          You agree not to reproduce, resell, or redistribute the AI Sports Guru
          platform or its content without written permission.
        </li>
        <li>
          We reserve the right to modify or terminate the service at any time
          without notice.
        </li>
        <li>
          Violation of these terms may result in the termination of your access
          to the platform.
        </li>
      </ul>
      <p className="text-gray-700">
        These terms are subject to change without notice. Please review this
        page regularly for updates.
      </p>
    </div>
  );
}
