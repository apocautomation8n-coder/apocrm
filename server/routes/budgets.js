import { Router } from 'express'
import supabase from '../supabaseAdmin.js'
import { sendError, sendSuccess, safeDb } from '../utils.js'

const router = Router()

const clampNumber = (n, min, max) => {
  const x = Number(n)
  if (Number.isNaN(x)) return min
  return Math.min(max, Math.max(min, x))
}

const guessProjectType = (text) => {
  const t = (text || '').toLowerCase()
  const has = (...words) => words.some(w => t.includes(w))

  if (has('landing', 'landing page', 'one page')) return 'Landing page'
  if (has('ecommerce', 'tienda', 'carrito', 'checkout', 'mercadopago', 'pasarela de pago')) return 'Ecommerce'
  if (has('sistema de gestión', 'crm', 'erp', 'stock', 'inventario', 'facturación')) return 'Sistema de gestión'
  if (has('automatiz', 'workflow', 'n8n', 'zapier', 'make.com', 'integromat', 'webhook')) return 'Automatización'
  if (has('chatbot', 'whatsapp', 'bot', 'ia', 'gpt', 'openai')) return 'Chatbot IA'
  if (has('app móvil', 'app mobile', 'android', 'ios', 'react native')) return 'App móvil'
  if (has('saas', 'suscripción', 'multi-tenant', 'multitenant')) return 'SaaS'
  if (has('dashboard', 'report', 'reportes', 'bi', 'kpi')) return 'Dashboard administrativo'
  if (has('api', 'integración', 'integraciones', 'integrar', 'rest', 'graphql')) return 'Integración API'

  return 'Software a medida'
}

const fallbackGenerate = ({ requirements_text, currency, deposit_percent }) => {
  const projectType = guessProjectType(requirements_text)
  const base = projectType === 'Landing page' ? 900000
    : projectType === 'Ecommerce' ? 3200000
    : projectType === 'Sistema de gestión' ? 4800000
    : projectType === 'Automatización' ? 1600000
    : projectType === 'Chatbot IA' ? 2200000
    : projectType === 'App móvil' ? 6500000
    : projectType === 'SaaS' ? 7800000
    : projectType === 'Dashboard administrativo' ? 2600000
    : projectType === 'Integración API' ? 1800000
    : 3500000

  const dep = clampNumber(deposit_percent, 0, 100)

  return {
    analysis: {
      project_type: projectType,
      complexity: projectType === 'Landing page' ? 'Baja' : projectType === 'Automatización' ? 'Media' : 'Media/Alta',
      time_estimate: projectType === 'Landing page' ? '1 a 2 semanas' : '4 a 8 semanas',
      notes: 'Estimación generada sin proveedor de IA configurado.',
    },
    budget: {
      currency,
      deposit_percent: dep,
      title: `${projectType} – Propuesta Comercial y Técnica`,
      description: 'Propuesta orientada a resultados, enfocada en velocidad de implementación, calidad y escalabilidad. Incluye definición de alcance, desarrollo, QA y puesta en producción.',
      scope: 'Diseño y desarrollo del producto según requerimientos, configuración de entorno, pruebas, despliegue y capacitación breve para el uso del panel o flujo.',
      features: [
        'Relevamiento y definición de alcance (brief + validación)',
        'Diseño UI/UX premium (desktop + mobile)',
        'Desarrollo e implementación',
        'QA y pruebas funcionales',
        'Despliegue a producción y handover',
      ],
      suggested_tech: [
        'React + Vite (Frontend)',
        'Node + Express (API)',
        'Supabase (Auth + DB)',
      ],
      estimated_time: projectType === 'Landing page' ? '1 a 2 semanas' : '4 a 8 semanas',
      estimated_price: base,
      estimated_monthly_price: Math.round(base * 0.1),
      payment_plan: `Adelanto del ${dep}% para iniciar. Saldo en 2 hitos: 50% contra entrega de versión funcional y 50% al deploy a producción.`,
      observations: 'El valor final puede variar si aparecen integraciones adicionales, reglas complejas, multi-idioma, multi-rol o requerimientos no contemplados en el brief inicial.',
      conditions: 'Incluye soporte post-entrega por 14 días para correcciones. Mantenimiento evolutivo y hosting se cotizan aparte. Cambios de alcance se presupuestan como ampliación.',
      validity_days: 15,
    },
  }
}

const callOpenAIJson = async ({ model, apiKey, messages }) => {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.6,
      response_format: { type: 'json_object' },
    }),
  })

  const json = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = json?.error?.message || 'OpenAI error'
    throw new Error(msg)
  }

  const content = json?.choices?.[0]?.message?.content
  if (!content) throw new Error('Respuesta vacía del modelo')
  return JSON.parse(content)
}

