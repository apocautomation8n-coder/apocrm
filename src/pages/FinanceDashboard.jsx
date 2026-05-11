import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { StatCard } from '../components/ui/Card'
import { DollarSign, TrendingUp, TrendingDown, ArrowUpDown, CreditCard, Wallet, Repeat, Briefcase, Calculator, HelpCircle, Filter } from 'lucide-react'
import { format } from 'date-fns'

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
  const [rates, setRates] = useState({ usd: 0, eur: 0 })
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'))

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      try {
        const [txRes, planRes, expRes, accRes, ratesResUsd, ratesResEur] = await Promise.all([
          supabase.from('finance_transactions').select('*').eq('status', 'activo'),
          supabase.from('monthly_plans').select('*').eq('status', 'activo'),
          supabase.from('expenses').select('*'),
          supabase.from('bank_accounts').select('*'),
          fetch('https://dolarapi.com/v1/dolares/blue').then(r => r.json()),
          fetch('https://dolarapi.com/v1/cotizaciones/eur').then(r => r.json()),
        ])
        
        setTransactions(txRes.data || [])
        setPlans(planRes.data || [])
        setExpenses(expRes.data || [])
        setAccounts(accRes.data || [])
        setRates({
          usd: ratesResUsd.venta || 0,
          eur: ratesResEur.venta || 0
        })
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  // Active-only expenses
  const activeExpenses = expenses.filter(e => (e.status || 'activo') === 'activo')

  // Derive available months from data
  const availableMonths = useMemo(() => {
    const months = new Set()
    transactions.forEach(t => { if (t.date) months.add(t.date.substring(0, 7)) })
    activeExpenses.forEach(e => { if (e.date) months.add(e.date.substring(0, 7)) })
    // Ensure April 2026 is available
    months.add('2026-04')
    return Array.from(months).sort().reverse()
  }, [transactions, activeExpenses])

  const { consolidated, groupedData } = useMemo(() => {
    let totalBrutoArs = 0
    let totalNetArs = 0
    let totalPendingArs = 0

    const groups = currencies.map(c => {
      const rate = c.code === 'USD' ? rates.usd : c.code === 'EUR' ? rates.eur : 1

      // ────── FIXED / RECURRING ──────
      const mrr = plans
        .filter(p => (p.currency || 'USD') === c.code)
        .reduce((s, p) => s + Number(p.monthly_fee || 0), 0)

      const planFreelancerCosts = plans
        .filter(p => (p.currency || 'USD') === c.code)
        .reduce((s, p) => s + Number(p.freelancer_fee || 0) + Number(p.expenses || 0), 0)

      const recurringExpenses = activeExpenses
        .filter(e => (e.currency || 'USD') === c.code && e.recurring)
        .reduce((s, e) => s + Number(e.amount || 0), 0)

      const fixedTotalCosts = planFreelancerCosts + recurringExpenses
      const fixedNetProfit = mrr - fixedTotalCosts

      // ────── ONE-TIME / PROJECT ──────
      const filteredTransactions = transactions.filter(t => 
        (t.currency || 'ARS') === c.code && 
        (filterMonth === 'all' || (t.date && t.date.startsWith(filterMonth)))
      )

      const projectBudget = filteredTransactions
        .reduce((s, t) => s + Number(t.budget || 0), 0)

      const projectCollected = filteredTransactions
        .reduce((s, t) => s + Number(t.collected || 0), 0)

      const projectFreelancer = filteredTransactions
        .reduce((s, t) => s + Number(t.freelancer_fee || 0), 0)

      const oneTimeExpenses = activeExpenses
        .filter(e => 
          (e.currency || 'USD') === c.code && 
          !e.recurring &&
          (filterMonth === 'all' || (e.date && e.date.startsWith(filterMonth)))
        )
        .reduce((s, e) => s + Number(e.amount || 0), 0)

      const onetimeTotalCosts = projectFreelancer + oneTimeExpenses
      
      // Expected net if everything is collected
      const projectExpectedNet = projectBudget - onetimeTotalCosts
      // Net already collected (assuming costs are covered first)
      const projectRealizedNet = Math.max(0, projectCollected - onetimeTotalCosts)
      
      const projectPendingGross = projectBudget - projectCollected
      const projectPendingNet = Math.max(0, projectExpectedNet - projectRealizedNet)

      // ────── GENERAL ──────
      const cashInAccounts = accounts
        .filter(a => (a.currency || 'USD') === c.code)
        .reduce((s, a) => s + Number(a.balance || 0), 0)

      const hasData = mrr > 0 || projectBudget > 0 || fixedTotalCosts > 0 || onetimeTotalCosts > 0 || cashInAccounts > 0

      // Consolidated Totals (Accumulate in ARS)
      totalBrutoArs += (mrr + projectBudget) * rate
      totalNetArs += (fixedNetProfit + projectExpectedNet) * rate
      totalPendingArs += projectPendingNet * rate

      return {
        code: c.code, symbol: c.symbol, label: c.label, hasData,
        mrr, planFreelancerCosts, recurringExpenses, fixedTotalCosts, fixedNetProfit,
        projectBudget, projectCollected, projectFreelancer, oneTimeExpenses, onetimeTotalCosts, 
        projectExpectedNet, projectRealizedNet, projectPendingGross, projectPendingNet,
        cashInAccounts,
      }
    })

    return { 
      groupedData: groups,
      consolidated: { totalBrutoArs, totalNetArs, totalPendingArs }
    }
  }, [transactions, plans, activeExpenses, accounts, rates, filterMonth])

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mx-auto" />
      </div>
    )
  }

  const fmt = (num) => {
    if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (Math.abs(num) >= 10000) return (num / 1000).toFixed(0) + 'K'
    return num.toLocaleString()
  }

  const InfoIcon = ({ text }) => (
    <div className="group relative inline-block ml-1 inline-flex items-center">
      <HelpCircle size={10} className="text-surface-500 hover:text-primary-400 cursor-help transition-colors" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-surface-800 border border-surface-700 rounded-lg text-[10px] text-surface-200 leading-tight opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-2xl backdrop-blur-md">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-surface-800" />
      </div>
    </div>
  )

  return (
    <div className="space-y-10 py-2 animate-fade-in">
      {/* Consolidated Summary in ARS */}
      <div className="bg-gradient-to-br from-primary-900/40 to-surface-900 border border-primary-500/20 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-6">
          <Calculator size={20} className="text-primary-400" />
          <h2 className="text-lg font-bold text-surface-50">Resumen Consolidado (Pesos ARS)</h2>
          
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2 bg-surface-900/50 border border-surface-700/50 rounded-lg px-2 py-1">
              <Filter size={14} className="text-surface-500" />
              <select 
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="bg-transparent border-none text-xs text-surface-300 focus:outline-none cursor-pointer font-medium"
              >
                <option value="all">Todo el Historial</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <span className="text-[10px] text-surface-500 font-mono uppercase tracking-widest bg-surface-800 px-2 py-1 rounded border border-surface-700">Cotización Real-Time</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <p className="text-xs text-surface-400 font-medium uppercase tracking-wider flex items-center">
              Facturación Bruta (Potencial)
              <InfoIcon text="Suma total de presupuestos de proyectos activos + MRR de mensualidades." />
            </p>
            <p className="text-3xl font-black text-white whitespace-nowrap overflow-hidden text-ellipsis">
              <span className="text-xs font-bold text-primary-400 mr-2">ARS</span>
              ${fmt(consolidated.totalBrutoArs)}
            </p>
            <p className="text-[10px] text-surface-500 font-medium">Suma de presupuestos + mensualidades</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs text-surface-400 font-medium uppercase tracking-wider flex items-center">
              Ganancia Pendiente (Limpio)
              <InfoIcon text="Lo que falta cobrar de proyectos que es ganancia pura (restando costos de freelancers)." />
            </p>
            <p className="text-3xl font-black text-amber-400 whitespace-nowrap overflow-hidden text-ellipsis">
              <span className="text-xs font-bold text-amber-500/60 mr-2">ARS</span>
              ${fmt(consolidated.totalPendingArs)}
            </p>
            <p className="text-[10px] text-surface-500 font-medium">Profit neto por cobrar de proyectos</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-surface-400 font-medium uppercase tracking-wider flex items-center">
              Ganancia Neta Total (Proyectada)
              <InfoIcon text="La ganancia final esperada una vez se cobre el 100% y se descuenten todos los costos." />
            </p>
            <p className={`text-3xl font-black whitespace-nowrap overflow-hidden text-ellipsis ${consolidated.totalNetArs >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              <span className="text-xs font-bold opacity-60 mr-2">ARS</span>
              ${fmt(consolidated.totalNetArs)}
            </p>
            <p className="text-[10px] text-surface-500 font-medium">Ingresos - Gastos - Freelancers (Total Final)</p>
          </div>
        </div>
      </div>

      {groupedData.filter(d => d.hasData).map(d => {
        const fixedMargin = d.mrr > 0 ? ((d.fixedNetProfit / d.mrr) * 100).toFixed(0) : 0
        const onetimeMargin = d.projectBudget > 0 ? ((d.projectExpectedNet / d.projectBudget) * 100).toFixed(0) : 0

        return (
          <div key={d.code} className="space-y-6">
            {/* Currency header + Cash */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${
                  d.code === 'USD' ? 'bg-emerald-500' : 
                  d.code === 'EUR' ? 'bg-amber-400' : 
                  'bg-primary-500'
                }`} />
                <span className="text-base font-bold text-surface-200 uppercase tracking-wider">{d.label}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-900/80 border border-surface-800/60">
                <Wallet size={16} className="text-amber-400" />
                <span className="text-xs text-surface-400">En caja:</span>
                <span className={`text-sm font-bold ${d.cashInAccounts > 0 ? 'text-amber-400' : 'text-surface-500'}`}>
                  {d.symbol}{fmt(d.cashInAccounts)}
                </span>
              </div>
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              
              {/* ═══════ FIXED / MONTHLY SECTION ═══════ */}
              <div className="bg-surface-900/80 border border-surface-800/60 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Repeat size={16} className="text-primary-400" />
                  <span className="text-sm font-bold text-surface-200">Gastos Fijos (Mensuales)</span>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface-800/40 rounded-xl p-3.5 border border-surface-700/30">
                    <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-1 flex items-center">
                      MRR (Ingresos)
                      <InfoIcon text="Ingreso Mensual Recurrente proveniente de mensualidades activas." />
                    </p>
                    <p className="text-lg font-bold text-emerald-400">
                      <span className="text-[10px] opacity-60 mr-0.5">{d.code}</span>
                      {d.symbol}{fmt(d.mrr)}
                    </p>
                  </div>
                  <div className="bg-surface-800/40 rounded-xl p-3.5 border border-surface-700/30">
                    <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-1 flex items-center">
                      Gastos Fijos
                      <InfoIcon text="Suma de freelancers de planes y egresos marcados como recurrentes." />
                    </p>
                    <p className="text-lg font-bold text-red-400">
                      <span className="text-[10px] opacity-60 mr-0.5">{d.code}</span>
                      {d.symbol}{fmt(d.fixedTotalCosts)}
                    </p>
                  </div>
                </div>

                {/* Breakdown + bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-surface-400">Freelancers + Gastos plan: <span className="text-amber-400 font-semibold">{d.symbol}{fmt(d.planFreelancerCosts)}</span></span>
                    <span className="text-surface-400">Egresos recurrentes: <span className="text-red-400 font-semibold">{d.symbol}{fmt(d.recurringExpenses)}</span></span>
                  </div>
                  <div className="h-3 rounded-full bg-surface-800 overflow-hidden flex">
                    {d.mrr > 0 && (
                      <>
                        <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${Math.max((d.fixedNetProfit / d.mrr) * 100, 0)}%` }} />
                        <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${(d.planFreelancerCosts / d.mrr) * 100}%` }} />
                        <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${(d.recurringExpenses / d.mrr) * 100}%` }} />
                      </>
                    )}
                  </div>
                </div>

                {/* Net */}
                <div className="flex items-center justify-between pt-2 border-t border-surface-700/30">
                  <span className="text-xs text-surface-400 flex items-center">
                    Ganancia neta mensual
                    <InfoIcon text="Diferencia limpia entre MRR y Gastos Fijos por mes." />
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${d.fixedNetProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {d.symbol}{fmt(d.fixedNetProfit)}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                      d.fixedNetProfit >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>{fixedMargin}%</span>
                  </div>
                </div>
              </div>

              {/* ═══════ ONE-TIME / PROJECTS SECTION ═══════ */}
              <div className="bg-surface-900/80 border border-surface-800/60 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Briefcase size={16} className="text-amber-400" />
                  <span className="text-sm font-bold text-surface-200">Gastos Únicos (Proyectos)</span>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface-800/40 rounded-xl p-3.5 border border-surface-700/30">
                    <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-1 flex items-center">
                      Cobrado
                      <InfoIcon text="Dinero total recibido efectivamente por proyectos únicos." />
                    </p>
                    <p className="text-lg font-bold text-emerald-400">
                      <span className="text-[10px] opacity-60 mr-0.5">{d.code}</span>
                      {d.symbol}{fmt(d.projectCollected)}
                    </p>
                    {d.projectBudget > d.projectCollected && (
                      <p className="text-[10px] text-surface-500 mt-0.5">
                        Pendiente Bruto: {d.symbol}{fmt(d.projectPendingGross)}
                      </p>
                    )}
                  </div>
                  <div className="bg-surface-800/40 rounded-xl p-3.5 border border-surface-700/30">
                    <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-1 flex items-center">
                      Gastos Únicos
                      <InfoIcon text="Costos de freelancers y egresos puntuales de proyectos." />
                    </p>
                    <p className="text-lg font-bold text-red-400">
                      <span className="text-[10px] opacity-60 mr-0.5">{d.code}</span>
                      {d.symbol}{fmt(d.onetimeTotalCosts)}
                    </p>
                  </div>
                </div>

                {/* Breakdown + bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-surface-400 flex items-center">
                      Ganancia Cobrada
                      <InfoIcon text="Beneficio neto ya realizado del dinero cobrado (restando costos)." />: 
                      <span className="text-emerald-400 font-semibold ml-1">{d.symbol}{fmt(d.projectRealizedNet)}</span>
                    </span>
                    <span className="text-surface-400 flex items-center">
                      Pendiente Limpio
                      <InfoIcon text="Ganancia neta que todavía falta por cobrar de los proyectos." />: 
                      <span className="text-amber-400 font-semibold ml-1">{d.symbol}{fmt(d.projectPendingNet)}</span>
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-surface-800 overflow-hidden flex">
                    {d.projectBudget > 0 && (
                      <>
                        <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${Math.max((d.projectRealizedNet / d.projectBudget) * 100, 0)}%` }} />
                        <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${(d.projectPendingNet / d.projectBudget) * 100}%` }} />
                        <div className="h-full bg-red-500/50 transition-all duration-500" style={{ width: `${(d.onetimeTotalCosts / d.projectBudget) * 100}%` }} />
                      </>
                    )}
                  </div>
                </div>

                {/* Net */}
                <div className="flex items-center justify-between pt-2 border-t border-surface-700/30">
                  <span className="text-xs text-surface-400 flex items-center">
                    Ganancia neta total proyectada
                    <InfoIcon text="Beneficio final del proyecto una vez cobrado al 100% y pagados todos los costos." />
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${d.projectExpectedNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {d.symbol}{fmt(d.projectExpectedNet)}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                      d.projectExpectedNet >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>{onetimeMargin}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
