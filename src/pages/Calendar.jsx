import { useState, useEffect } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../lib/supabaseClient'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Clock, Trash2, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [events, setEvents] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [showEventModal, setShowEventModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title: '', date: '', start_time: '', end_time: '', description: '', guests: '' })

  // Use local Supabase table for events (can be enhanced with Google Calendar later)
  const fetchEvents = async () => {
    // We'll store calendar events in a simple table. Let's create it if not exists
    // For now use local state with supabase custom table
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .order('date')
    if (!error && data) setEvents(data)
  }

  useEffect(() => { fetchEvents() }, [])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days = []
  let day = calendarStart
  while (day <= calendarEnd) {
    days.push(day)
    day = addDays(day, 1)
  }

  const getEventsForDay = (date) =>
    events.filter(e => isSameDay(new Date(e.date), date))

  const handleSave = async () => {
    if (!form.title.trim() || !form.date) return toast.error('Título y fecha son obligatorios')

    const payload = {
      title: form.title,
      date: form.date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      description: form.description || null,
      guests: form.guests || null,
    }

    if (editing) {
      const { error } = await supabase.from('calendar_events').update(payload).eq('id', editing.id)
      if (error) return toast.error('Error actualizando evento')
      toast.success('Evento actualizado')
    } else {
      const { error } = await supabase.from('calendar_events').insert(payload)
      if (error) {
        // Table might not exist, let's handle gracefully
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          toast.error('Tabla calendar_events no existe. Ejecutá el SQL adicional.')
        } else {
          toast.error('Error creando evento')
        }
        return
      }

      // Send webhook to n8n to generate Meet link and email
      try {
        await fetch('https://automation8n.fluxia.site/webhook/e64e181f-b3f4-4e02-b6c3-6c5f126a39ab', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        toast.success('Reunión agendada y disparada a n8n')
      } catch (err) {
         console.error('Error n8n webhook', err)
      }
    }

    setShowEventModal(false)
    setEditing(null)
    setForm({ title: '', date: '', start_time: '', end_time: '', description: '', guests: '' })
    fetchEvents()
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este evento?')) return
    await supabase.from('calendar_events').delete().eq('id', id)
    toast.success('Evento eliminado')
    fetchEvents()
  }

  const openNewEvent = (date) => {
    setEditing(null)
    setForm({
      title: '', date: format(date || new Date(), 'yyyy-MM-dd'),
      start_time: '', end_time: '', description: '', guests: '',
    })
    setShowEventModal(true)
  }

  const openEditEvent = (event) => {
    setEditing(event)
    setForm({
      title: event.title,
      date: event.date,
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      description: event.description || '',
      guests: event.guests || '',
    })
    setShowEventModal(true)
  }

  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100 flex items-center gap-3">
            <CalendarDays size={24} className="text-primary-400" />
            Calendario
          </h1>
          <p className="text-sm text-surface-400 mt-1">Gestión de reuniones y eventos</p>
        </div>
        <Button onClick={() => openNewEvent(new Date())}>
          <Plus size={16} />
          Nueva reunión
        </Button>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-between">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-xl hover:bg-surface-800 text-surface-400 hover:text-surface-200 transition-all cursor-pointer">
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-lg font-semibold text-surface-200 capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </h2>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-xl hover:bg-surface-800 text-surface-400 hover:text-surface-200 transition-all cursor-pointer">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-surface-900/80 border border-surface-800/60 rounded-2xl overflow-hidden">
        {/* Week days header */}
        <div className="grid grid-cols-7 border-b border-surface-800/60">
          {weekDays.map(d => (
            <div key={d} className="px-2 py-3 text-center text-xs font-medium text-surface-400 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dayEvents = getEventsForDay(day)
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isSelected = selectedDate && isSameDay(day, selectedDate)

            return (
              <button
                key={i}
                onClick={() => setSelectedDate(day)}
                onDoubleClick={() => openNewEvent(day)}
                className={`
                  min-h-[90px] p-2 border-b border-r border-surface-800/30 text-left
                  transition-all cursor-pointer
                  ${!isCurrentMonth ? 'opacity-30' : ''}
                  ${isSelected ? 'bg-primary-600/10 ring-1 ring-primary-500/30' : 'hover:bg-surface-800/30'}
                  ${isToday(day) ? 'bg-primary-500/5' : ''}
                `}
              >
                <span className={`
                  inline-flex w-7 h-7 items-center justify-center rounded-full text-sm font-medium
                  ${isToday(day) ? 'bg-primary-600 text-white' : 'text-surface-300'}
                `}>
                  {format(day, 'd')}
                </span>
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 2).map(evt => (
                    <div
                      key={evt.id}
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary-500/20 text-primary-300 truncate"
                      title={evt.title}
                    >
                      {evt.start_time && <span className="mr-1">{evt.start_time}</span>}
                      {evt.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-[10px] text-surface-500 px-1.5">+{dayEvents.length - 2} más</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day events */}
      {selectedDate && (
        <div className="bg-surface-900/80 border border-surface-800/60 rounded-2xl p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-surface-200">
              Eventos del {format(selectedDate, "d 'de' MMMM", { locale: es })}
            </h3>
            <Button size="xs" variant="ghost" onClick={() => openNewEvent(selectedDate)}>
              <Plus size={14} /> Agregar
            </Button>
          </div>
          {getEventsForDay(selectedDate).length === 0 ? (
            <p className="text-sm text-surface-500">No hay eventos este día</p>
          ) : (
            <div className="space-y-2">
              {getEventsForDay(selectedDate).map(evt => (
                <div key={evt.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-800/50 group">
                  <div>
                    <p className="text-sm font-medium text-surface-200">{evt.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-surface-400">
                      {evt.start_time && (
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> {evt.start_time}{evt.end_time && ` — ${evt.end_time}`}
                        </span>
                      )}
                      {evt.description && <span>{evt.description}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditEvent(evt)} className="p-1.5 rounded-lg text-surface-500 hover:text-amber-400 hover:bg-amber-500/10 transition-all cursor-pointer">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(evt.id)} className="p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Event modal */}
      <Modal isOpen={showEventModal} onClose={() => setShowEventModal(false)} title={editing ? 'Editar evento' : 'Nueva reunión'}>
        <div className="space-y-4">
          <Input label="Título" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Reunión con cliente..." />
          <Input label="Fecha" type="date" value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Hora inicio" type="time" value={form.start_time} onChange={(e) => setForm(f => ({ ...f, start_time: e.target.value }))} />
            <Input label="Hora fin" type="time" value={form.end_time} onChange={(e) => setForm(f => ({ ...f, end_time: e.target.value }))} />
          </div>
          <Input label="Descripción" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detalles de la reunión..." />
          <Input label="Invitados (emails)" value={form.guests} onChange={(e) => setForm(f => ({ ...f, guests: e.target.value }))} placeholder="email1@test.com, email2@test.com" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowEventModal(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? 'Guardar' : 'Crear'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
