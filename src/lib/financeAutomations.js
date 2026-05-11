
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
      // Filter by source account if specified in the rule
      if (auto.source_bank_account_id && auto.source_bank_account_id !== incomeTx.bank_account_id) {
        continue
      }

      const amount = (Number(incomeTx.amount) * Number(auto.percentage)) / 100
      
      // 2. Create the 'egreso' transaction (The deduction)
      const egresoPayload = {
        type: 'egreso',
        amount: amount,
        currency: incomeTx.currency || 'USD',
        description: `${auto.destination_description} (Auto: ${auto.percentage}%)`,
        category: 'Automatización',
        date: incomeTx.date,
        bank_account_id: incomeTx.bank_account_id, // From the same account as income
        notes: `Generado automáticamente desde ingreso ID: ${incomeTx.id || 'new'}`
      }

      const { error: txError } = await supabase
        .from('finance_transactions')
        .insert(egresoPayload)

      if (txError) {
        console.error(`Error creating automation egreso (${auto.name}):`, txError)
        continue
      }

      // Update source bank account balance (deduct the amount)
      const { data: sourceAccount } = await supabase
        .from('bank_accounts')
        .select('balance')
        .eq('id', incomeTx.bank_account_id)
        .single()

      if (sourceAccount) {
        const newBalance = Number(sourceAccount.balance) - amount
        await supabase
          .from('bank_accounts')
          .update({ balance: newBalance })
          .eq('id', incomeTx.bank_account_id)
      }

      // 3. If there is a destination account, create an 'ingreso' there (The transfer)
      if (auto.destination_bank_account_id) {
        const ingresoPayload = {
          type: 'ingreso',
          amount: amount,
          currency: incomeTx.currency || 'USD',
          description: `Recibido por automatización: ${auto.name}`,
          category: 'Automatización',
          date: incomeTx.date,
          bank_account_id: auto.destination_bank_account_id,
          notes: `Transferencia automática desde cuenta ${incomeTx.bank_account_id}`
        }

        const { error: insError } = await supabase
          .from('finance_transactions')
          .insert(ingresoPayload)

        if (insError) {
          console.error(`Error creating automation ingreso (${auto.name}):`, insError)
        } else {
          // Update destination bank account balance
          const { data: destAccount } = await supabase
            .from('bank_accounts')
            .select('balance')
            .eq('id', auto.destination_bank_account_id)
            .single()

          if (destAccount) {
            const newBalance = Number(destAccount.balance) + amount
            await supabase
              .from('bank_accounts')
              .update({ balance: newBalance })
              .eq('id', auto.destination_bank_account_id)
          }
        }
      }
    }
  } catch (err) {
    console.error('Unexpected error in finance automations:', err)
  }
}
