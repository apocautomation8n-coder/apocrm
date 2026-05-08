import { useEffect, useMemo, useState } from 'react'
import { Sparkles, RefreshCcw, Download, Save, FileText, Wand2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { pdf } from '@react-pdf/renderer'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Select from '../ui/Select'
import Input from '../ui/Input'
import Modal from '../ui/Modal'
import { API_URL } from '../../lib/api'
import { supabase } from '../../lib/supabaseClient'
import BudgetPDF from './BudgetPDF'

const emptyBudget = {
  number: '',
  issue_date: new Date().toISOString().slice(0, 10),
  currency: 'ARS',
  deposit_percent: 30,
  title: '',
  description: '',
  scope: '',
  features: [],
  suggested_tech: [],
  estimated_time: '',
  estimated_price: null,
  estimated_monthly_price: null,
  payment_plan: '',
  observations: '',
  conditions: '',
  validity_days: 15,
}

const normalizeList = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string') {
    return value
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
  }
  return []
}

const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function Budgets() {
  const [requirements, setRequirements] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [budget, setBudget] = useState({ ...emptyBudget })
  const [settings, setSettings] = useState(null)

  const [generating, setGenerating] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)

  const [templates, setTemplates] = useState([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [templateName, setTemplateName] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('invoice_settings').select('*').limit(1).single()
      setSettings(data || null)
    }
    load()
  }, [])

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API_URL}/api/budgets/templates`)
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Error cargando plantillas')
      setTemplates(json?.data || [])
    } catch (e) {
      toast.error(e.message)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  const applyTemplate = (tplId) => {
    const tpl = templates.find(t => t.id === tplId)
    if (!tpl?.template_json) return
    setBudget(prev => ({
      ...prev,
      ...tpl.template_json,
      features: Array.isArray(tpl.template_json.features) ? tpl.template_json.features.join('\n') : (tpl.template_json.features || ''),
      suggested_tech: Array.isArray(tpl.template_json.suggested_tech) ? tpl.template_json.suggested_tech.join('\n') : (tpl.template_json.suggested_tech || ''),
      currency: prev.currency,
      deposit_percent: prev.deposit_percent,
      issue_date: prev.issue_date,
      number: prev.number,
    }))
    toast.success('Plantilla aplicada')
  }

  const callGenerate = async ({ mode }) => {
    if (!requirements.trim()) {
      toast.error('Describe el proyecto o necesidad del cliente')
      return
    }

    setGenerating(true)
    try {
      const res = await fetch(`${API_URL}/api/budgets/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirements_text: requirements,
          currency: budget.currency,
          deposit_percent: budget.deposit_percent,
          mode,
          current_budget: mode === 'regenerate' ? {
            ...budget,
            features: normalizeList(budget.features),
            suggested_tech: normalizeList(budget.suggested_tech)
          } : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Error generando presupuesto')

      const nextBudget = json?.data?.budget || {}
      const nextAnalysis = json?.data?.analysis || null

      setAnalysis(nextAnalysis)
      setBudget(prev => ({
        ...prev,
        ...nextBudget,
        features: Array.isArray(nextBudget.features) ? nextBudget.features.join('\n') : (nextBudget.features || ''),
        suggested_tech: Array.isArray(nextBudget.suggested_tech) ? nextBudget.suggested_tech.join('\n') : (nextBudget.suggested_tech || ''),
        currency: prev.currency,
        deposit_percent: prev.deposit_percent,
        issue_date: prev.issue_date,
        number: prev.number || '',
      }))
      toast.success('Presupuesto generado')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleExportPdf = async () => {
    if (!budget.title && !requirements.trim()) {
      toast.error('Agrega requerimientos o genera el presupuesto primero')
      return
    }

    setExporting(true)
    try {
      const budgetToIssue = {
        ...budget,
        features: normalizeList(budget.features),
        suggested_tech: normalizeList(budget.suggested_tech)
      }

      const issueRes = await fetch(`${API_URL}/api/budgets/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirements_text: requirements,
          analysis_json: analysis,
          budget_json: budgetToIssue,
        }),
      })
      const issueJson = await issueRes.json()
      if (!issueRes.ok) throw new Error(issueJson?.error || 'Error emitiendo presupuesto')

      const issued = issueJson?.data?.budget || {}
      const merged = { ...budget, ...issued }
      setBudget(merged)

      const blob = await pdf(<BudgetPDF budget={merged} settings={settings} />).toBlob()
      const fileName = `${merged.number || 'Presupuesto'}_${(merged.title || 'Propuesta').replace(/[^a-z0-9]+/gi, '_')}.pdf`
      downloadBlob(blob, fileName)
      toast.success('PDF exportado')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setExporting(false)
    }
  }

  const handleOpenSaveTemplate = () => {
    setTemplateName(budget.title ? `Plantilla - ${budget.title}` : 'Plantilla Presupuesto')
    setTemplateModalOpen(true)
  }

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('Ingresa un nombre para la plantilla')
      return
    }

    setSavingTemplate(true)
    try {
      const res = await fetch(`${API_URL}/api/budgets/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName.trim(),
          template_json: {
            title: budget.title,
            description: budget.description,
            scope: budget.scope,
            features: normalizeList(budget.features),
            suggested_tech: normalizeList(budget.suggested_tech),
            payment_plan: budget.payment_plan,
            observations: budget.observations,
            conditions: budget.conditions,
            validity_days: budget.validity_days,
            estimated_monthly_price: budget.estimated_monthly_price,
          },
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Error guardando plantilla')
      toast.success('Plantilla guardada')
      setTemplateModalOpen(false)
      setSelectedTemplateId('')
      await fetchTemplates()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSavingTemplate(false)
    }
  }

  const templateOptions = useMemo(() => {
    return [
      { value: '', label: 'Plantillas (opcional)' },
      ...templates.map(t => ({ value: t.id, label: t.name })),
    ]
  }, [templates])

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-surface-100">Presupuestos</h2>
          <p className="text-surface-400 text-sm mt-1">
            Genera propuestas premium listas para enviar, con análisis inteligente de alcance, tiempos y costos.
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-2 gap-6 overflow-y-auto xl:overflow-hidden thin-scrollbar pb-6 xl:pb-0">
        <Card className="p-5 flex flex-col bg-surface-900/60 backdrop-blur-sm xl:min-h-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-300 shrink-0">
                <Wand2 size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-surface-100">Brief del cliente</p>
                <p className="text-xs text-surface-400 truncate hidden sm:block">Cuanto más específico, mejor el análisis.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                className="flex-1 sm:flex-none whitespace-nowrap px-3 text-xs"
                variant="secondary"
                size="sm"
                onClick={() => callGenerate({ mode: 'generate' })}
                loading={generating}
              >
                <Sparkles size={14} className="mr-1" /> Generar con IA
              </Button>
              <Button
                className="flex-1 sm:flex-none whitespace-nowrap px-3 text-xs"
                variant="ghost"
                size="sm"
                onClick={() => callGenerate({ mode: 'regenerate' })}
                disabled={generating}
              >
                <RefreshCcw size={14} className="mr-1" /> Regenerar
              </Button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select
              label="Moneda"
              value={budget.currency}
              onChange={(e) => setBudget(prev => ({ ...prev, currency: e.target.value }))}
              options={[
                { value: 'ARS', label: 'ARS ($)' },
                { value: 'USD', label: 'USD ($)' },
                { value: 'EUR', label: 'EUR (€)' },
              ]}
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-surface-300">Adelanto</label>
              <div className="bg-surface-800/80 border border-surface-700/50 rounded-xl px-4 py-2.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-surface-300">%</span>
                  <span className="text-xs font-semibold text-primary-300">{budget.deposit_percent}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={budget.deposit_percent}
                  onChange={(e) => setBudget(prev => ({ ...prev, deposit_percent: Number(e.target.value) }))}
                  className="w-full accent-[#7a9e82]"
                />
              </div>
            </div>
            <Select
              label="Plantillas"
              value={selectedTemplateId}
              onChange={(e) => {
                const v = e.target.value
                setSelectedTemplateId(v)
                if (v) applyTemplate(v)
              }}
              options={templateOptions}
            />
          </div>

          <div className="mt-4 flex-1 flex flex-col gap-4 min-h-0">
            <div className="flex-1 min-h-[200px] flex flex-col">
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Requerimientos</label>
              <textarea
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="Ej: Necesito un ecommerce con catálogo, pagos, gestión de stock, panel admin, integraciones con MercadoPago y envíos..."
                className="w-full flex-1 resize-none bg-surface-950/70 border border-surface-700/60 text-surface-100 text-sm rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/40 transition-all"
              />
            </div>

            {analysis ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-primary-500/15 to-primary-600/5 border border-surface-800/60 rounded-2xl p-4 flex flex-col justify-center">
                  <p className="text-xs text-surface-400">Tipo detectado</p>
                  <p className="text-sm font-semibold text-surface-100 mt-1 line-clamp-2 leading-tight" title={analysis.project_type || '—'}>{analysis.project_type || '—'}</p>
                </div>
                <div className="bg-gradient-to-br from-surface-800/60 to-surface-900/30 border border-surface-800/60 rounded-2xl p-4 flex flex-col justify-center">
                  <p className="text-xs text-surface-400">Complejidad</p>
                  <p className="text-sm font-semibold text-surface-100 mt-1 line-clamp-2 leading-tight" title={analysis.complexity || '—'}>{analysis.complexity || '—'}</p>
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-2 mt-auto pt-2">
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={handleOpenSaveTemplate} disabled={savingTemplate}>
                  <Save size={16} /> Guardar plantilla
                </Button>
                <Button variant="secondary" onClick={handleExportPdf} loading={exporting}>
                  <Download size={16} /> Exportar PDF
                </Button>
              </div>
              <div className="text-xs text-surface-500 flex items-center gap-2">
                <FileText size={14} />
                {budget.number ? `N° ${budget.number}` : 'Borrador'}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5 flex flex-col bg-surface-900/60 backdrop-blur-sm xl:min-h-0 min-h-[800px]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-surface-100">Preview</p>
              <p className="text-xs text-surface-400">Edición rápida. El PDF respeta esta estructura.</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                className="w-[220px]"
                label="Validez (días)"
                type="number"
                value={budget.validity_days}
                onChange={(e) => setBudget(prev => ({ ...prev, validity_days: Number(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="mt-4 flex-1 min-h-0 overflow-y-auto thin-scrollbar pr-2">
            <div className="rounded-3xl border border-surface-800/60 bg-surface-950/40 overflow-hidden">
              <div className="px-6 py-5 border-b border-surface-800/60 bg-gradient-to-r from-primary-600/15 to-transparent">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs text-surface-400">PRESUPUESTO</p>
                    <input
                      value={budget.title}
                      onChange={(e) => setBudget(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Título profesional del presupuesto"
                      className="w-full bg-transparent text-lg font-bold text-surface-100 outline-none mt-1"
                    />
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-surface-400">N°</p>
                    <p className="text-sm font-semibold text-surface-200">{budget.number || 'Borrador'}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold text-primary-300 tracking-wider uppercase">Resumen</h3>
                  <textarea
                    value={budget.description}
                    onChange={(e) => setBudget(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descripción clara y comercial"
                    className="w-full min-h-[96px] resize-none bg-surface-900/40 border border-surface-800/60 rounded-2xl px-4 py-3 text-sm text-surface-100 outline-none focus:ring-2 focus:ring-primary-500/25"
                  />
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold text-primary-300 tracking-wider uppercase">Alcance</h3>
                  <textarea
                    value={budget.scope}
                    onChange={(e) => setBudget(prev => ({ ...prev, scope: e.target.value }))}
                    placeholder="Alcance del proyecto (qué incluye y hasta dónde llega)"
                    className="w-full min-h-[96px] resize-none bg-surface-900/40 border border-surface-800/60 rounded-2xl px-4 py-3 text-sm text-surface-100 outline-none focus:ring-2 focus:ring-primary-500/25"
                  />
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold text-primary-300 tracking-wider uppercase">Funcionalidades</h3>
                  <textarea
                    value={budget.features}
                    onChange={(e) => setBudget(prev => ({ ...prev, features: e.target.value }))}
                    placeholder={'- Login y roles\n- Panel admin\n- Integración de pagos\n- Reportes\n...'}
                    className="w-full min-h-[140px] resize-none bg-surface-900/40 border border-surface-800/60 rounded-2xl px-4 py-3 text-sm text-surface-100 outline-none focus:ring-2 focus:ring-primary-500/25"
                  />
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold text-primary-300 tracking-wider uppercase">Tecnologías sugeridas</h3>
                  <textarea
                    value={budget.suggested_tech}
                    onChange={(e) => setBudget(prev => ({ ...prev, suggested_tech: e.target.value }))}
                    placeholder={'- React + Vite\n- Supabase\n- Node/Express\n...'}
                    className="w-full min-h-[110px] resize-none bg-surface-900/40 border border-surface-800/60 rounded-2xl px-4 py-3 text-sm text-surface-100 outline-none focus:ring-2 focus:ring-primary-500/25"
                  />
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-surface-900/30 border border-surface-800/60 rounded-2xl p-4">
                    <p className="text-xs text-surface-400">Tiempo estimado</p>
                    <input
                      value={budget.estimated_time}
                      onChange={(e) => setBudget(prev => ({ ...prev, estimated_time: e.target.value }))}
                      placeholder="Ej: 6 a 8 semanas"
                      className="w-full bg-transparent text-base font-semibold text-surface-100 outline-none mt-1"
                    />
                  </div>
                  <div className="bg-gradient-to-br from-primary-500/12 to-primary-700/5 border border-surface-800/60 rounded-2xl p-4">
                    <p className="text-xs text-surface-400">Adelanto recomendado (%)</p>
                    <input
                      type="number"
                      value={budget.deposit_percent}
                      onChange={(e) => setBudget(prev => ({ ...prev, deposit_percent: Number(e.target.value) || 0 }))}
                      className="w-full bg-transparent text-base font-semibold text-surface-100 outline-none mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-primary-500/12 to-primary-700/5 border border-surface-800/60 rounded-2xl p-4">
                    <p className="text-xs text-surface-400">Valor estimado (Pago Único - {budget.currency})</p>
                    <input
                      type="number"
                      value={budget.estimated_price ?? ''}
                      onChange={(e) => setBudget(prev => ({ ...prev, estimated_price: e.target.value === '' ? null : Number(e.target.value) }))}
                      placeholder="Ej: 2500000"
                      className="w-full bg-transparent text-base font-semibold text-surface-100 outline-none mt-1"
                    />
                  </div>
                  <div className="bg-surface-900/30 border border-surface-800/60 rounded-2xl p-4">
                    <p className="text-xs text-surface-400">Valor Mensual (Suscripción - {budget.currency})</p>
                    <input
                      type="number"
                      value={budget.estimated_monthly_price ?? ''}
                      onChange={(e) => setBudget(prev => ({ ...prev, estimated_monthly_price: e.target.value === '' ? null : Number(e.target.value) }))}
                      placeholder="Ej: 400000"
                      className="w-full bg-transparent text-base font-semibold text-surface-100 outline-none mt-1"
                    />
                  </div>
                </div>

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold text-primary-300 tracking-wider uppercase">Forma de pago</h3>
                  <textarea
                    value={budget.payment_plan}
                    onChange={(e) => setBudget(prev => ({ ...prev, payment_plan: e.target.value }))}
                    placeholder="Forma de pago recomendada"
                    className="w-full min-h-[90px] resize-none bg-surface-900/40 border border-surface-800/60 rounded-2xl px-4 py-3 text-sm text-surface-100 outline-none focus:ring-2 focus:ring-primary-500/25"
                  />
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold text-primary-300 tracking-wider uppercase">Observaciones</h3>
                  <textarea
                    value={budget.observations}
                    onChange={(e) => setBudget(prev => ({ ...prev, observations: e.target.value }))}
                    placeholder="Aclaraciones estratégicas, supuestos, items opcionales"
                    className="w-full min-h-[90px] resize-none bg-surface-900/40 border border-surface-800/60 rounded-2xl px-4 py-3 text-sm text-surface-100 outline-none focus:ring-2 focus:ring-primary-500/25"
                  />
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold text-primary-300 tracking-wider uppercase">Condiciones</h3>
                  <textarea
                    value={budget.conditions}
                    onChange={(e) => setBudget(prev => ({ ...prev, conditions: e.target.value }))}
                    placeholder="Condiciones del servicio y validez del presupuesto"
                    className="w-full min-h-[110px] resize-none bg-surface-900/40 border border-surface-800/60 rounded-2xl px-4 py-3 text-sm text-surface-100 outline-none focus:ring-2 focus:ring-primary-500/25"
                  />
                </section>

                <div className="pt-2 border-t border-surface-800/60">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-surface-500">
                      Firma automática: <span className="text-surface-300 font-semibold">{settings?.company_name || 'Apoc Automation'}</span>
                    </div>
                    <div className="text-xs text-surface-500">
                      {settings?.logo_url ? 'Logo incluido' : 'Logo no configurado'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Modal isOpen={templateModalOpen} onClose={() => setTemplateModalOpen(false)} title="Guardar plantilla">
        <div className="p-6 space-y-4">
          <Input label="Nombre de la plantilla" value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setTemplateModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveTemplate} loading={savingTemplate}>Guardar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

