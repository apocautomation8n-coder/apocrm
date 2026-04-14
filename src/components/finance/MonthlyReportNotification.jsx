import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { FileText, Download, X, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import Button from '../ui/Button'
import Modal from '../ui/Modal'

export default function MonthlyReportNotification({ forceOpen = false, onCloseManual }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState([])
  const [monthName, setMonthName] = useState('')

  useEffect(() => {
    const checkAndFetch = async () => {
      const today = new Date()
      // Current month string like "2026-04"
      const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
      setMonthName(today.toLocaleString('es-ES', { month: 'long', year: 'numeric' }))

      // Check if we should auto-open
      const hasSeen = localStorage.getItem(`monthly_report_seen_${currentMonthKey}`)
      const isEndOfMonth = today.getDate() >= 28 // auto show on 28th, 29th, 30th, 31st

      if (forceOpen || (isEndOfMonth && !hasSeen)) {
        setIsOpen(true)
        await fetchReportData(today)
      }
    }

    checkAndFetch()
  }, [forceOpen])

  const fetchReportData = async (date) => {
    setLoading(true)
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0]
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0]

    const { data: txData } = await supabase
      .from('finance_transactions')
      .select('type, amount, currency, category')
      .gte('date', firstDay)
      .lte('date', lastDay)

    const transactions = txData || []

    const currencies = ['ARS', 'USD', 'EUR']
    const metrics = currencies.map(cur => {
      const tx = transactions.filter(t => (t.currency || 'USD') === cur)
      const incomes = tx.filter(t => t.type === 'ingreso').reduce((s, t) => s + Number(t.amount), 0)
      const expenses = tx.filter(t => t.type === 'egreso').reduce((s, t) => s + Number(t.amount), 0)
      return {
        currency: cur,
        symbol: cur === 'EUR' ? '€' : '$',
        incomes,
        expenses,
        net: incomes - expenses,
        hasData: incomes > 0 || expenses > 0
      }
    }).filter(d => d.hasData)

    setReportData(metrics)
    setLoading(false)
  }

  const handleClose = () => {
    const today = new Date()
    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    localStorage.setItem(`monthly_report_seen_${currentMonthKey}`, 'true')
    setIsOpen(false)
    if (onCloseManual) onCloseManual()
  }

  const handleDownload = () => {
    // Generate simple text report
    let text = `REPORTE FINANCIERO - ${monthName.toUpperCase()}\n`
    text += `==============================================\n\n`

    reportData.forEach(d => {
      text += `--- MONEDA: ${d.currency} ---\n`
      text += `ENTRADA DE DINERO (Bruto): ${d.symbol}${d.incomes.toLocaleString()}\n`
      text += `SALIDA DE DINERO (Gastos): ${d.symbol}${d.expenses.toLocaleString()}\n`
      text += `GANANCIA NETA:             ${d.symbol}${d.net.toLocaleString()}\n\n`
    })

    if (reportData.length === 0) {
      text += `No hay movimientos financieros registrados este mes.\n`
    }

    text += `==============================================\n`
    text += `Generado el: ${new Date().toLocaleString('es-ES')}`

    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Reporte_${monthName.replace(' ', '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!isOpen && !forceOpen) return null

  return (
    <Modal isOpen={isOpen || forceOpen} onClose={handleClose} title="Reporte Financiero Mensual" size="md">
      <div className="space-y-6">
        <div className="p-4 bg-surface-800/50 rounded-xl border border-surface-700/50 text-center space-y-1">
          <p className="text-sm text-surface-400">Resumen correspondiente al mes de</p>
          <h3 className="text-xl font-bold text-white capitalize">{monthName}</h3>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
          </div>
        ) : reportData.length === 0 ? (
          <div className="py-8 text-center text-surface-500 text-sm">
            No se han registrado ingresos ni egresos durante este mes.
          </div>
        ) : (
          <div className="space-y-6">
            {reportData.map((data) => (
              <div key={data.currency} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    data.currency === 'USD' ? 'bg-emerald-500' : data.currency === 'EUR' ? 'bg-amber-400' : 'bg-primary-500'
                  }`} />
                  <span className="text-sm font-bold text-surface-300 uppercase tracking-wider">Totales en {data.currency}</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface-900 border border-surface-800/60">
                    <div className="flex items-center gap-2 text-surface-400">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400"><TrendingUp size={14} /></div>
                      <span className="text-sm">Entrada de dinero (Bruto)</span>
                    </div>
                    <span className="font-bold text-emerald-400">{data.symbol}{data.incomes.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface-900 border border-surface-800/60">
                    <div className="flex items-center gap-2 text-surface-400">
                      <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400"><TrendingDown size={14} /></div>
                      <span className="text-sm">Salida de dinero (Gastos)</span>
                    </div>
                    <span className="font-bold text-red-400">{data.symbol}{data.expenses.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface-800/80 border border-surface-700/60 mt-2 shadow-inner shadow-black/20">
                    <div className="flex items-center gap-2 text-surface-200">
                      <div className="p-1.5 rounded-lg bg-primary-500/10 text-primary-400"><DollarSign size={14} /></div>
                      <span className="text-sm font-bold">Total Neto Mensual</span>
                    </div>
                    <span className={`text-lg font-black ${data.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {data.symbol}{data.net.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-surface-700/50">
          <Button variant="secondary" onClick={handleDownload} className="gap-2 px-4 shadow-none hover:shadow-none hover:bg-surface-700/80">
            <Download size={16} />
            <span className="hidden sm:inline">Guardar Resumen</span>
          </Button>
          <Button onClick={handleClose} className="px-8 shadow-none shadow-primary-500/20">
            Entendido
          </Button>
        </div>
      </div>
    </Modal>
  )
}
