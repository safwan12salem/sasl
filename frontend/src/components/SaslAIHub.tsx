/**
 * 🧠 Sasl Brain — Legendary AI Hub
 * GPT-4o powered. Answers ANY question with brilliance.
 * Free: 20/day | Premium: Unlimited
 */
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { askSaslEngine, FREE_LIMIT, PREMIUM_PRICE, getUsage, analyzeContent, generateSEOKeys, growthStrategy, clearConversation } from '../services/saslEngine';
import { Brain, Send, Loader2, Sparkles, Crown, Zap, Mic, MicOff, Copy, ThumbsUp, ThumbsDown, RotateCcw, Clock, Infinity, Wand2, MessageSquare, Lightbulb, ChevronRight,Edit3  } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';



interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  { icon: '🧠', text: 'Explain quantum computing like I\'m 12', color: 'from-purple-500 to-indigo-500' },
  { icon: '⚽', text: 'Who is Lionel Messi? Full career', color: 'from-orange-500 to-red-500' },
  { icon: '💻', text: 'How to learn programming in 2026?', color: 'from-blue-500 to-cyan-500' },
  { icon: '💰', text: 'How can I earn money on Sasl?', color: 'from-green-500 to-emerald-500' },
  { icon: '🔬', text: 'How does CRISPR gene editing work?', color: 'from-pink-500 to-rose-500' },
  { icon: '🌍', text: 'What causes climate change? Solutions?', color: 'from-teal-500 to-green-500' },
];

