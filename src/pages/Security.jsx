import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ShieldCheck, Lock, Unlock, Plus, Eye, EyeOff, Copy, Check,
  Trash2, Pencil, Search, X, Key, Globe, User, FileText,
  Tag, AlertTriangle, RefreshCw, ChevronDown, Save, ExternalLink,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { encryptValue, decryptValue, getPasswordStrength } from '../lib/crypto'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const CATEGORIES = [
  { value: 'hosting',    label: 'Hosting / Servidor', emoji: '🖥️' },
  { value: 'cms',        label: 'CMS / WordPress',    emoji: '📝' },
  { value: 'api',        label: 'API Keys / Tokens',  emoji: '🔑' },
  { value: 'social',     label: 'Redes Sociales',     emoji: '📱' },
  { value: 'ftp',        label: 'FTP / SSH',          emoji: '📂' },
  { value: 'email',      label: 'Email / SMTP',       emoji: '✉️' },
  { value: 'database',   label: 'Base de Datos',      emoji: '🗄️' },
  { value: 'general',    label: 'General',            emoji: '🔒' },
]

const getCategoryInfo = (value) =>
  CATEGORIES.find((c) => c.value === value) || CATEGORIES[CATEGORIES.length - 1]

const SENTINEL_LABEL = '__apoc_vault_sentinel__'

// ─────────────────────────────────────────────
// Password Strength Bar
// ─────────────────────────────────────────────
function StrengthBar({ password }) {
  const { score, label, color } = getPasswordStrength(password)
  if (!password) return null
  return (
    <div className="space-y-1 mt-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ backgroundColor: i <= score ? color : '#334155' }}
          />
        ))}
      </div>
      <p className="text-xs" style={{ color }}>{label}</p>
    </div>
  )
}

// ─────────────────────────────────────────────
// Copyable Field
// ─────────────────────────────────────────────
function CopyField({ value, hidden = false, label }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      title={`Copiar ${label}`}
      className="p-1.5 rounded-lg text-surface-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer"
    >
      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
    </button>
  )
}

