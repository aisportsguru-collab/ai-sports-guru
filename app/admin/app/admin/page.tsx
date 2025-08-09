"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Session } from "@supabase/supabase-js";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkAccess = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error || !session) {
        router.push("/");
        return;
      }

      if (session.user.email !== "smithajordan1992@gmail.com") {
        router.push("/");
        return;
      }

      setSession(session);
      setLoading(false);
    };

    checkAccess();
  }, []);

  if (loading) {
    return <div className="text-center py-20">Loading admin dashboard...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold text-secondary mb-6">
        Admin Dashboard
      </h1>
      <p className="text-gray-700 mb-4">Welcome, {session?.user.email}</p>

      {/* Example: Add management sections here */}
      <div className="grid grid-cols-1 gap-6">
        <div className="p-6 bg-white shadow rounded-lg">
          <h2 className="text-xl font-semibold text-secondary mb-2">
            User Management
          </h2>
          <p className="text-gray-600">
            Coming soon: View all users, manage subscriptions, etc.
          </p>
        </div>

        <div className="p-6 bg-white shadow rounded-lg">
          <h2 className="text-xl font-semibold text-secondary mb-2">
            Prediction Control
          </h2>
          <p className="text-gray-600">
            Coming soon: Trigger prediction runs or manage AI logic.
          </p>
        </div>
      </div>
    </div>
  );
}
