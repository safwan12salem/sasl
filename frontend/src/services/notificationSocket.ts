import { supabase } from './supabase';



function getCurrentUserId(): string {
  try {
    const token = localStorage.getItem('sasl_token');
    if (!token) return '';
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.user_id || '';
  } catch {
    return '';
  }
}


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
        const currentUserId = getCurrentUserId();
               if (n.recipient_id === currentUserId) {
          // Send system notification via service worker
          if ('serviceWorker' in navigator) {
                                        navigator.serviceWorker.ready.then((registration) => {
              // Check permission first
              if (Notification.permission === 'granted') {
                registration.showNotification('Sasl', {
                  body: n.message,
                  icon: '/logo192.png',
                  badge: '/logo192.png',
                  tag: 'sasl-notification',
                  requireInteraction: true
                });
              } else if (Notification.permission === 'default') {
                Notification.requestPermission().then((perm) => {
                  if (perm === 'granted') {
                    registration.showNotification('Sasl', {
                      body: n.message,
                      icon: '/logo192.png',
                      badge: '/logo192.png',
                      tag: 'sasl-notification',
                      requireInteraction: true
                    });
                  }
                });
              }
                       }).catch(() => {});
          }
          
          // Update app badge
          if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
            navigator.serviceWorker.ready.then((registration) => {
              (registration as any).setAppBadge?.(1).catch(() => {});
            });
          }
          
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
        }
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