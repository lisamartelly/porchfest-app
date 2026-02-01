import { Router } from 'express'
import { events, timeSlots } from '../data/db.js'

export const eventsRouter = Router()

eventsRouter.get('/', async (req, res) => {
  try {
    const allEvents = Array.from(events.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    res.json(allEvents)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' })
  }
})

eventsRouter.get('/active', async (req, res) => {
  try {
    const activeEvent = Array.from(events.values()).find(e => e.is_active)
    
    if (!activeEvent) {
      return res.json(null)
    }

    const eventSlots = Array.from(timeSlots.values())
      .filter(s => s.event_id === activeEvent.id)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

    res.json({
      ...activeEvent,
      time_slots: eventSlots,
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch active event' })
  }
})

eventsRouter.get('/:eventId/slots', async (req, res) => {
  try {
    const { eventId } = req.params
    
    const slots = Array.from(timeSlots.values())
      .filter(s => s.event_id === eventId)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

    res.json(slots)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch time slots' })
  }
})

// events and timeSlots are exported from ../data/db.js