router.post('/generate', async (req, res) => {
  try {
    const reqData = req.body || {};
    const { requirements_text, currency = 'ARS', deposit_percent = 30, mode = 'generate', current_budget } = reqData

    if (!requirements_text) return sendError(res, 'requirements_text is required', 400)

    const dep = clampNumber(deposit_percent, 0, 100)
    const cur = currency || 'ARS'

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.log('[Budgets] OPENAI_API_KEY no encontrada. Usando fallbackGenerate.');
      const fallbackData = fallbackGenerate({ requirements_text, currency: cur, deposit_percent: dep })
      return sendSuccess(res, fallbackData)
    }

    console.log('[Budgets] Generando con IA para:', requirements_text.substring(0, 50) + '...');

    const projectTypeHint = guessProjectType(requirements_text)
    const system = [
      'Actuás como un consultor comercial senior especializado en software, automatización e IA.',
      'Generás presupuestos realistas, estratégicos y listos para enviar al cliente sin edición.',
      'Evitás textos genéricos: incluís detalles concretos, supuestos explícitos y un alcance claro.',
      'Devolvés únicamente JSON válido, sin markdown ni texto extra.',
    ].join(' ')

    const user = {
      requirements_text,
      currency: cur,
      deposit_percent: dep,
      mode,
      project_type_hint: projectTypeHint,
      current_budget: mode === 'regenerate' ? (current_budget || null) : null,
      required_fields: {
        analysis: [
          'project_type',
          'complexity',
          'time_estimate',
          'modules_count',
          'customization_level',
          'maintenance_support',
          'external_integrations',
          'ui_ux',
          'automation_or_ai',
          'risk_flags',
          'upsell_suggestions',
        ],
        budget: [
          'title',
          'description',
          'scope',
          'features',
          'suggested_tech',
          'estimated_time',
          'estimated_price',
          'estimated_monthly_price',
          'payment_plan',
          'observations',
          'conditions',
          'validity_days',
          'currency',
          'deposit_percent',
        ],
      },
      pricing_rules: {
        default_currency: 'ARS',
        include_margin: true,
        estimated_price_should_be_number: true,
        min_price_ars: 350000,
        max_price_ars: 250000000,
      },
      tone_rules: {
        style: 'premium, tecnológico, profesional y convincente',
        avoid: ['genérico', 'plantilla vacía', 'frases sin contenido'],
      },
      detection_targets: [
        'landing page',
        'ecommerce',
        'sistema de gestión',
        'automatización',
        'chatbot IA',
        'app móvil',
        'SaaS',
        'dashboard administrativo',
        'integración API',
      ],
    }

    const schemaHint = {
      analysis: {
        project_type: 'Ecommerce',
        complexity: 'Media/Alta',
        time_estimate: '6 a 8 semanas',
        modules_count: 6,
        customization_level: 'Medio/Alto',
        maintenance_support: 'Sí (opcional mensual)',
        external_integrations: ['MercadoPago', 'Envíos'],
        ui_ux: 'Incluido (responsive premium)',
        automation_or_ai: 'No aplica',
        risk_flags: ['Alcance sujeto a confirmación de integraciones'],
        upsell_suggestions: ['SEO técnico', 'Automatización de emails transaccionales'],
      },
      budget: {
        currency: 'ARS',
        deposit_percent: 30,
        validity_days: 15,
        title: 'Implementación Ecommerce con Panel Admin – Propuesta Comercial',
        description: 'Texto comercial concreto (2–4 párrafos cortos) adaptado al requerimiento.',
        scope: 'Texto claro: qué incluye + qué no incluye + supuestos.',
        features: ['Lista concreta (8–14 ítems)'],
        suggested_tech: ['Lista concreta (4–8 ítems)'],
        estimated_time: '6 a 8 semanas',
        estimated_price: 4200000,
        estimated_monthly_price: 400000,
        payment_plan: 'Texto claro con hitos y porcentajes. Consistente con deposit_percent.',
        observations: 'Texto con supuestos y mejoras recomendadas.',
        conditions: 'Condiciones: soporte, cambios de alcance, propiedad intelectual, hosting, garantía, etc.',
      },
    }

    const messages = [
      { role: 'system', content: system },
      { role: 'user', content: JSON.stringify({ user, schemaHint }) },
    ]

    const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini'
    const out = await callOpenAIJson({ model, apiKey, messages })

    const rawBudget = out?.budget || {}
    const rawAnalysis = out?.analysis || {}

    const cleaned = {
      analysis: {
        project_type: rawAnalysis.project_type || projectTypeHint,
        complexity: rawAnalysis.complexity || null,
        time_estimate: rawAnalysis.time_estimate || rawBudget.estimated_time || null,
        modules_count: rawAnalysis.modules_count ?? null,
        customization_level: rawAnalysis.customization_level ?? null,
        maintenance_support: rawAnalysis.maintenance_support ?? null,
        external_integrations: rawAnalysis.external_integrations ?? [],
        ui_ux: rawAnalysis.ui_ux ?? null,
        automation_or_ai: rawAnalysis.automation_or_ai ?? null,
        risk_flags: rawAnalysis.risk_flags ?? [],
        upsell_suggestions: rawAnalysis.upsell_suggestions ?? [],
      },
      budget: {
        ...rawBudget,
        currency: cur,
        deposit_percent: dep,
        validity_days: clampNumber(rawBudget.validity_days ?? 15, 1, 90),
        estimated_price: clampNumber(rawBudget.estimated_price ?? 0, cur === 'ARS' ? 350000 : 1, cur === 'ARS' ? 250000000 : 1000000000),
        estimated_monthly_price: clampNumber(rawBudget.estimated_monthly_price ?? 0, 0, cur === 'ARS' ? 250000000 : 1000000000),
        features: Array.isArray(rawBudget.features) ? rawBudget.features : [],
        suggested_tech: Array.isArray(rawBudget.suggested_tech) ? rawBudget.suggested_tech : [],
      },
    }

    return sendSuccess(res, cleaned)
  } catch (err) {
    return sendError(res, err)
  }
})

