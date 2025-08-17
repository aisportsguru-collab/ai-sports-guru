'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

// make this page always server-rendered (not pre-rendered) to avoid CSR bailout errors
export const dynamic = 'force-dynamic';

function LoginInner() {
  const sp = useSearchParams();
  const [mode, setMode] = useState<'signup' | 'signin'>(
    sp?.get('mode') === 'signin' ? 'signin' : 'signup'
  );

  return (
    <div style={{ padding: 24 }}>
      <h1>AI Sports Guru — {mode === 'signin' ? 'Sign In' : 'Sign Up'}</h1>
      <p style={{ opacity: 0.7 }}>
        (Temporary minimal page to unblock build. Replace with your real UI later.)
      </p>
      <div style={{ marginTop: 16 }}>
        <button onClick={() => setMode('signin')} style={{ marginRight: 8 }}>Sign In</button>
        <button onClick={() => setMode('signup')}>Sign Up</button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <LoginInner />
    </Suspense>
  );
}
