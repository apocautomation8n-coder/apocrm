
import supabase from '../server/supabaseAdmin.js'

async function enableRealtime() {
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      -- Enable Realtime for messages
      ALTER publication supabase_realtime ADD TABLE messages;
      -- Enable Realtime for tasks
      ALTER publication supabase_realtime ADD TABLE tasks;
    `
  })
  
  if (error) {
    console.log('Note: Manual Realtime enablement required in Supabase Dashboard (Database > Publications > supabase_realtime)')
  } else {
    console.log('Realtime enabled for messages and tasks!')
  }
}

enableRealtime()

