import { useState, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import { supabase } from '../../lib/supabaseClient'
import KanbanColumn from './KanbanColumn'
import KanbanCard from './KanbanCard'
import toast from 'react-hot-toast'

export default function KanbanBoard() {
  const [stages, setStages] = useState([])
  const [cards, setCards] = useState([])
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCard, setActiveCard] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const fetchData = async () => {
    setLoading(true)
    const [stagesRes, cardsRes, contactsRes] = await Promise.all([
      supabase.from('pipeline_stages').select('*').order('position'),
      supabase.from('pipeline_cards').select('*, contacts(id, name, phone)').order('created_at'),
      supabase.from('contacts').select('id, name, phone'),
    ])
    if (stagesRes.data) setStages(stagesRes.data)
    if (cardsRes.data) setCards(cardsRes.data)
    if (contactsRes.data) setContacts(contactsRes.data)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const getCardsForStage = (stageId) => cards.filter(c => c.stage_id === stageId)

  const handleDragStart = (event) => {
    const card = cards.find(c => c.id === event.active.id)
    setActiveCard(card)
  }

  const handleDragEnd = async (event) => {
    setActiveCard(null)
    const { active, over } = event
    if (!over) return

    const cardId = active.id
    let targetStageId = over.id

    // If dropped on a card, find its stage
    const overCard = cards.find(c => c.id === over.id)
    if (overCard) targetStageId = overCard.stage_id

    // Check if it's dropped on a stage column
    const isStage = stages.find(s => s.id === targetStageId)
    if (!isStage) return

    const card = cards.find(c => c.id === cardId)
    if (!card || card.stage_id === targetStageId) return

    // Optimistic update
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, stage_id: targetStageId } : c))

    const { error } = await supabase
      .from('pipeline_cards')
      .update({ stage_id: targetStageId, updated_at: new Date().toISOString() })
      .eq('id', cardId)

    if (error) {
      toast.error('Error moviendo card')
      fetchData() // rollback
    }
  }

  const addCard = async (stageId, contactId, notes) => {
    const { data, error } = await supabase
      .from('pipeline_cards')
      .insert({ stage_id: stageId, contact_id: contactId, notes })
      .select('*, contacts(id, name, phone)')
      .single()
    if (error) {
      toast.error('Error creando card')
    } else {
      setCards(prev => [...prev, data])
      toast.success('Lead agregado')
    }
  }

  const updateCard = async (cardId, updates) => {
    const { error } = await supabase
      .from('pipeline_cards')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', cardId)
    if (error) {
      toast.error('Error actualizando card')
    } else {
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, ...updates } : c))
    }
  }

  const deleteCard = async (cardId) => {
    const { error } = await supabase.from('pipeline_cards').delete().eq('id', cardId)
    if (error) toast.error('Error eliminando card')
    else setCards(prev => prev.filter(c => c.id !== cardId))
  }

  const addStage = async (name) => {
    const maxPos = stages.reduce((max, s) => Math.max(max, s.position), 0)
    const { data, error } = await supabase
      .from('pipeline_stages')
      .insert({ name, position: maxPos + 1 })
      .select()
      .single()
    if (error) toast.error('Error creando etapa')
    else {
      setStages(prev => [...prev, data])
      toast.success('Etapa creada')
    }
  }

  const updateStage = async (stageId, updates) => {
    const { error } = await supabase.from('pipeline_stages').update(updates).eq('id', stageId)
    if (error) toast.error('Error actualizando etapa')
    else setStages(prev => prev.map(s => s.id === stageId ? { ...s, ...updates } : s))
  }

  const deleteStage = async (stageId) => {
    const stageCards = getCardsForStage(stageId)
    if (stageCards.length > 0) return toast.error('No se puede eliminar una etapa con cards')
    const { error } = await supabase.from('pipeline_stages').delete().eq('id', stageId)
    if (error) toast.error('Error eliminando etapa')
    else {
      setStages(prev => prev.filter(s => s.id !== stageId))
      toast.success('Etapa eliminada')
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        <SortableContext items={stages.map(s => s.id)} strategy={horizontalListSortingStrategy}>
          {stages.map(stage => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              cards={getCardsForStage(stage.id)}
              contacts={contacts}
              onAddCard={addCard}
              onUpdateCard={updateCard}
              onDeleteCard={deleteCard}
              onUpdateStage={updateStage}
              onDeleteStage={deleteStage}
            />
          ))}
        </SortableContext>

        {/* Add stage button */}
        <button
          onClick={() => {
            const name = prompt('Nombre de la nueva etapa:')
            if (name?.trim()) addStage(name.trim())
          }}
          className="min-w-[280px] h-fit p-4 rounded-2xl border-2 border-dashed border-surface-700/50 text-surface-500 hover:text-surface-300 hover:border-surface-600 transition-all text-sm font-medium cursor-pointer flex items-center justify-center gap-2"
        >
          + Agregar etapa
        </button>
      </div>

      <DragOverlay>
        {activeCard && (
          <KanbanCard card={activeCard} isDragging />
        )}
      </DragOverlay>
    </DndContext>
  )
}
