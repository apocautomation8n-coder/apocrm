import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import KanbanCard from './KanbanCard'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

export default function KanbanColumn({
  stage,
  cards,
  contacts,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
  onUpdateStage,
  onDeleteStage,
}) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [selectedContactId, setSelectedContactId] = useState('')
  const [cardNotes, setCardNotes] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [stageName, setStageName] = useState(stage.name)
  const [showCardDetail, setShowCardDetail] = useState(null)

  const { setNodeRef, isOver } = useDroppable({ id: stage.id })

  const handleAddCard = () => {
    if (!selectedContactId) return
    onAddCard(stage.id, selectedContactId, cardNotes)
    setShowAddModal(false)
    setSelectedContactId('')
    setCardNotes('')
  }

  const handleNameSave = () => {
    if (stageName.trim() && stageName !== stage.name) {
      onUpdateStage(stage.id, { name: stageName.trim() })
    }
    setEditingName(false)
  }

  return (
    <>
      <div
        ref={setNodeRef}
        className={`
          min-w-[300px] w-[300px] flex flex-col rounded-2xl shrink-0
          bg-surface-900/50 border transition-all duration-200
          ${isOver ? 'border-primary-500/50 bg-primary-500/5' : 'border-surface-800/40'}
        `}
      >
        {/* Column header */}
        <div className="px-4 py-3 border-b border-surface-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: stage.color || '#6366f1' }}
            />
            {editingName ? (
              <input
                autoFocus
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                className="text-sm font-semibold text-surface-100 bg-transparent border-b border-primary-500 focus:outline-none px-1"
              />
            ) : (
              <h3
                className="text-sm font-semibold text-surface-200 truncate cursor-pointer hover:text-surface-100"
                onClick={() => setEditingName(true)}
              >
                {stage.name}
              </h3>
            )}
            <span className="text-xs text-surface-500 bg-surface-800/60 px-2 py-0.5 rounded-full">
              {cards.length}
            </span>
          </div>

          <div className="flex items-center gap-1 relative">
            <button
              onClick={() => setShowAddModal(true)}
              className="p-1 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800/60 transition-all cursor-pointer"
            >
              <Plus size={15} />
            </button>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800/60 transition-all cursor-pointer"
            >
              <MoreHorizontal size={15} />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-8 z-20 w-40 bg-surface-800 border border-surface-700 rounded-xl shadow-xl py-1 animate-scale-in">
                <button
                  onClick={() => { setEditingName(true); setShowMenu(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:bg-surface-700 transition-colors cursor-pointer"
                >
                  <Pencil size={14} /> Editar nombre
                </button>
                <button
                  onClick={() => {
                    const color = prompt('Color HEX (ej: #10b981):', stage.color)
                    if (color) onUpdateStage(stage.id, { color })
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:bg-surface-700 transition-colors cursor-pointer"
                >
                  🎨 Cambiar color
                </button>
                <button
                  onClick={() => { onDeleteStage(stage.id); setShowMenu(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 size={14} /> Eliminar etapa
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Cards */}
        <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[100px]">
          {cards.map(card => (
            <KanbanCard
              key={card.id}
              card={card}
              onClick={() => setShowCardDetail(card)}
            />
          ))}
        </div>
      </div>

      {/* Add card modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={`Agregar lead a "${stage.name}"`}>
        <div className="space-y-4">
          <Select
            label="Contacto"
            value={selectedContactId}
            onChange={(e) => setSelectedContactId(e.target.value)}
          >
            <option value="">Seleccionar contacto...</option>
            {contacts.map(c => (
              <option key={c.id} value={c.id}>{c.name || c.phone} — {c.phone}</option>
            ))}
          </Select>
          <Input
            label="Notas"
            value={cardNotes}
            onChange={(e) => setCardNotes(e.target.value)}
            placeholder="Notas opcionales..."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancelar</Button>
            <Button onClick={handleAddCard}>Agregar</Button>
          </div>
        </div>
      </Modal>

      {/* Card detail modal */}
      <Modal isOpen={!!showCardDetail} onClose={() => setShowCardDetail(null)} title="Detalle del Lead">
        {showCardDetail && (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-surface-400">Contacto</p>
              <p className="text-surface-200 font-medium">{showCardDetail.contacts?.name || 'Sin nombre'}</p>
              <p className="text-sm text-surface-400">{showCardDetail.contacts?.phone}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Notas</label>
              <textarea
                defaultValue={showCardDetail.notes || ''}
                onBlur={(e) => {
                  if (e.target.value !== (showCardDetail.notes || '')) {
                    onUpdateCard(showCardDetail.id, { notes: e.target.value })
                    setShowCardDetail(prev => ({ ...prev, notes: e.target.value }))
                  }
                }}
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-800/80 border border-surface-700/50 text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 text-sm resize-none"
                placeholder="Agregar notas..."
              />
            </div>
            <div className="flex justify-between pt-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  onDeleteCard(showCardDetail.id)
                  setShowCardDetail(null)
                }}
              >
                <Trash2 size={14} /> Eliminar
              </Button>
              <Button variant="secondary" onClick={() => setShowCardDetail(null)}>Cerrar</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
