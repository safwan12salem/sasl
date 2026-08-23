import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Send, X } from 'lucide-react';
import api from '../services/api';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch history on mount
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get(`/tutoring/chat/?room_id=${sessionId}`);
        const data = res.data;
        if (Array.isArray(data)) {
          setMessages(data.map((m: any) => ({
            id: m.id,
            type: 'message',
            username: m.sender_name || m.sender?.username || m.sender || 'User',
            text: m.text || m.content || '',
            created_at: m.created_at
          })));
        }
      } catch (err) {
        console.log('No history or unauthorized:', err);
      }
    };
    fetchHistory();
  }, [sessionId]);

  // WebSocket for live messages
  useEffect(() => {
    const token = localStorage.getItem('token');
    const ws = new WebSocket(`wss://sasl-api-i34r.onrender.com/ws/tutoring-discussion/${sessionId}/?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => console.log('💬 Discussion connected');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'system') {
        setMessages(prev => [...prev, { id: `sys_${Date.now()}`, type: 'system', username: 'system', text: data.text, created_at: new Date().toISOString() }]);
      } else {
        setMessages(prev => [...prev, data]);
      }
    };
    ws.onclose = () => console.log('💬 Discussion closed');

    return () => { ws.close(); };
  }, [sessionId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'message', text: input }));
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
          <div key={msg.id || i} className={`flex items-end gap-2 ${msg.username === user?.username ? 'flex-row-reverse' : ''}`}>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-orange-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {msg.username?.[0]?.toUpperCase() || 'U'}
            </div>
            {msg.type === 'system' ? (
              <div className="text-center text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1 flex-1">
                {msg.text}
              </div>
            ) : (
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                msg.username === user?.username 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-br-sm' 
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-bl-sm'
              }`}>
                <p className={`text-xs font-bold mb-0.5 ${msg.username === user?.username ? 'text-white/80' : 'text-green-600'}`}>
                  {msg.username === user?.username ? 'You' : `@${msg.username}`}
                </p>
                <p className="text-sm">{msg.text}</p>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
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