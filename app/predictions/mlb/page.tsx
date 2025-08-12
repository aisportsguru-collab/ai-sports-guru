import React, { Suspense } from "react";
import MLBClient from "./Client";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <MLBClient />
    </Suspense>
  );
}