const ensureBudgetSettings = async () => {
  const { data: settings, error } = await safeDb(() =>
    supabase.from('budget_settings').select('*').limit(1).single()
  )

  if (!error && settings) return settings

  const { data: inserted, error: insertErr } = await safeDb(() =>
    supabase
      .from('budget_settings')
      .insert({ budget_prefix: 'PRE', next_number: 1 })
      .select('*')
      .single()
  )

  if (insertErr) throw insertErr
  return inserted
}

const reserveNextBudgetNumber = async () => {
  for (let i = 0; i < 6; i++) {
    const settings = await ensureBudgetSettings()
    const expected = settings.next_number || 1
    const prefix = settings.budget_prefix || 'PRE'

    const { data: updated, error } = await safeDb(() =>
      supabase
        .from('budget_settings')
        .update({ next_number: expected + 1, updated_at: new Date().toISOString() })
        .eq('id', settings.id)
        .eq('next_number', expected)
        .select('*')
        .single()
    )

    if (!error && updated) {
      const number = `${prefix}-${String(expected).padStart(5, '0')}`
      return { number, sequence: expected, prefix }
    }
  }

  throw new Error('No se pudo reservar numeración de presupuesto')
}

router.post('/issue', async (req, res) => {
  try {
    const reqData = req.body || {};
    const { requirements_text = '', analysis_json = null, budget_json } = reqData
    if (!budget_json) return sendError(res, 'budget_json is required', 400)

    const budget = budget_json || {}
    const currency = budget.currency || 'ARS'
    const deposit = clampNumber(budget.deposit_percent ?? 30, 0, 100)

    const { number, sequence, prefix } = budget.number
      ? { number: budget.number, sequence: null, prefix: null }
      : await reserveNextBudgetNumber()

    const issueDate = budget.issue_date || new Date().toISOString().slice(0, 10)

    const insertPayload = {
      number,
      sequence,
      prefix,
      currency,
      deposit_percent: deposit,
      issue_date: issueDate,
      requirements_text,
      analysis_json,
      budget_json: { ...budget, number, currency, deposit_percent: deposit, issue_date: issueDate },
    }

    const { data: created, error } = await safeDb(() =>
      supabase.from('budgets').insert(insertPayload).select('*').single()
    )

    if (error) throw error

    return sendSuccess(res, { budget: created.budget_json })
  } catch (err) {
    return sendError(res, err)
  }
})

router.get('/templates', async (req, res) => {
  try {
    const { data, error } = await safeDb(() =>
      supabase
        .from('budget_templates')
        .select('id, name, template_json, created_at')
        .order('created_at', { ascending: false })
    )
    if (error) throw error
    return sendSuccess(res, data || [])
  } catch (err) {
    return sendError(res, err)
  }
})

router.post('/templates', async (req, res) => {
  try {
    const reqData = req.body || {};
    const { name, template_json } = reqData
    if (!name) return sendError(res, 'name is required', 400)
    if (!template_json) return sendError(res, 'template_json is required', 400)

    const { data, error } = await safeDb(() =>
      supabase
        .from('budget_templates')
        .insert({ name, template_json })
        .select('id, name, created_at')
        .single()
    )
    if (error) throw error

    return sendSuccess(res, data)
  } catch (err) {
    return sendError(res, err)
  }
})

export default router

