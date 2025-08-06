"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSignIn = async (e: any) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
    } else {
      router.push("/");
    }
  };

  return (
    <main className="bg-black text-white min-h-screen flex items-center justify-center px-6">
      <form
        onSubmit={handleSignIn}
        className="bg-gray-900 border border-gray-700 p-8 rounded-2xl w-full max-w-md"
      >
        <h1 className="text-3xl font-bold mb-6 text-center">Sign In</h1>

        {error && (
          <p className="text-red-500 text-sm text-center mb-4">{error}</p>
        )}

        <label className="block text-sm mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 rounded bg-gray-800 text-white mb-4 border border-gray-700"
          required
        />

        <label className="block text-sm mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 rounded bg-gray-800 text-white mb-6 border border-gray-700"
          required
        />

        <button
          type="submit"
          className="w-full bg-yellow-400 text-black font-bold py-3 rounded hover:bg-yellow-500 transition"
        >
          Sign In
        </button>

        <p className="text-center text-sm text-gray-400 mt-6">
          Don't have an account?{" "}
          <a href="/sign-up" className="text-yellow-400 hover:underline">
            Sign up
          </a>
        </p>
      </form>
    </main>
  );
}
