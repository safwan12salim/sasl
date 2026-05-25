import React, { useEffect, useState, useRef } from 'react';
import { Bell, Heart, MessageCircle, UserPlus, DollarSign, ShoppingCart, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { subscribeToNotifications } from '../services/supabase';
import { useTranslation } from 'react-i18next';

interface Notification {
  id: string;
  notification_type: string;
  message: string;
  actor: string;
  post_id?: string;
  created_at: string;
  is_read: boolean;
}

const iconMap: Record<string, JSX.Element> = {
  like: <Heart className="text-red-500" size={16} />,
  comment: <MessageCircle className="text-blue-500" size={16} />,
  follow: <UserPlus className="text-green-500" size={16} />,
  money: <DollarSign className="text-yellow-500" size={16} />,
  purchase: <ShoppingCart className="text-orange-500" size={16} />,
  subscription: <Star className="text-purple-500" size={16} />,
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const wsRef = useRef<WebSocket | null>(null);
  const { t } = useTranslation();
  
  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    connectWebSocket();

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    
    const subscription = subscribeToNotifications((payload) => {
    console.log(t('New notification:'), payload.new);
    // Add to notifications list
    setNotifications(prev => [payload.new, ...prev]);
  });

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      subscription.unsubscribe();
      document.removeEventListener('mousedown', handleClickOutside);
      wsRef.current?.close();
      subscription.unsubscribe();
    };
  }, [user]);

  const connectWebSocket = () => {
    const token = localStorage.getItem('sasl_token');
    const wsUrl = `wss://sasl.pythonanywhere.com/ws/notifications/?token=${token}`;
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === t('unread_count')) {
        setUnreadCount(data.count);
      } else if (data.type === t('new_notification')) {
        setNotifications(prev => [data.notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        // Show toast for new notification
        toast(data.notification.message, {
          icon: iconMap[data.notification.type] || '🔔',
        });
      }
    };
    wsRef.current = ws;
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/content/notifications/');
      setNotifications(res.data.results || res.data || []);
      setUnreadCount(notifications.filter(n => !n.is_read).length);
    } catch (err) {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.post(`/content/notifications/${id}/mark_read/`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.post('/content/notifications/mark_all_read/');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleClick = (notification: Notification) => {
    if (!notification.is_read) markAsRead(notification.id);
    setOpen(false);
    if (notification.post_id) {
      navigate(`/post/${notification.post_id}`);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold">{t('Notifications')}</h3>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-sm text-green-600 hover:underline">
                  {t('Mark all read')}
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full mx-auto" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Bell size={32} className="mx-auto mb-2 opacity-50" />
                  <p>{t('No notifications yet')}</p>
                </div>
              ) : (
                notifications.map(notification => (
                  <motion.button
                    key={notification.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => handleClick(notification)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors border-b last:border-b-0 ${
                      !notification.is_read ? 'bg-green-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {iconMap[notification.notification_type] || <Bell size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 line-clamp-2">{t(notification.message)}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(notification.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-2" />
                      )}
                    </div>
                  </motion.button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}