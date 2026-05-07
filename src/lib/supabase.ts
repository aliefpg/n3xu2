import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
// Gunakan Publishable API Key di sisi frontend client.
// PERHATIAN: Jangan pernah memasukkan Secret API Key ke dalam VITE_ variable karena akan terlihat oleh end-user.
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
