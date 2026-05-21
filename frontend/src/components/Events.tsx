import React, { useState } from 'react';
import api from '../services/api';
import { Calendar, MapPin, Users, Clock, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Events() {
  const [events, setEvents] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', location: '',
    date: '', time: '', max_attendees: '50'
  });

  const createEvent = async () => {
    await api.post('/events/', form);
    toast.success('Event created! Works offline - syncs when online.');
    setShowCreate(false);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold gradient-text mb-6 flex items-center gap-2">
        <Calendar /> Events
      </h2>
      
      <button onClick={() => setShowCreate(true)} className="btn-primary mb-6 flex items-center gap-1">
        <Plus size={16} /> Create Event
      </button>

      <div className="space-y-4">
        {events.map(event => (
          <div key={event.id} className="glass p-4 rounded-2xl">
            <h3 className="font-bold text-lg">{event.title}</h3>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1"><Calendar size={14} /> {event.date}</span>
              <span className="flex items-center gap-1"><Clock size={14} /> {event.time}</span>
              <span className="flex items-center gap-1"><MapPin size={14} /> {event.location}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}