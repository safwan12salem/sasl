import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  roomId: string;
  onClose: () => void;
}

export default function TutoringChat({ roomId, onClose }: Props) {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const token = localStorage.getItem('sasl_token');
  const { t } = useTranslation();
  const { user } = useAuth();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get(`/tutoring/chat/${roomId}/`);
        const dataArray = Array.isArray(res.data) ? res.data : (res.data?.results || []);
        const historyMsgs = dataArray.map((m: any) => {
          const sender = m.sender_name || m.sender?.username || 'Unknown';
          return sender === user?.username ? `Me: ${m.text || m.content}` : `${sender}: ${m.text || m.content}`;
        });
        setMessages(historyMsgs);
      } catch {}
    };
    if (roomId) fetchHistory();
  }, [roomId, user]);

  useEffect(() => {
    const isLocal = window.location.hostname === 'localhost';
    const wsUrl = isLocal
      ? `ws://localhost:8000/ws/tutoring/${roomId}/?token=${token}`
      : `wss://sasl-api-657z.onrender.com/ws/tutoring/${roomId}/?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'chat' && data.text) {
          setMessages(prev => [...prev, data.text]);
        }
      } catch {
        setMessages(prev => [...prev, event.data]);
      }
    };
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    return () => { ws.close(); wsRef.current = null; };
  }, [roomId, token]);

  const send = async () => {
    if (!input.trim()) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'chat', text: input }));
    }
    try { await api.post(`/tutoring/chat/${roomId}/`, { text: input }); } catch {}
    setMessages(prev => [...prev, `Me: ${input}`]);
    setInput('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <h3 className="font-bold text-gray-800">{t('Tutoring Chat')}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1.5 transition">✕</button>
        </div>
        <div className="h-72 bg-gray-50 rounded-lg m-3 p-3 overflow-y-auto space-y-2">
          {messages.length === 0 && <p className="text-gray-400 text-sm text-center mt-20">{connected ? t('Start the conversation!') : t('Connecting...')}</p>}
          {messages.map((m, i) => {
            const isMe = typeof m === 'string' && m.startsWith('Me:');
            return (
              <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-green-500 text-white rounded-br-md' : 'bg-white shadow-sm border text-gray-700 rounded-bl-md'}`}>
                  {typeof m === 'string' ? m : JSON.stringify(m)}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 p-3 border-t">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder={t('Type a message...')} className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-400 transition" />
          <button onClick={send} className="bg-green-500 text-white p-2.5 rounded-xl hover:bg-green-600 transition"><Send size={18} /></button>
        </div>
      </div>
    </div>
  );
}