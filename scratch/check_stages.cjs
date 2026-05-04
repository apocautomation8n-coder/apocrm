const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function check() {
  const { data, error } = await supabase.from('pipeline_stages').select('*');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Stages:', data);
  }
}

check();
