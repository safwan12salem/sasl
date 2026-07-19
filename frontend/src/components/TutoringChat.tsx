import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Send, ImageIcon, Edit3, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  roomId: string;
  onClose: () => void;
}

export default function GigChat({ roomId, onClose }: Props) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const token = localStorage.getItem('sasl_token');
  const { t } = useTranslation();
  const { user } = useAuth();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get(`/tutoring/chat/${roomId}/`);
        setMessages(Array.isArray(res.data) ? res.data : (res.data?.results || []));
      } catch {}
    };
    if (roomId) fetchHistory();
  }, [roomId, user]);

  useEffect(() => {
    const isLocal = window.location.hostname === 'localhost';
    const wsUrl = isLocal
      ? `ws://localhost:8000/ws/tutoring/${roomId}/?token=${token}`
      : `wss://sasl-api-657z.onrender.com/ws/gig/${roomId}/?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'chat' && data.text) {
          setMessages(prev => [...prev, data]);
        }
      } catch {}
    };
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    return () => { ws.close(); wsRef.current = null; };
  }, [roomId, token]);

  const send = async () => {
    if (!input.trim()) return;
    if (editingId) {
      try { await api.patch(`/gigs/chat/${roomId}/`, { message_id: editingId, text: input }); } catch {}
      setMessages(prev => prev.map(m => m.id === editingId ? { ...m, text: input, is_edited: true } : m));
      setEditingId(null);
    } else {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'chat', text: input }));
      }
      try { await api.post(`/gigs/chat/${roomId}/`, { text: input }); } catch {}
      setMessages(prev => [...prev, { id: Date.now().toString(), text: input, sender_name: user?.username, sender: { username: user?.username } }]);
    }
    setInput('');
  };

  const deleteMessage = async (msgId: string) => {
    try { await api.delete(`/gigs/chat/${roomId}/`, { data: { message_id: msgId } }); } catch {}
    setMessages(prev => prev.filter(m => m.id !== msgId));
  };
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast.success('Uploading...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('cloud_name', 'dwem1chqc');
      const res = await fetch('https://api.cloudinary.com/v1_1/dwem1chqc/image/upload', { 
        method: 'POST', 
        body: formData 
      });
      const data = await res.json();
      if (data.secure_url) {
        const newMsg = { 
          id: Date.now().toString(), 
          text: `📎 ${data.secure_url}`, 
          file_url: data.secure_url, 
          sender_name: user?.username,
          sender: { username: user?.username }
        };
        setMessages(prev => [...prev, newMsg]);
        toast.success('Image sent!');
      } else {
        toast.error(data.error?.message || 'Upload failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    }
  };
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <h3 className="font-bold text-gray-800">{t('Tutoring Chat')}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1.5 transition"><X size={18} /></button>
        </div>
        <div className="h-72 bg-gray-50 rounded-lg m-3 p-3 overflow-y-auto space-y-2">
          {messages.length === 0 && <p className="text-gray-400 text-sm text-center mt-20">{connected ? t('Start the conversation!') : t('Connecting...')}</p>}
          {messages.map((m, i) => {
            const isMe = m.sender_name === user?.username || m.sender?.username === user?.username;
            return (
              <div key={m.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-green-500 text-white rounded-br-md' : 'bg-white shadow-sm border text-gray-700 rounded-bl-md'}`}>
                  {!isMe && <p className="text-[10px] font-semibold text-gray-500 mb-0.5">{m.sender_name || m.sender?.username || 'User'}</p>}
                  {m.file_url && m.file_url.match(/\.(jpg|jpeg|png|gif|webp)/i) ? (
                    <img src={m.file_url} alt="shared" className="max-w-full rounded-lg max-h-48 object-cover" />
                  ) : m.file_url ? (
                    <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline text-xs">{m.file_name || 'Open file'}</a>
                  ) : (
                    <span>{m.text || m.content}</span>
                  )}
                  {m.is_edited && <span className="text-[9px] opacity-60 ml-1">(edited)</span>}
                  {isMe && (
                    <div className="flex gap-1 mt-1 justify-end">
                      <button onClick={() => { setEditingId(m.id); setInput(m.text || m.content); }} className="text-white/70 hover:text-white"><Edit3 size={12} /></button>
                      <button onClick={() => deleteMessage(m.id)} className="text-white/70 hover:text-white"><Trash2 size={12} /></button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 p-3 border-t">
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="p-2.5 bg-gray-100 rounded-xl text-gray-500 hover:bg-gray-200 transition"><ImageIcon size={18} /></button>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder={editingId ? t('Edit message...') : t('Type a message...')} className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-400 transition" />
          <button onClick={send} className="bg-green-500 text-white p-2.5 rounded-xl hover:bg-green-600 transition"><Send size={18} /></button>
        </div>
      </div>
    </div>
  );
}