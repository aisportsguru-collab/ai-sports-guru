import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '~/lib/supabase';

type Ctx = {
  booting: boolean;
  session: import('@supabase/supabase-js').Session | null;
  email: string | null;
  subscriptionStatus: 'active' | 'trialing' | 'none' | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionCtx = createContext<Ctx>({
  booting: true, session: null, email: null, subscriptionStatus: null,
  refreshProfile: async () => {}, signOut: async () => {}
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState<Ctx['session']>(null);
  const [email, setEmail] = useState<string|null>(null);
  const [subscriptionStatus, setStatus] = useState<Ctx['subscriptionStatus']>(null);

  const refreshProfile = async () => {
    if (!email) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('email', email)
      .maybeSingle();
    if (!error && data) setStatus((data.subscription_status as any) ?? 'none');
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);
      setEmail(data.session?.user?.email ?? null);
      setBooting(false);
      if (data.session?.user?.email) {
        setEmail(data.session.user.email);
        refreshProfile();
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s ?? null);
      setEmail(s?.user?.email ?? null);
      if (s?.user?.email) {
        setEmail(s.user.email);
        await refreshProfile();
      } else {
        setStatus(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <SessionCtx.Provider value={{ booting, session, email, subscriptionStatus, refreshProfile, signOut }}>
      {children}
    </SessionCtx.Provider>
  );
}

export const useSessionValue = () => useContext(SessionCtx);
