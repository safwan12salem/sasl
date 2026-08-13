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
    console.log('🔔 Notification WebSocket connected');
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
    console.log('🔔 WebSocket closed — reconnecting');
    reconnectTimeout = setTimeout(() => connect(token), 5000);
  };
  
  socket.onerror = () => {
    socket?.close();
  };

  // Poll fallback every 30 seconds
setInterval(() => {
  fetch('/api/content/notifications/', {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('sasl_token')}` }
  })
  .then(res => res.json())
  .then(data => {
    const notifications = data.results || data || [];
    const unreadCount = notifications.filter((n: any) => !n.is_read).length;
    listeners.forEach(cb => cb({ type: 'unread_count', count: unreadCount }));
  })
  .catch(() => {});
}, 30000);

}

export function subscribeNotifications(callback: (data: any) => void) {
  listeners.push(callback);
  const token = localStorage.getItem('sasl_token');
  if (token) connect(token);
  
  return () => {
    listeners = listeners.filter(cb => cb !== callback);
  };
}

export function disconnectNotifications() {
  clearInterval(heartbeatId);
  clearTimeout(reconnectTimeout);
  socket?.close();
  socket = null;
  listeners = [];
}