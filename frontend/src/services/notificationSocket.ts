import { supabase } from './supabase';

let socket: WebSocket | null = null;
let heartbeatId: any = null;
let reconnectTimeout: any = null;
let listeners: ((data: any) => void)[] = [];

function connect(token: string) {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }
  
  const isLocal = window.location.hostname === 'localhost';
  const wsUrl = isLocal
    ? `ws://localhost:8000/ws/notifications/?token=${token}`
    : `wss://sasl-api-i34r.onrender.com/ws/notifications/?token=${token}`;
  
  socket = new WebSocket(wsUrl);
  
  socket.onopen = () => {
    console.log('🔔 WebSocket connected');
    heartbeatId = setInterval(() => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 5000);
  };
  
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      listeners.forEach(cb => cb(data));
    } catch {}
  };
  
  socket.onclose = () => {
    clearInterval(heartbeatId);
    console.log('🔔 WebSocket closed — Supabase takes over');
    reconnectTimeout = setTimeout(() => connect(token), 5000);
  };
  
  socket.onerror = () => { socket?.close(); };
}

export function subscribeNotifications(callback: (data: any) => void) {
  listeners.push(callback);
  const token = localStorage.getItem('sasl_token');
  if (token) connect(token);
  
  // Supabase Realtime fallback
  let supabaseChannel: any = null;
  try {
    supabaseChannel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
               const n = payload.new;
        callback({
          type: 'new_notification',
          notification: {
            id: n.id,
            notification_type: n.notification_type,
            message: n.message,
            actor: n.actor_name,
            is_read: false,
            created_at: n.created_at
          }
        });
      })
      .subscribe();
  } catch {}
  
  // Polling last resort
  const pollInterval = setInterval(async () => {
    try {
      const res = await fetch('/api/content/notifications/', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('sasl_token')}` }
      });
      const data = await res.json();
      const notifications = data.results || data || [];
      const unreadCount = notifications.filter((n: any) => !n.is_read).length;
      callback({ type: 'unread_count', count: unreadCount });
    } catch {}
  }, 30000);
  
  return () => {
    listeners = listeners.filter(cb => cb !== callback);
    supabaseChannel?.unsubscribe();
    clearInterval(pollInterval);
  };
}

export function disconnectNotifications() {
  clearInterval(heartbeatId);
  clearTimeout(reconnectTimeout);
  socket?.close();
  socket = null;
  listeners = [];
}