import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Export both ways so pages that do `import { supabase } ...` keep working.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export default supabase;
