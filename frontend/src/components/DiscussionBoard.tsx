import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Send, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface DiscussionMessage {
  id: string;
  type: string;
  username: string;
  text: string;
  created_at: string;
}

export default function DiscussionBoard({ sessionId, isTutor, onClose }: { 
  sessionId: string; isTutor: boolean; onClose: () => void 
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [input, setInput] = useState('');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const ws = new WebSocket(`wss://sasl-api-i34r.onrender.com/ws/tutoring-discussion/${sessionId}/?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('💬 Discussion WebSocket connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages(prev => [...prev, data]);
    };

    ws.onerror = (error) => {
      console.error('💬 Discussion WS error:', error);
    };

    ws.onclose = () => {
      console.log('💬 Discussion WS closed');
    };

    return () => { ws.close(); };
  }, [sessionId]);

  const sendMessage = () => {
  if (!input.trim() || !wsRef.current) return;
  const text = input;
  wsRef.current.send(JSON.stringify({ type: 'message', text }));
  
  // Also save to backend for persistence
  try {
    const token = localStorage.getItem('token');
    fetch(`https://sasl-api-i34r.onrender.com/api/tutoring/discussion/${sessionId}/send/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ text })
    });
  } catch {}
  
  setInput('');
};



  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-green-500 to-orange-500">
        <h3 className="text-white font-bold text-sm">💬 Discussion Board</h3>
        <button onClick={onClose} className="text-white/80 hover:text-white"><X size={18} /></button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={msg.id || i} className={`flex flex-col ${msg.username === user?.username ? 'items-end' : 'items-start'}`}>
            {msg.type === 'system' ? (
              <div className="text-center text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1">
                {msg.text}
              </div>
            ) : (
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                msg.username === user?.username 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
              }`}>
                <p className={`text-xs font-bold mb-0.5 ${msg.username === user?.username ? 'text-white/80' : 'text-green-600'}`}>
                  {msg.username === user?.username ? 'You' : `@${msg.username}`}
                </p>
                <p className="text-sm">{msg.text}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <input
          className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-600 focus:border-green-500 outline-none"
          placeholder={isTutor ? "Reply to students..." : "Ask a question..."}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage}
          className="bg-gradient-to-r from-green-500 to-orange-500 text-white p-2 rounded-full hover:shadow-lg transition">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}