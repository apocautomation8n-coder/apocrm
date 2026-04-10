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
  addHours,
  subHours,
  parseISO,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../lib/supabaseClient'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Clock, Trash2, Pencil, Globe, Video, ExternalLink, ArrowRightLeft, User, Check, Search, CheckSquare, DollarSign } from 'lucide-react'
import Select from '../components/ui/Select'
import toast from 'react-hot-toast'
import { useTasks } from '../hooks/useTasks'
import TaskModal from '../components/tasks/TaskModal'

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [events, setEvents] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [showEventModal, setShowEventModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title: '', date: '', start_time: '', end_time: '', description: '', guests: [], meet_link: '', recurrence: 'none' })
  const [guestInput, setGuestInput] = useState('')
  const [isGeneratingMeet, setIsGeneratingMeet] = useState(false)
  
  // Tasks integration
  const { tasks, addTask, updateTask } = useTasks('all')
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  
  // Contacts integration
  const [contacts, setContacts] = useState([])
  const [contactSearch, setContactSearch] = useState('')
  const [showContactPicker, setShowContactPicker] = useState(false)

  // Plans integration
  const [plans, setPlans] = useState([])
  
  // Timezone helper state
  const [tzForm, setTzForm] = useState({ country: 'AR', time: '' })

  const timezones = [
    { code: 'AR', name: 'Argentina/Uruguay/Chile', offset: 0 },
    { code: 'BO', name: 'Bolivia/Paraguay/Venezuela', offset: 1 },
    { code: 'CO', name: 'Colombia/Perú/Ecuador/Panamá', offset: 2 },
    { code: 'MX', name: 'México/Costa Rica/Guatemala', offset: 3 },
    { code: 'ES', name: 'España (Madrid)', offset: -5 },
    { code: 'US', name: 'USA (Miami/NY)', offset: 1 },
  ]

  // Use local Supabase table for events (can be enhanced with Google Calendar later)
  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .order('date')
    if (!error && data) setEvents(data)
  }

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from('contacts')
      .select('id, name, phone, email')
      .not('email', 'is', null) // Only contacts with email are useful here
      .order('name')
    if (!error && data) setContacts(data)
  }

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from('monthly_plans')
      .select('id, client_name, billing_day, status, currency, monthly_fee')
      .eq('status', 'activo')
    if (!error && data) setPlans(data)
  }

  useEffect(() => { 
    fetchEvents() 
    fetchContacts()
    fetchPlans()
  }, [])

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

  const getEventsForDay = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const dayEvents = events.filter(e => {
      if (e.date === dateStr) return true
      if (e.recurrence === 'monthly' && e.date) {
        const evtDate = parseISO(e.date)
        return evtDate.getDate() === date.getDate() && date >= evtDate
      }
      return false
    })

    const dayTasks = tasks.filter(t => t.due_date === dateStr).map(t => ({
      ...t,
      isTask: true,
      title: t.title,
    }))

    const dayPlans = plans.filter(p => p.billing_day === date.getDate()).map(p => ({
      ...p,
      isPlan: true,
      title: `Cobro: ${p.client_name} - ${p.currency || 'USD'} ${p.monthly_fee}`,
      id: `plan-${p.id}-${dateStr}`
    }))

    return [...dayEvents, ...dayTasks, ...dayPlans]
  }

  const handleSaveTask = async (taskData) => {
    if (editingTask) {
      await updateTask(editingTask.id, taskData)
    } else {
      await addTask(taskData)
    }
    setEditingTask(null)
    setIsTaskModalOpen(false)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.date) return toast.error('Título y fecha son obligatorios')

    const guestsString = form.guests.join(', ')
    const payload = {
      title: form.title,
      date: form.date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      description: form.description || null,
      guests: guestsString || null,
      recurrence: form.recurrence || 'none',
    }

    if (editing) {
      const { error } = await supabase.from('calendar_events').update(payload).eq('id', editing.id)
      if (error) return toast.error('Error actualizando evento')
      toast.success('Evento actualizado')
      setShowEventModal(false)
      setEditing(null)
      setForm({ title: '', date: '', start_time: '', end_time: '', description: '', guests: [], meet_link: '' })
      setGuestInput('')
      setTzForm({ country: 'AR', time: '' })
      fetchEvents()
    } else {
      const { data, error } = await supabase
        .from('calendar_events')
        .insert(payload)
        .select()
        .single()

      if (error) {
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          toast.error('Tabla calendar_events no existe.')
        } else {
          toast.error('Error creando evento')
        }
        return
      }

      const createdId = data.id
      // Immediately add event to state and close modal before webhook
      setEvents(prev => [...prev, { ...data }])
      setShowEventModal(false)
      setEditing(null)
      setForm({ title: '', date: '', start_time: '', end_time: '', description: '', guests: [], meet_link: '' })
      setGuestInput('')
      setTzForm({ country: 'AR', time: '' })

      // Send webhook to n8n to generate Meet link and email (async, non-blocking)
      setIsGeneratingMeet(true)
      try {
        const response = await fetch('https://automation8n.fluxia.site/webhook/e64e181f-b3f4-4e02-b6c3-6c5f126a39ab', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, event_id: createdId })
        })
        
        if (response.ok) {
          const text = await response.text()
          if (text) {
            let resData
            try { resData = JSON.parse(text) } catch { resData = {} }
            const link = resData.meet_link || resData.meetLink || resData.link || resData.url || resData.hangoutLink
            if (link) {
              await supabase.from('calendar_events').update({ meet_link: link }).eq('id', createdId)
              setEvents(prev => prev.map(e => e.id === createdId ? { ...e, meet_link: link } : e))
              toast.success('✅ Link de Google Meet generado')
            } else {
              toast.success('Reunión agendada')
            }
          } else {
            toast.success('Reunión agendada')
          }
        } else {
          toast.error('Error al contactar n8n')
        }
      } catch (err) {
        console.error('Error n8n webhook', err)
        toast.error('No se pudo generar el link de Meet')
      } finally {
        setIsGeneratingMeet(false)
        fetchEvents()
      }
    }
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
      start_time: '', end_time: '', description: '', guests: [], recurrence: 'none'
    })
    setGuestInput('')
    setShowEventModal(true)
  }

  const openEditEvent = (event) => {
    const guestsArray = event.guests ? event.guests.split(',').map(g => g.trim()).filter(Boolean) : []
    setEditing(event)
    setForm({
      title: event.title,
      date: event.date,
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      description: event.description || '',
      guests: guestsArray,
      meet_link: event.meet_link || '',
      recurrence: event.recurrence || 'none'
    })
    setGuestInput('')
    setShowEventModal(true)
  }

  const addGuest = () => {
    const email = guestInput.trim()
    if (!email) return
    if (!email.includes('@')) return toast.error('Email inválido')
    if (form.guests.includes(email)) return toast.error('El invitado ya existe')
    setForm(f => ({ ...f, guests: [...f.guests, email] }))
    setGuestInput('')
  }

  const removeGuest = (email) => {
    setForm(f => ({ ...f, guests: f.guests.filter(g => g !== email) }))
  }

  const handleGuestKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addGuest()
    }
  }

  const applyTimezoneConversion = () => {
    if (!tzForm.time) return
    const [hours, minutes] = tzForm.time.split(':').map(Number)
    const tz = timezones.find(t => t.code === tzForm.country)
    
    // Calculate Argentina time (ART)
    let artHours = hours + tz.offset
    if (artHours < 0) artHours += 24
    if (artHours >= 24) artHours -= 24
    
    const formattedHour = `${String(artHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    setForm(f => ({ ...f, start_time: formattedHour }))
    toast.success(`Convertido: ${tzForm.time} (${tz.code}) -> ${formattedHour} (AR)`)
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
                  {dayEvents.slice(0, 3).map(evt => (
                    <div
                      key={evt.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (evt.isTask) {
                          setEditingTask(evt);
                          setIsTaskModalOpen(true);
                        } else if (!evt.isPlan) {
                          openEditEvent(evt);
                        }
                      }}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate flex items-center gap-1
                        ${evt.isPlan ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                        : evt.isTask ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                        : 'bg-primary-500/20 text-primary-300'}`}
                      title={evt.title}
                    >
                      {evt.isPlan && <DollarSign size={10} />}
                      {evt.isTask && <CheckSquare size={10} />}
                      {evt.start_time && !evt.isTask && !evt.isPlan && <span className="mr-1">{evt.start_time}</span>}
                      {evt.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[10px] text-surface-500 px-1.5">+{dayEvents.length - 3} más</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Upcoming Meetings with Meet Links */}
      {(() => {
        const todayStr = format(new Date(), 'yyyy-MM-dd')
        const now = new Date()
        const currentHourMin = format(now, 'HH:mm')
        
        const upcoming = events
          .filter(e => {
            if (e.date < todayStr) return false
            if (e.date === todayStr) {
               const endCompare = e.end_time || (e.start_time ? format(addHours(parseISO(`1970-01-01T${e.start_time}`), 1), 'HH:mm') : '23:59')
               return currentHourMin <= endCompare
            }
            return true
          })
          .sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date)
            return (a.start_time || '').localeCompare(b.start_time || '')
          })
        return (
          <div className="bg-surface-900/80 border border-surface-800/60 rounded-2xl overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800/60">
              <div className="flex items-center gap-2">
                <Video size={16} className="text-emerald-400" />
                <h3 className="text-sm font-semibold text-surface-200">Próximas Reuniones</h3>
                {isGeneratingMeet && (
                  <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-primary-500/10 border border-primary-500/20">
                    <div className="w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] text-primary-300 font-medium">Generando Meet...</span>
                  </div>
                )}
              </div>
              <span className="text-xs text-surface-500">{upcoming.length} reunión{upcoming.length !== 1 ? 'es' : ''}</span>
            </div>
            {upcoming.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <CalendarDays size={32} className="text-surface-700 mx-auto mb-3" />
                <p className="text-sm text-surface-500">No hay reuniones próximas</p>
              </div>
            ) : (
              <div className="divide-y divide-surface-800/40">
                {upcoming.slice(0, 8).map(evt => {
                  const evtDate = new Date(evt.date + 'T12:00:00')
                  const isEvtToday = evt.date === todayStr
                  return (
                    <div key={evt.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-800/30 transition-colors group">
                      {/* Date badge */}
                      <div className={`flex-shrink-0 w-12 text-center rounded-xl p-1.5 ${
                        isEvtToday 
                          ? 'bg-primary-600/20 border border-primary-500/30' 
                          : 'bg-surface-800/60 border border-surface-700/30'
                      }`}>
                        <p className={`text-[10px] font-medium uppercase ${
                          isEvtToday ? 'text-primary-400' : 'text-surface-500'
                        }`}>
                          {format(evtDate, 'MMM', { locale: es })}
                        </p>
                        <p className={`text-lg font-bold leading-none ${
                          isEvtToday ? 'text-primary-300' : 'text-surface-300'
                        }`}>
                          {format(evtDate, 'd')}
                        </p>
                      </div>

                      {/* Event info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-surface-100 truncate">{evt.title}</p>
                          {isEvtToday && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-500/20 text-primary-300 border border-primary-500/30">HOY</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-surface-400">
                          {evt.start_time && (
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              {evt.start_time}{evt.end_time ? ` — ${evt.end_time}` : ''} (ARG)
                            </span>
                          )}
                          {evt.guests && (
                            <span className="flex items-center gap-1 truncate max-w-[180px]">
                              <User size={10} />
                              {evt.guests.split(',')[0].trim()}{evt.guests.split(',').length > 1 ? ` +${evt.guests.split(',').length - 1}` : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Meet link button */}
                      <div className="flex-shrink-0 flex items-center gap-2">
                        {evt.meet_link ? (
                          <a
                            href={evt.meet_link}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/25 hover:text-emerald-200 transition-all"
                          >
                            <Video size={13} />
                            Unirse a Meet
                            <ExternalLink size={11} />
                          </a>
                        ) : (
                          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-800/50 text-surface-500 text-xs">
                            <Video size={13} />
                            Sin link
                          </span>
                        )}
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                          <button onClick={() => openEditEvent(evt)} className="p-1.5 rounded-lg text-surface-600 hover:text-amber-400 hover:bg-amber-500/10 transition-all cursor-pointer">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleDelete(evt.id)} className="p-1.5 rounded-lg text-surface-600 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {upcoming.length > 8 && (
                  <div className="px-5 py-3 text-center">
                    <p className="text-xs text-surface-500">+{upcoming.length - 8} reuniones más en el calendario</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })()}

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
                      {evt.meet_link && (
                        <a 
                          href={evt.meet_link} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="flex items-center gap-2 px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold hover:bg-emerald-500/25 transition-all"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Video size={11} /> Unirse a Meet
                        </a>
                      )}
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
          <div className="p-4 rounded-xl bg-surface-950/40 border border-surface-800/60 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-surface-400 uppercase tracking-wider">
              <Globe size={14} className="text-primary-400" />
              Conversor de Horario
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select 
                label="País del Cliente" 
                value={tzForm.country} 
                onChange={(e) => setTzForm(p => ({ ...p, country: e.target.value }))}
              >
                {timezones.map(t => <option key={t.code} value={t.code}>{t.name}</option>)}
              </Select>
              <Input 
                label="Hora del Cliente" 
                type="time" 
                value={tzForm.time} 
                onChange={(e) => setTzForm(p => ({ ...p, time: e.target.value }))} 
              />
            </div>
            <Button variant="secondary" size="xs" fullWidth onClick={applyTimezoneConversion} disabled={!tzForm.time}>
              <ArrowRightLeft size={12} /> Convertir a Hora Arg
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Hora inicio (ARG)" type="time" value={form.start_time} onChange={(e) => setForm(f => ({ ...f, start_time: e.target.value }))} />
            <Input label="Hora fin (ARG)" type="time" value={form.end_time} onChange={(e) => setForm(f => ({ ...f, end_time: e.target.value }))} />
          </div>

          <Select 
            label="Repetir" 
            value={form.recurrence || 'none'}
            onChange={(e) => setForm(f => ({ ...f, recurrence: e.target.value }))}
          >
            <option value="none">No repetir</option>
            <option value="monthly">Todos los meses</option>
          </Select>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-surface-300 font-bold uppercase tracking-wider">Invitados</label>
              <button 
                type="button" 
                onClick={() => setShowContactPicker(!showContactPicker)}
                className="text-xs text-primary-400 hover:text-primary-300 font-medium flex items-center gap-1 transition-colors"
                title="Seleccionar de contactos guardados"
              >
                <User size={12} /> {showContactPicker ? 'Ocultar lista' : 'Seleccionar contacto'}
              </button>
            </div>

            {showContactPicker && (
              <div className="p-3 rounded-xl bg-surface-950/40 border border-surface-800/60 space-y-3 animate-slide-down">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
                  <input
                    placeholder="Buscar contacto..."
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-surface-800/50 border border-surface-700/30 text-xs text-surface-200 outline-none focus:ring-1 focus:ring-primary-500/50"
                  />
                </div>
                <div className="max-h-[120px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {contacts
                    .filter(c => !contactSearch || c.name?.toLowerCase().includes(contactSearch.toLowerCase()) || c.email?.toLowerCase().includes(contactSearch.toLowerCase()))
                    .map(c => {
                      const isAlreadyGuest = form.guests.includes(c.email)
                      return (
                        <button
                          key={c.id}
                          onClick={() => {
                            if (!isAlreadyGuest) {
                              setForm(f => ({ ...f, guests: [...f.guests, c.email] }))
                              toast.success(`${c.name || 'Contacto'} agregado`)
                            }
                          }}
                          className={`
                            w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors
                            ${isAlreadyGuest ? 'opacity-40 cursor-default' : 'hover:bg-surface-800/80 cursor-pointer'}
                          `}
                        >
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium text-surface-200 truncate">{c.name || 'Sin nombre'}</p>
                            <p className="text-[10px] text-surface-500 truncate">{c.email}</p>
                          </div>
                          {isAlreadyGuest && <Check size={12} className="text-emerald-400" />}
                        </button>
                      )
                    })}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 p-2 min-h-[42px] rounded-xl bg-surface-800/80 border border-surface-700/50">
              {form.guests.map(email => (
                <div key={email} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary-500/20 border border-primary-500/30 text-primary-300 text-xs">
                  <span>{email}</span>
                  <button onClick={() => removeGuest(email)} className="hover:text-white transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              <input
                className="flex-1 bg-transparent border-none outline-none text-sm text-surface-100 placeholder-surface-500 min-w-[120px]"
                placeholder={form.guests.length === 0 ? "ejemplo@test.com" : ""}
                value={guestInput}
                onChange={(e) => setGuestInput(e.target.value)}
                onKeyDown={handleGuestKeyDown}
              />
            </div>
          </div>
          {isGeneratingMeet && (
            <div className="p-3 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium text-primary-300">Generando link de Meet y notificando...</span>
            </div>
          )}

          {form.meet_link && !isGeneratingMeet && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video size={16} className="text-emerald-400" />
                <span className="text-xs font-medium text-emerald-200 truncate max-w-[200px]">{form.meet_link}</span>
              </div>
              <a href={form.meet_link} target="_blank" rel="noreferrer" className="p-1 rounded-lg hover:bg-emerald-500/20 text-emerald-400 transition-all">
                <ExternalLink size={14} />
              </a>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowEventModal(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? 'Guardar' : 'Crear'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
