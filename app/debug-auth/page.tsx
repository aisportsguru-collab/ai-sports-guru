"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function DebugAuth() {
  const supabase = createClientComponentClient();
  const [payload, setPayload] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const a = await supabase.auth.getUser();
      const b = await supabase.auth.getSession();
      setPayload({ getUser: a, getSession: b });
      console.log("[debug-auth] getUser", a);
      console.log("[debug-auth] getSession", b);
    })();
  }, []);

  return (
    <pre className="p-6 text-sm whitespace-pre-wrap">{JSON.stringify(payload, null, 2)}</pre>
  );
}
