import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function checkSubscription() {
  const supabase = createServerComponentClient({ cookies });

  // Get current user
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return false; // Not signed in
  }

  // Look up the profile in the database
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_subscribed")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return false; // No profile found
  }

  return profile.is_subscribed === true;
}
