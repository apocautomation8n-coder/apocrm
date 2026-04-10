import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { StatCard } from '../components/ui/Card'
import { DollarSign, TrendingUp, TrendingDown, ArrowUpDown, CreditCard, Wallet } from 'lucide-react'

const currencies = [
  { code: 'ARS', symbol: '$', label: 'Pesos (ARS)' },
  { code: 'USD', symbol: '$', label: 'Dólares (USD)' },
  { code: 'EUR', symbol: '€', label: 'Euros (EUR)' },
]

export default function FinanceDashboard() {
  const [transactions, setTransactions] = useState([])
  const [plans, setPlans] = useState([])
  const [expenses, setExpenses] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      const [txRes, planRes, expRes, accRes] = await Promise.all([
        supabase.from('finance_transactions').select('*').eq('status', 'activo'),
        supabase.from('monthly_plans').select('*').eq('status', 'activo'),
        supabase.from('expenses').select('*'),
        supabase.from('bank_accounts').select('*'),
      ])
      setTransactions(txRes.data || [])
      setPlans(planRes.data || [])
      setExpenses(expRes.data || [])
      setAccounts(accRes.data || [])
      setLoading(false)
    }
    fetchAll()
  }, [])

  const dashboard = useMemo(() => {
    return currencies.map(c => {
      // Ingresos from projects
      const projectIncome = transactions
        .filter(t => (t.currency || 'ARS') === c.code)
        .reduce((s, t) => s + Number(t.collected || 0), 0)

      // MRR from plans
      const mrr = plans
        .filter(p => (p.currency || 'USD') === c.code)
        .reduce((s, p) => s + Number(p.monthly_fee || 0), 0)

      // Total expenses
      const totalExpenses = expenses
        .filter(e => (e.currency || 'USD') === c.code)
        .reduce((s, e) => s + Number(e.amount || 0), 0)

      // Freelancer costs from plans
      const freelancerCosts = plans
        .filter(p => (p.currency || 'USD') === c.code)
        .reduce((s, p) => s + Number(p.freelancer_fee || 0), 0)

      // Freelancer costs from projects
      const projectFreelancer = transactions
        .filter(t => (t.currency || 'ARS') === c.code)
        .reduce((s, t) => s + Number(t.freelancer_fee || 0), 0)

      const totalIncome = projectIncome + mrr
      const totalCosts = totalExpenses + freelancerCosts + projectFreelancer
      const netProfit = totalIncome - totalCosts

      // Cash in accounts
      const cashInAccounts = accounts
        .filter(a => (a.currency || 'USD') === c.code)
        .reduce((s, a) => s + Number(a.balance || 0), 0)

      return {
        code: c.code,
        symbol: c.symbol,
        label: c.label,
        projectIncome,
        mrr,
        totalIncome,
        totalExpenses,
        freelancerCosts: freelancerCosts + projectFreelancer,
        totalCosts,
        netProfit,
        cashInAccounts,
      }
    })
  }, [transactions, plans, expenses, accounts])

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mx-auto" />
      </div>
    )
  }

  return (
    <div className="space-y-8 py-2 animate-fade-in">
      {dashboard.map(d => {
        if (d.totalIncome === 0 && d.totalCosts === 0 && d.cashInAccounts === 0) return null

        const profitPercent = d.totalIncome > 0 ? ((d.netProfit / d.totalIncome) * 100).toFixed(1) : 0

        return (
          <div key={d.code} className="space-y-4">
            {/* Currency header */}
            <div className="flex items-center gap-2 px-1">
              <div className={`w-2 h-2 rounded-full ${
                d.code === 'USD' ? 'bg-emerald-500' : 
                d.code === 'EUR' ? 'bg-amber-400' : 
                'bg-primary-500'
              }`} />
              <span className="text-sm font-bold text-surface-300 uppercase tracking-wider">{d.label}</span>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard 
                label="Ingresos Totales"
                value={
                  <div className="flex items-baseline gap-1 text-emerald-400">
                    <span className="text-[10px] opacity-70">{d.code}</span>
                    <span>{d.symbol}{d.totalIncome.toLocaleString()}</span>
                  </div>
                }
                icon={TrendingUp}
                color="success"
              />
              <StatCard 
                label="Gastos Totales"
                value={
                  <div className="flex items-baseline gap-1 text-red-400">
                    <span className="text-[10px] opacity-70">{d.code}</span>
                    <span>{d.symbol}{d.totalCosts.toLocaleString()}</span>
                  </div>
                }
                icon={TrendingDown}
                color="danger"
              />
              <StatCard 
                label="Ganancia Neta"
                value={
                  <div className={`flex items-baseline gap-1 font-bold ${d.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    <span className="text-[10px] opacity-70">{d.code}</span>
                    <span>{d.symbol}{d.netProfit.toLocaleString()}</span>
                  </div>
                }
                icon={ArrowUpDown}
                color={d.netProfit >= 0 ? 'success' : 'danger'}
              />
              <StatCard 
                label="MRR (Mensualidades)"
                value={
                  <div className="flex items-baseline gap-1 text-primary-400">
                    <span className="text-[10px] opacity-70">{d.code}</span>
                    <span>{d.symbol}{d.mrr.toLocaleString()}</span>
                  </div>
                }
                icon={CreditCard}
                color="primary"
              />
              <StatCard 
                label="Dinero en Caja"
                value={
                  <div className="flex items-baseline gap-1 text-amber-400">
                    <span className="text-[10px] opacity-70">{d.code}</span>
                    <span>{d.symbol}{d.cashInAccounts.toLocaleString()}</span>
                  </div>
                }
                icon={Wallet}
                color="warning"
              />
            </div>

            {/* Breakdown bar */}
            <div className="bg-surface-900/80 border border-surface-800/60 rounded-2xl p-5">
              <div className="flex justify-between text-xs text-surface-400 mb-3">
                <span>Desglose de Ingresos vs Gastos</span>
                <span className={`font-bold ${d.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  Margen: {profitPercent}%
                </span>
              </div>
              <div className="h-4 rounded-full bg-surface-800 overflow-hidden flex">
                {d.totalIncome > 0 && (
                  <>
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.min((d.netProfit / d.totalIncome) * 100, 100)}%` }}
                      title={`Ganancia: ${d.symbol}${d.netProfit.toLocaleString()}`}
                    />
                    <div 
                      className="h-full bg-amber-500 transition-all duration-500"
                      style={{ width: `${(d.freelancerCosts / d.totalIncome) * 100}%` }}
                      title={`Freelancers: ${d.symbol}${d.freelancerCosts.toLocaleString()}`}
                    />
                    <div 
                      className="h-full bg-red-500 transition-all duration-500"
                      style={{ width: `${(d.totalExpenses / d.totalIncome) * 100}%` }}
                      title={`Egresos: ${d.symbol}${d.totalExpenses.toLocaleString()}`}
                    />
                  </>
                )}
              </div>
              <div className="flex gap-6 mt-3 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-surface-400">Ganancia</span>
                  <span className="text-surface-200 font-semibold">{d.symbol}{d.netProfit.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-surface-400">Freelancers</span>
                  <span className="text-surface-200 font-semibold">{d.symbol}{d.freelancerCosts.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-surface-400">Egresos</span>
                  <span className="text-surface-200 font-semibold">{d.symbol}{d.totalExpenses.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
