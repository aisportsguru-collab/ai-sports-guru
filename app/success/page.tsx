export default function SuccessPage() {
  return (
    <main className="bg-black text-white min-h-screen flex items-center justify-center px-6">
      <div className="max-w-lg text-center">
        <h1 className="text-3xl font-extrabold mb-3">You’re all set ✅</h1>
        <p className="text-gray-300 mb-6">
          Your free trial has started. You can access all predictions now.
        </p>
        <a
          href="/nba"
          className="inline-block bg-yellow-400 text-black font-bold px-6 py-3 rounded-xl hover:bg-yellow-500 transition"
        >
          Go to predictions
        </a>
      </div>
    </main>
  );
}