// ─────────────────────────────────────────────
// Credential Card (row in the table)
// ─────────────────────────────────────────────
function CredentialRow({ cred, masterPassword, onEdit, onDelete }) {
  const [revealed, setRevealed] = useState(false)
  const [decrypted, setDecrypted] = useState(null)
  const [decrypting, setDecrypting] = useState(false)
  const [error, setError] = useState(false)

  const handleReveal = async () => {
    if (revealed) { setRevealed(false); setDecrypted(null); return }
    setDecrypting(true)
    setError(false)
    try {
      const plain = await decryptValue(
        cred.encrypted_value, cred.iv, cred.salt, masterPassword
      )
      setDecrypted(plain)
      setRevealed(true)
    } catch {
      setError(true)
    } finally {
      setDecrypting(false)
    }
  }

  const cat = getCategoryInfo(cred.category)

  return (
    <tr className="group border-b border-surface-800/60 hover:bg-surface-800/20 transition-colors">
      {/* Category + Label */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-lg leading-none">{cat.emoji}</span>
          <div>
            <div className="font-medium text-surface-100 text-sm">{cred.label}</div>
            <div className="text-[11px] text-surface-500">{cat.label}</div>
          </div>
        </div>
      </td>

      {/* Client */}
      <td className="px-4 py-3">
        <span className="text-sm text-surface-200">{cred.client_name}</span>
      </td>

      {/* Username */}
      <td className="px-4 py-3">
        {cred.username ? (
          <div className="flex items-center gap-1">
            <span className="text-sm text-surface-300 font-mono">{cred.username}</span>
            <CopyField value={cred.username} label="usuario" />
          </div>
        ) : (
          <span className="text-surface-600 text-xs">—</span>
        )}
      </td>

      {/* Password/Value */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <span className={`text-sm font-mono ${revealed ? 'text-emerald-300' : 'text-surface-500'}`}>
            {decrypting
              ? <RefreshCw size={14} className="animate-spin inline" />
              : revealed && decrypted
                ? decrypted
                : error
                  ? <span className="text-red-400 text-xs">Contraseña incorrecta</span>
                  : '••••••••••'
            }
          </span>
          {revealed && decrypted && <CopyField value={decrypted} label="contraseña" />}
          <button
            onClick={handleReveal}
            className="p-1.5 rounded-lg text-surface-400 hover:text-primary-400 hover:bg-primary-500/10 transition-all cursor-pointer"
            title={revealed ? 'Ocultar' : 'Revelar'}
          >
            {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </td>

      {/* URL */}
      <td className="px-4 py-3">
        {cred.url ? (
          <a
            href={cred.url.startsWith('http') ? cred.url : `https://${cred.url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-primary-400 hover:text-primary-300 text-xs transition-colors"
          >
            <Globe size={12} />
            <span className="truncate max-w-[120px]">
              {cred.url.replace(/^https?:\/\//, '')}
            </span>
            <ExternalLink size={10} />
          </a>
        ) : (
          <span className="text-surface-600 text-xs">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(cred)}
            className="p-1.5 rounded-lg text-surface-400 hover:text-primary-400 hover:bg-primary-500/10 transition-all cursor-pointer"
            title="Editar"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => onDelete(cred.id)}
            className="p-1.5 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
            title="Eliminar"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function Security() {
  // Vault lock state
  const [locked, setLocked] = useState(true)
  const [masterInput, setMasterInput] = useState('')
  const [showMaster, setShowMaster] = useState(false)
  const [unlockError, setUnlockError] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const masterPassword = useRef(null) // never stored in state, stays in closure

  // Data
  const [credentials, setCredentials] = useState([])
  const [loading, setLoading] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterClient, setFilterClient] = useState('all')

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCred, setEditingCred] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    client_name: '', category: 'general', label: '',
    username: '', value: '', url: '', notes: ''
  })
  const [showFormPass, setShowFormPass] = useState(false)

  // ── Fetch credentials ──────────────────────
  const fetchCredentials = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('credential_vaults')
        .select('*')
        .neq('label', SENTINEL_LABEL)
        .order('client_name', { ascending: true })
      if (error) throw error
      setCredentials(data || [])
    } catch (err) {
      console.error('Error fetching credentials:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Unlock vault ───────────────────────────
  const handleUnlock = async (e) => {
    e.preventDefault()
    if (!masterInput.trim()) return
    setUnlocking(true)
    setUnlockError('')

    try {
      // Check if a sentinel exists to validate the password
      const { data: sentinels } = await supabase
        .from('credential_vaults')
        .select('*')
        .eq('label', SENTINEL_LABEL)
        .limit(1)

      if (sentinels && sentinels.length > 0) {
        const s = sentinels[0]
        try {
          await decryptValue(s.encrypted_value, s.iv, s.salt, masterInput)
        } catch {
          setUnlockError('Contraseña maestra incorrecta.')
          setUnlocking(false)
          return
        }
      } else {
        // First time — create a sentinel to validate future logins
        const { data: { user } } = await supabase.auth.getUser()
        const { encryptedValue, iv, salt } = await encryptValue('__sentinel__', masterInput)
        const { error: sentinelError } = await supabase.from('credential_vaults').insert({
          client_name: '__system__',
          category: 'general',
          label: SENTINEL_LABEL,
          username: null,
          encrypted_value: encryptedValue,
          iv, salt,
          url: null,
          notes: 'Sentinel — do not delete',
          created_by: user?.id || null,
        })
        if (sentinelError) throw sentinelError
      }

      // Password OK — unlock
      masterPassword.current = masterInput
      setMasterInput('')
      setLocked(false)
      fetchCredentials()
    } catch (err) {
      console.error(err)
      setUnlockError('Error al desbloquear. Inténtalo de nuevo.')
    } finally {
      setUnlocking(false)
    }
  }

  // ── Lock vault ─────────────────────────────
  const handleLock = () => {
    masterPassword.current = null
    setLocked(true)
    setCredentials([])
    setSearch('')
    setFilterCategory('all')
    setFilterClient('all')
  }

  // ── Save credential ────────────────────────
  const handleSave = async (e) => {
    e.preventDefault()

    // If editing and no new value provided, we just update text fields
    const hasNewValue = form.value.trim().length > 0
    if (!hasNewValue && !editingCred) {
      alert('Por favor, ingresá una contraseña o valor.')
      return
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // 1. Prepare payload with basic fields
      const payload = {
        client_name: form.client_name.trim(),
        category: form.category,
        label: form.label.trim(),
        username: form.username.trim() || null,
        url: form.url.trim() || null,
        notes: form.notes.trim() || null,
        updated_at: new Date().toISOString(),
        created_by: user?.id || null,
      }

      // 2. Add encrypted fields if a new value was provided
      if (hasNewValue) {
        const { encryptedValue, iv, salt } = await encryptValue(form.value, masterPassword.current)
        payload.encrypted_value = encryptedValue
        payload.iv = iv
        payload.salt = salt
      }

      // 3. Perform DB operation
      if (editingCred) {
        const { error } = await supabase
          .from('credential_vaults')
          .update(payload)
          .eq('id', editingCred.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('credential_vaults')
          .insert(payload)
        if (error) throw error
      }

      setIsModalOpen(false)
      resetForm()
      fetchCredentials()
    } catch (err) {
      console.error('Error saving credential:', err)
      const fullError = `
        Mensaje: ${err.message || 'Error desconocido'}
        Detalles: ${err.details || 'ninguno'}
        Sugerencia: ${err.hint || 'ninguna'}
      `.trim()
      alert('Error al guardar:\n' + fullError)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta credencial permanentemente?')) return
    await supabase.from('credential_vaults').delete().eq('id', id)
    fetchCredentials()
  }

  const openEdit = (cred) => {
    setEditingCred(cred)
    setForm({
      client_name: cred.client_name,
      category: cred.category,
      label: cred.label,
      username: cred.username || '',
      value: '',
      url: cred.url || '',
      notes: cred.notes || '',
    })
    setIsModalOpen(true)
  }

  const openNew = () => {
    setEditingCred(null)
    resetForm()
    setIsModalOpen(true)
  }

  const resetForm = () => {
    setForm({ client_name: '', category: 'general', label: '', username: '', value: '', url: '', notes: '' })
    setShowFormPass(false)
  }

  // ── Filter computed ─────────────────────────
  const uniqueClients = [...new Set(credentials.map((c) => c.client_name))].sort()
  const filtered = credentials.filter((c) => {
    const matchSearch =
      !search ||
      c.label.toLowerCase().includes(search.toLowerCase()) ||
      c.client_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.username || '').toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCategory === 'all' || c.category === filterCategory
    const matchClient = filterClient === 'all' || c.client_name === filterClient
    return matchSearch && matchCat && matchClient
  })

  // ─────────────────────────────────────────────
  // LOCK SCREEN
  // ─────────────────────────────────────────────
  if (locked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-surface-950/50">
        <div className="w-full max-w-md">
          {/* Glow effect */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
          </div>

          <div className="relative text-center mb-8 space-y-3">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary-500/10 border border-primary-500/20 mb-2 mx-auto">
              <Lock size={36} className="text-primary-400" />
            </div>
            <h1 className="text-2xl font-bold text-surface-50">Bóveda de Credenciales</h1>
            <p className="text-surface-400 text-sm max-w-xs mx-auto">
              Ingresá tu contraseña maestra para acceder. Las credenciales están cifradas con AES-256-GCM.
            </p>
          </div>

          <div className="relative bg-surface-900/80 backdrop-blur-sm border border-surface-700/50 rounded-2xl p-6 shadow-2xl shadow-black/40">
            <form onSubmit={handleUnlock} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-surface-300">
                  Contraseña Maestra
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
                  <input
                    type={showMaster ? 'text' : 'password'}
                    value={masterInput}
                    onChange={(e) => { setMasterInput(e.target.value); setUnlockError('') }}
                    placeholder="••••••••••"
                    autoFocus
                    required
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-surface-800/80 border border-surface-700/50 text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/50 transition-all duration-200 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMaster(!showMaster)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 cursor-pointer"
                  >
                    {showMaster ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {unlockError && (
                  <p className="flex items-center gap-1.5 text-xs text-red-400 mt-1">
                    <AlertTriangle size={12} />
                    {unlockError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={unlocking || !masterInput}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm bg-primary-600 hover:bg-primary-500 text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {unlocking ? (
                  <><RefreshCw size={16} className="animate-spin" /> Verificando...</>
                ) : (
                  <><Unlock size={16} /> Desbloquear Bóveda</>
                )}
              </button>
            </form>

            <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
              <p className="text-[11px] text-amber-400/80 flex items-start gap-1.5">
                <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                La contraseña maestra <strong>no se almacena</strong>. Si la perdés, las credenciales no podrán recuperarse.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // MAIN VAULT VIEW
  // ─────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <ShieldCheck size={20} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-50">Bóveda de Credenciales</h1>
            <p className="text-surface-400 text-sm">{credentials.length} credencial{credentials.length !== 1 ? 'es' : ''} almacenada{credentials.length !== 1 ? 's' : ''} · AES-256-GCM</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleLock} className="flex items-center gap-2 text-amber-400 border-amber-500/30 hover:bg-amber-500/10">
            <Lock size={16} />
            Bloquear
          </Button>
          <Button variant="primary" onClick={openNew} className="flex items-center gap-2">
            <Plus size={18} />
            Nueva Credencial
          </Button>
        </div>
      </div>

      {/* Security badge */}
      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/5 border border-emerald-500/20 rounded-xl w-fit">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-emerald-400 text-xs font-medium">Bóveda desbloqueada · Cifrado activo</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
          <input
            type="text"
            placeholder="Buscar por label, cliente, usuario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-800/80 border border-surface-700/50 text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 text-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 cursor-pointer">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="relative">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="pl-3 pr-8 py-2 rounded-xl bg-surface-800/80 border border-surface-700/50 text-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 appearance-none cursor-pointer"
          >
            <option value="all">Todas las categorías</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
        </div>

        {uniqueClients.length > 0 && (
          <div className="relative">
            <select
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="pl-3 pr-8 py-2 rounded-xl bg-surface-800/80 border border-surface-700/50 text-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 appearance-none cursor-pointer"
            >
              <option value="all">Todos los clientes</option>
              {uniqueClients.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Table */}
      <Card className="overflow-hidden border-surface-800/60 bg-surface-900/50 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-800/40 border-b border-surface-800/60">
                {['Credencial', 'Cliente', 'Usuario', 'Contraseña / Valor', 'URL', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-surface-400">
                      <RefreshCw size={20} className="animate-spin" />
                      <span className="text-sm">Cargando credenciales...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-surface-500">
                      <Key size={40} className="text-surface-700" />
                      <div>
                        <p className="text-sm font-medium text-surface-400">
                          {search || filterCategory !== 'all' || filterClient !== 'all'
                            ? 'No hay resultados para la búsqueda'
                            : 'No hay credenciales guardadas'}
                        </p>
                        {!search && filterCategory === 'all' && filterClient === 'all' && (
                          <p className="text-xs mt-1">Hacé clic en "Nueva Credencial" para comenzar</p>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((cred) => (
                  <CredentialRow
                    key={cred.id}
                    cred={cred}
                    masterPassword={masterPassword.current}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm() }}
        title={editingCred ? 'Editar Credencial' : 'Nueva Credencial'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Cliente / Proyecto"
              placeholder="Ej: MundoLaser"
              value={form.client_name}
              onChange={(e) => setForm({ ...form, client_name: e.target.value })}
              required
              icon={User}
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-surface-300">Categoría</label>
              <div className="relative">
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full pl-3 pr-8 py-2.5 rounded-xl bg-surface-800/80 border border-surface-700/50 text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 appearance-none cursor-pointer"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <Input
            label="Etiqueta / Nombre"
            placeholder="Ej: Admin WordPress, cPanel, API Stripe..."
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            required
            icon={Tag}
          />

          <Input
            label="Usuario / Email"
            placeholder="usuario@ejemplo.com"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            icon={User}
          />

          {/* Password with strength meter */}
          <div className="space-y-1">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-surface-300">
                Contraseña / Valor {editingCred && <span className="text-surface-500 font-normal">(dejá vacío para no cambiarla)</span>}
              </label>
              <div className="relative">
                <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
                <input
                  type={showFormPass ? 'text' : 'password'}
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  placeholder={editingCred ? '(sin cambios)' : 'Ingresá el valor a cifrar'}
                  required={!editingCred}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-surface-800/80 border border-surface-700/50 text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/50 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowFormPass(!showFormPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 cursor-pointer"
                >
                  {showFormPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <StrengthBar password={form.value} />
          </div>

          <Input
            label="URL (opcional)"
            placeholder="https://ejemplo.com/wp-admin"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            icon={Globe}
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-surface-300">Notas (opcional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Información adicional..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-800/80 border border-surface-700/50 text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition-all text-sm resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              type="button"
              className="flex-1"
              onClick={() => { setIsModalOpen(false); resetForm() }}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2"
            >
              {saving
                ? <><RefreshCw size={16} className="animate-spin" /> Cifrando...</>
                : <><Save size={16} /> {editingCred ? 'Actualizar' : 'Guardar Cifrado'}</>
              }
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
