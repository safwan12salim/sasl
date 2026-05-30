import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Calendar, MapPin, Users, Clock, Plus, Sparkles, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function Events() {
  const [events, setEvents] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', location: '', date: '', time: '', max_attendees: '50' });
  const { t } = useTranslation();

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    try { const res = await api.get('/events/'); setEvents(res.data.results || res.data || []); } catch {}
  };

  const createEvent = async () => {
    if (!form.title || !form.date) return toast.error(t('fill_all_fields'));
    try {
      await api.post('/events/', form);
      toast.success(t('event_created'));
      setShowCreate(false);
      setForm({ title: '', description: '', location: '', date: '', time: '', max_attendees: '50' });
      fetchEvents();
    } catch (err: any) { toast.error(err.response?.data?.detail || t('error_occurred')); }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold gradient-text flex items-center gap-2"><Calendar className="text-purple-500" /> {t('events')}</h2>
          <p className="text-gray-500 text-sm mt-1">{t('discover_and_create_offline_events')}</p>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-1">
          <Plus size={16} /> {showCreate ? t('cancel') : t('create_event')}
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="glass-card p-6 rounded-2xl mb-6 space-y-3 border-2 border-purple-200">
            <h3 className="font-bold text-lg flex items-center gap-2"><Sparkles size={18} className="text-purple-500" /> {t('create_event')}</h3>
            <input className="input-field" placeholder={t('event_title')} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <textarea className="input-field" placeholder={t('description')} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
            <input className="input-field" placeholder={t('location')} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
            <div className="grid grid-cols-3 gap-3">
              <input className="input-field" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              <input className="input-field" type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
              <input className="input-field" type="number" placeholder={t('max_attendees')} value={form.max_attendees} onChange={e => setForm({ ...form, max_attendees: e.target.value })} />
            </div>
            <motion.button whileTap={{ scale: 0.98 }} onClick={createEvent} className="btn-primary w-full">{t('create_event')}</motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {events.length === 0 ? (
          <div className="glass-card p-12 rounded-2xl text-center">
            <Calendar size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-xl text-gray-500">{t('no_events')}</p>
            <p className="text-sm text-gray-400 mt-1">{t('be_first_event')}</p>
          </div>
        ) : (
          events.map((event, idx) => (
            <motion.div key={event.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -2 }} className="glass-card p-5 rounded-2xl">
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {event.date ? new Date(event.date).getDate() : '📅'}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{event.title}</h3>
                  {event.description && <p className="text-sm text-gray-500 mt-1">{event.description}</p>}
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1"><Calendar size={14} /> {event.date}</span>
                    <span className="flex items-center gap-1"><Clock size={14} /> {event.time}</span>
                    <span className="flex items-center gap-1"><MapPin size={14} /> {event.location}</span>
                    <span className="flex items-center gap-1 ml-auto font-semibold text-purple-600"><Users size={14} /> {event.attendees_count || 0}/{event.max_attendees || '∞'}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}