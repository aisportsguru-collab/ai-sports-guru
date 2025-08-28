import Link from "next/link";

export default function Landing() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-24">
      <h1 className="text-5xl font-extrabold text-white mb-4">AI Sports Guru</h1>
      <p className="text-2xl text-zinc-300 mb-8">Simple. Fast. Smart.</p>
      <p className="text-lg text-zinc-400 max-w-2xl">
        No analysis needed. Log in, view odds & AI picks, and make informed decisions.
        Whether you’re casual or sharp, it’s plug-and-play.
      </p>

      <div className="mt-10 flex gap-4">
        <Link
          href="/sign-in"
          className="inline-flex items-center rounded-lg bg-yellow-400 px-5 py-3 font-semibold text-black hover:bg-yellow-300"
        >
          Get Started
        </Link>
        <Link
          href="/pricing"
          className="inline-flex items-center rounded-lg border border-zinc-700 px-5 py-3 font-semibold text-white hover:bg-zinc-900"
        >
          Pricing
        </Link>
      </div>
    </main>
  );
}
