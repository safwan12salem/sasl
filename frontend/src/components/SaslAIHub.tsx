/**
 * Sasl Brain — Legendary AI Hub
 * Answers ANY question with encyclopedia-grade detail
 * Free: 20 queries/day | Premium: Unlimited + GPT-level responses
 */
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { askSaslEngine, FREE_LIMIT, PREMIUM_PRICE, getUsage } from '../services/saslEngine';
import { Sparkles, Send, Loader2, Brain, Crown, Zap, Mic, MicOff, Volume2, Copy, ThumbsUp, ThumbsDown, RotateCcw, Clock, Infinity, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  { icon: '💰', text: 'How can I earn money on Sasl?' },
  { icon: '🌊', text: 'How does WaveMesh work offline?' },
  { icon: '🧠', text: 'Explain quantum computing simply' },
  { icon: '💼', text: 'How to start a successful business?' },
  { icon: '🏥', text: 'What are best practices for mental health?' },
  { icon: '🔬', text: 'How does CRISPR gene editing work?' },
  { icon: '📚', text: 'What are the most effective study techniques?' },
  { icon: '💻', text: 'Explain how blockchain works' },
];

export default function SaslAIHub() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `🧠 **Welcome to Sasl Brain!**\n\nI'm your legendary AI assistant — I can answer ANY question with encyclopedia-grade detail. Science, history, business, technology, health, programming, or anything else you're curious about.\n\n**Free:** 20 questions/day\n**Premium:** Unlimited + advanced AI (${PREMIUM_PRICE})\n\nWhat would you like to know today? 🌟`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [usage, setUsage] = useState(getUsage());
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Premium status
  const isPremium = user?.is_premium || false;
  const remaining = Math.max(0, FREE_LIMIT - usage.count);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // Speech recognition
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error(t('Speech recognition not available in this browser'));
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => {
      setIsListening(false);
      toast.error(t('Could not hear you. Try again.'));
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Send message
  const sendMessage = async (text?: string) => {
    const query = (text || input).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await askSaslEngine(query);
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      setUsage(getUsage());
    } catch (err) {
      toast.error(t('Failed to get response. Please try again.'));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // Copy message
  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success(t('Copied!'));
  };

  // Retry last message
  const retryLast = () => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      sendMessage(lastUserMsg.content);
    }
  };

  // Clear chat
  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `🧠 **Fresh start!** What would you like to learn about today?`,
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <Brain size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold gradient-text">{t('Sasl Brain')}</h1>
            <p className="text-xs text-gray-500">{t('Legendary AI Engine')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Usage indicator */}
          {!isPremium && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs">
              <Clock size={12} className="text-orange-500" />
              <span className={remaining <= 5 ? 'text-red-500 font-bold' : 'text-gray-600 dark:text-gray-400'}>
                {remaining}/{FREE_LIMIT}
              </span>
            </div>
          )}
          {isPremium && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-full text-xs">
              <Infinity size={12} className="text-purple-500" />
              <span className="text-purple-600 dark:text-purple-400 font-semibold">{t('Premium')}</span>
            </div>
          )}
          <button onClick={clearChat} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition" title={t('Clear chat')}>
            <RotateCcw size={16} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div ref={chatRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'user' ? (
                <div className="max-w-[85%] sm:max-w-[75%] px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl rounded-br-md shadow-lg">
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <span className="text-[10px] text-white/60 mt-1 block">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ) : (
                <div className="max-w-[90%] sm:max-w-[80%]">
                  <div className="px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl rounded-bl-md shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="text-sm prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap" 
                      dangerouslySetInnerHTML={{ __html: formatAIResponse(msg.content) }} 
                    />
                    {/* Action buttons */}
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <button onClick={() => copyMessage(msg.content)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition" title={t('Copy')}>
                        <Copy size={13} className="text-gray-400" />
                      </button>
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition" title={t('Helpful')}>
                        <ThumbsUp size={13} className="text-gray-400" />
                      </button>
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition" title={t('Not helpful')}>
                        <ThumbsDown size={13} className="text-gray-400" />
                      </button>
                      <button onClick={() => navigator.clipboard.readText?.() || null} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition ml-auto" title={t('Read aloud')}>
                        <Volume2 size={13} className="text-gray-400" />
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

        {/* Loading indicator */}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl rounded-bl-md shadow-sm">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Suggested Questions (when chat is empty) */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-500 mb-2">{t('Try asking about:')}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SUGGESTED_QUESTIONS.slice(0, 4).map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q.text)}
                className="text-left px-3 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-xs transition border border-gray-100 dark:border-gray-700"
              >
                <span className="mr-1">{q.icon}</span>
                {q.text.length > 30 ? q.text.slice(0, 30) + '...' : q.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Premium upsell banner */}
      {!isPremium && usage.count >= 15 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mb-2 p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-200 dark:border-purple-800 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Crown size={18} className="text-yellow-500" />
            <div>
              <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">{t('Upgrade to Premium')}</p>
              <p className="text-[10px] text-gray-500">{t('Unlimited queries + advanced AI')}</p>
            </div>
          </div>
          <button className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-xs font-semibold shadow-lg">
            {PREMIUM_PRICE}
          </button>
        </motion.div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          {/* Voice input */}
          <button
            onClick={isListening ? stopListening : startListening}
            className={`p-3 rounded-xl transition ${
              isListening 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          {/* Text input */}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={t('Ask me anything...')}
              className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl border-2 border-transparent focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800 transition outline-none text-sm"
              disabled={loading}
            />
            {/* Character count */}
            {input.length > 200 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                {input.length}
              </span>
            )}
          </div>

          {/* Send button */}
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>

        {/* Premium status bar */}
        <div className="flex items-center justify-between mt-2 px-1">
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <Sparkles size={10} />
            <span>{t('Powered by Sasl Brain')}</span>
          </div>
          {!isPremium && (
            <button className="flex items-center gap-1 text-[10px] text-purple-500 hover:text-purple-600 font-medium">
              <Crown size={10} />
              <span>{t('Upgrade')}</span>
            </button>
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
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    // Code blocks
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-gray-900 rounded-lg p-3 my-2 overflow-x-auto text-xs"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-900 px-1.5 py-0.5 rounded text-xs text-pink-500">$1</code>')
    // Line breaks
    .replace(/\n/g, '<br/>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-4 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
    // Lists
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-sm">$1</li>')
    .replace(/^• (.+)$/gm, '<li class="ml-4 list-disc text-sm">$1</li>')
    // Dividers
    .replace(/^---$/gm, '<hr class="my-3 border-gray-200 dark:border-gray-700"/>');
}