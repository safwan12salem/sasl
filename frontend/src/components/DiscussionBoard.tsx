import React, { useEffect, useRef, useState } from 'react';
import { Send, CheckCircle2, MessageCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface DiscussionMessage {
  id: string;
  sender: string;
  avatar?: string;
  message: string;
  reply_to?: string | null;
  timestamp: string;
  is_read?: boolean;
  is_tutor?: boolean;
}

export default function DiscussionBoard({ sessionId, isTutor, onClose }: {
  sessionId: string;
  isTutor: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [input, setInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<DiscussionMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const token = localStorage.getItem('sasl_token');

  useEffect(() => {
    const ws = new WebSocket(`wss://sasl-api-i34r.onrender.com/ws/tutoring-discussion/${sessionId}/?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'discussion') {
        setMessages(prev => [...prev, {
          id: `msg_${Date.now()}_${Math.random()}`,
          sender: data.sender,
          message: data.message,
          reply_to: data.reply_to,
          timestamp: data.timestamp,
          is_tutor: data.sender !== 'student',
        }]);
      }
    };

    return () => ws.close();
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    wsRef.current?.send(JSON.stringify({
      message: input,
      reply_to: replyingTo?.sender || null,
      timestamp: new Date().toISOString(),
    }));
    setInput('');
    setReplyingTo(null);
  };

  const markRead = (msgId: string) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_read: true } : m));
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 flex-shrink-0">
        <h3 className="text-white font-bold text-sm flex items-center gap-2">
          <MessageCircle size={16} className="text-green-400" />
          Discussion Board
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.is_tutor ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-3 ${
              msg.is_tutor 
                ? 'bg-gradient-to-r from-green-500/20 to-orange-500/20 border border-green-400/30 text-white' 
                : 'bg-gray-800 border border-gray-700 text-gray-200'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  msg.is_tutor ? 'bg-gradient-to-r from-green-400 to-orange-500' : 'bg-gray-600'
                }`}>
                  {msg.sender[0]?.toUpperCase()}
                </div>
                <span className={`text-xs font-bold ${msg.is_tutor ? 'text-green-300' : 'text-gray-300'}`}>
                  {msg.is_tutor ? '👨🏫 Tutor' : `@${msg.sender}`}
                </span>
                {msg.is_read && <CheckCircle2 size={14} className="text-green-400" />}
              </div>
              {msg.reply_to && (
                <p className="text-xs text-gray-500 italic mb-1">↳ replying to @{msg.reply_to}</p>
              )}
              <p className="text-sm break-words">{msg.message}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-gray-500">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {isTutor && !msg.is_read && (
                  <button onClick={() => markRead(msg.id)} className="text-[10px] text-green-400 hover:text-green-300">
                    Mark Read
                  </button>
                )}
                {!msg.is_tutor && (
                  <button onClick={() => setReplyingTo(msg)} className="text-[10px] text-orange-400 hover:text-orange-300">
                    Reply
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-700 flex-shrink-0">
        {replyingTo && (
          <div className="flex items-center gap-2 mb-2 text-xs text-gray-400">
            <span>Replying to @{replyingTo.sender}</span>
            <button onClick={() => setReplyingTo(null)} className="text-red-400">✕</button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            className="flex-1 bg-gray-800 text-white rounded-full px-4 py-2 text-sm border border-gray-700 focus:border-green-500 outline-none"
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
    </div>
  );
}