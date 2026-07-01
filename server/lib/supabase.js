const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.warn(
    '[supabase] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for the API.',
  );
}

const supabase = url && serviceKey
  ? createClient(url, serviceKey, { auth: { persistSession: false } })
  : null;

const SCREENSHOT_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'payment-screenshots';

module.exports = { supabase, SCREENSHOT_BUCKET };