export default function SaslAIHub() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `# 👋 Welcome to Sasl Brain\n\nI'm your legendary AI assistant — the world's most advanced AI. I can answer *any question* with expert-level detail.\n\n✨ **20 free queries/day** | 💎 **Premium: Unlimited**`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [usage, setUsage] = useState(getUsage());
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isPremium = (user as any)?.is_premium || false;
  const remaining = Math.max(0, FREE_LIMIT - usage.count);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);


  const [feedback, setFeedback] = useState<Record<string, 'liked' | 'disliked' | null>>({});
  const handleFeedback = (msgId: string, type: 'liked' | 'disliked') => {
    setFeedback(prev => ({ ...prev, [msgId]: prev[msgId] === type ? null : type }));
    toast.success(type === 'liked' ? 'Thanks! 👍' : 'Noted! 👎');
  };

  // Speech recognition
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Speech recognition not available');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      setInput(event.results[0][0].transcript);
      setIsListening(false);
    };
    recognition.onerror = () => { setIsListening(false); };
    recognition.onend = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
  };

  const sendMessage = async (text?: string) => {
    const query = (text || input).trim();
    if (!query || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: query, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await askSaslEngine(query);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      }]);
      setUsage(getUsage());
    } catch {
      toast.error('Failed to get response');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied!');
  };

  const clearChat = () => {
     clearConversation();
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: `# 🧠 Fresh Start!\n\nWhat would you like to learn about today?`,
      timestamp: new Date(),
    }]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 flex items-center justify-center shadow-xl shadow-purple-500/30">
              <Brain size={24} className="text-white" />
            </div>
            <Sparkles size={14} className="absolute -top-1 -right-1 text-yellow-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              Sasl Brain
            </h1>
            <p className="text-[11px] text-gray-400 flex items-center gap-1">
              <Zap size={10} className="text-yellow-500" />
              {t('Sasl Brain — legendary AI assistant')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isPremium && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              remaining <= 5 ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 animate-pulse' 
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            }`}>
              <Clock size={12} />
              {remaining}/{FREE_LIMIT}
            </div>
          )}
          {isPremium && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-full text-xs">
              <Crown size={12} className="text-yellow-500" />
              <span className="text-purple-700 dark:text-purple-300 font-semibold">Premium</span>
              <Infinity size={12} className="text-purple-500" />
            </div>
          )}
          <button onClick={clearChat} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition" title="Clear chat">
            <RotateCcw size={16} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div ref={chatRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-5 scroll-smooth">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'user' ? (
                <div className="max-w-[85%] sm:max-w-[70%]">
                  <div className="px-5 py-3 bg-gradient-to-br from-purple-600 to-pink-500 text-white rounded-2xl rounded-br-md shadow-xl shadow-purple-500/20">
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 block text-right mr-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ) : (
                <div className="max-w-[92%] sm:max-w-[80%]">
                  <div className="px-5 py-4 bg-white dark:bg-gray-800/80 rounded-2xl rounded-bl-md shadow-sm border border-gray-100 dark:border-gray-700/50">
                    <div 
                      className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: formatAIResponse(msg.content) }} 
                    />
                    {/* Actions */}
                    <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                      <button onClick={() => copyMessage(msg.content)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition group" title="Copy">
                        <Copy size={13} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                      </button>
                                      <button onClick={() => handleFeedback(msg.id, 'liked')} className={`p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition group ${feedback[msg.id] === 'liked' ? 'bg-green-100 dark:bg-green-900/30' : ''}`} title="Helpful">
                        <ThumbsUp size={13} className={`${feedback[msg.id] === 'liked' ? 'text-green-500' : 'text-gray-400 group-hover:text-green-500'}`} />
                      </button>
                      <button onClick={() => handleFeedback(msg.id, 'disliked')} className={`p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition group ${feedback[msg.id] === 'disliked' ? 'bg-red-100 dark:bg-red-900/30' : ''}`} title="Not helpful">
                        <ThumbsDown size={13} className={`${feedback[msg.id] === 'disliked' ? 'text-red-500' : 'text-gray-400 group-hover:text-red-500'}`} />
                      </button>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 block ml-2">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading */}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="px-5 py-4 bg-white dark:bg-gray-800/80 rounded-2xl rounded-bl-md shadow-sm border border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Suggested Questions */}
      {messages.length <= 1 && (
        <div className="px-5 pb-3">
          <p className="text-xs text-gray-400 mb-3 flex items-center gap-1.5">
            <Lightbulb size={12} className="text-yellow-500" />
            Try asking about:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => sendMessage(q.text)}
                className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition group border border-gray-100 dark:border-gray-700/30 text-left"
              >
                <span className="text-lg">{q.icon}</span>
                <span className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white flex-1 line-clamp-2">
                  {q.text}
                </span>
                <ChevronRight size={14} className="text-gray-300 group-hover:text-purple-500 transition" />
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Premium upsell */}
      {!isPremium && usage.count >= 15 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-5 mb-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-200 dark:border-purple-800 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
              <Crown size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">{t('Upgrade to Premium')}</p>
              <p className="text-[11px] text-gray-500">{t('Unlimited Sasl AI access + advanced tools')}</p>
            </div>
          </div>
                        <button 
                onClick={async () => {
                  try {
                                     const res = await api.post('/users/upgrade-premium/');
                    if (res.data.url) { window.location.href = res.data.url; }
                    else { 
                      toast.success('Premium activated! 🎉');
                      // Refresh user data to update isPremium
                      const profileRes = await api.get('/users/profile/');
                      if (profileRes.data) {
                        localStorage.setItem('sasl_user', JSON.stringify(profileRes.data));
                        window.location.reload();
                      }
                    }
                  } catch (err: any) { 
                    toast.error(err.response?.data?.error || 'Insufficient balance. Top up wallet first.'); 
                  }
                }}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-full text-xs font-semibold shadow-lg shadow-purple-500/25 hover:shadow-xl transition"
              >
                {PREMIUM_PRICE}
              </button>
        </motion.div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <button
            onClick={isListening ? () => setIsListening(false) : startListening}
            className={`p-3 rounded-xl transition-all ${
              isListening 
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <div className="flex-1 relative">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
              }}
              placeholder="Ask me anything..."
              className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800 rounded-2xl border-2 border-transparent focus:border-purple-500 focus:ring-4 focus:ring-purple-200 dark:focus:ring-purple-900/50 transition-all outline-none text-sm placeholder:text-gray-400"
              disabled={loading}
            />
          </div>

          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="p-3.5 bg-gradient-to-br from-purple-600 to-pink-500 text-white rounded-2xl hover:from-purple-700 hover:to-pink-600 transition-all shadow-xl shadow-purple-500/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </div>

        <div className="flex items-center justify-between mt-2 px-2">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <Sparkles size={10} className="text-purple-500" />
            <span>{t('Sasl AI · Answers any question')}</span>
          </div>
          {!isPremium && remaining <= 5 && (
            <span className="text-[10px] text-red-500 font-medium">
              {remaining} queries left today
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Format AI response with markdown-like rendering
 */
function formatAIResponse(text: string): string {
  return text
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-purple-600 dark:text-purple-400">$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em class="italic text-gray-600 dark:text-gray-400">$1</em>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold mt-3 mb-1 text-gray-800 dark:text-gray-200">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-4 mb-2 text-gray-900 dark:text-gray-100">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-2 bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">$1</h1>')
    // Code blocks
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre class="bg-gray-900 text-gray-100 rounded-xl p-4 my-3 overflow-x-auto text-xs font-mono"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded-md text-xs font-mono">$1</code>')
    // Lists
    .replace(/^[•\-] (.+)$/gm, '<li class="ml-4 text-sm text-gray-700 dark:text-gray-300">• $1</li>')
    // Line breaks
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-purple-500 hover:text-purple-600 underline">$1</a>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr class="my-3 border-gray-200 dark:border-gray-700"/>');
}