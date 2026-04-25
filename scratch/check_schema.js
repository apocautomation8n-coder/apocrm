
import supabase from '../server/supabaseAdmin.js'

async function checkPipeline() {
  const { data: stages, error: sErr } = await supabase
    .from('pipeline_stages')
    .select('*')
  
  if (sErr) console.error('Stages error:', sErr)
  else console.log('Pipeline Stages:', stages)

  const { data: cards, error: cErr } = await supabase
    .from('pipeline_cards')
    .select('*')
    .limit(1)
  
  if (cErr) console.error('Cards error:', cErr)
  else console.log('Pipeline Card sample:', cards[0])
}

checkPipeline()

