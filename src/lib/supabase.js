import { createClient } from "@supabase/supabase-js";

// Публичный ключ Supabase. Он и задуман публичным: доступ к данным
// закрыт входом по паролю и политиками RLS на стороне базы.
const URL = import.meta.env.VITE_SUPABASE_URL || "https://qrpeplancowntzwxwhtn.supabase.co";
const KEY = import.meta.env.VITE_SUPABASE_KEY || "sb_publishable_SoiWtOoMlFbRR0i81q_g3g_EREEMjKx";

export const supabase = createClient(URL, KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export const HOUSEHOLD = "polina_oksana";
