
import { supabase } from './supabaseClient'

/**
 * Executes active finance automations for a given transaction.
 * Usually called when a new income is registered.
 */
export async function executeFinanceAutomations(incomeTx) {
  if (incomeTx.type !== 'ingreso' || !incomeTx.bank_account_id) return

  try {
    // 1. Fetch active automations for 'ingreso'
    const { data: automations, error } = await supabase
      .from('finance_automations')
      .select('*')
      .eq('trigger_type', 'ingreso')
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching finance automations:', error)
      return
    }

    if (!automations || automations.length === 0) return

    for (const auto of automations) {
      const amount = (Number(incomeTx.amount) * Number(auto.percentage)) / 100
      
      // 2. Create the 'egreso' transaction
      const egresoPayload = {
        type: 'egreso',
        amount: amount,
        currency: incomeTx.currency || 'USD',
        description: `${auto.destination_description} (Auto: ${auto.percentage}%)`,
        category: 'Automatización',
        date: incomeTx.date,
        bank_account_id: incomeTx.bank_account_id, // Same account as income
        notes: `Generado automáticamente desde ingreso ID: ${incomeTx.id || 'new'}`
      }

      const { data: newTx, error: txError } = await supabase
        .from('finance_transactions')
        .insert(egresoPayload)
        .select()
        .single()

      if (txError) {
        console.error(`Error creating automation egreso (${auto.name}):`, txError)
        continue
      }

      // 3. Update bank account balance (deduct the amount)
      const { data: account } = await supabase
        .from('bank_accounts')
        .select('balance')
        .eq('id', incomeTx.bank_account_id)
        .single()

      if (account) {
        const newBalance = Number(account.balance) - amount
        await supabase
          .from('bank_accounts')
          .update({ balance: newBalance })
          .eq('id', incomeTx.bank_account_id)
      }
    }
  } catch (err) {
    console.error('Unexpected error in finance automations:', err)
  }
}
