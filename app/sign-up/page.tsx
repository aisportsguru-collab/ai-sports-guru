"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export const metadata = {
  title: 'Sign Up – AI Sports Guru',
  description: 'Create your AI Sports Guru account to unlock premium predictions.'
};

export default function SignUpPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        router.push('/');
      }
    });
    return () => subscription?.unsubscribe();
  }, [router, supabase]);

  return (
    <div className="flex justify-center py-10">
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        providers={['google']}
        redirectTo={process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}
      />
    </div>
  );
}