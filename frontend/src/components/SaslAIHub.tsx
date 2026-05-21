/**
 * Sasl - Social Asynchronous Sharing Layer
 * Unified AI Hub - Full combination of AI Assistant + Voice AI + Sasl Brain
 * All features preserved and enhanced in one elegant interface
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles, Mic, Brain, Wand2, Hash, Image as ImageIcon, Send,
  Loader2, Copy, Check, MicOff, Volume2, X, Camera,
  Zap, Globe, Smile, FileText, Lightbulb, MessageSquare,
  ChevronRight, ArrowLeft, RefreshCw, Download, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { saslBrain } from '../services/saslBrain';

// ============================================================
// TYPES
// ============================================================
type TabType = 'assistant' | 'voice' | 'brain';
type AssistantMode = 'ideas' | 'hashtags' | 'caption';

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
}

interface VoiceConversation {
  type: 'user' | 'ai';
  text: string;
}

// ============================================================
// CONTENT ASSISTANT LOGIC (from AIAssistant.tsx)
// ============================================================
function generateLocalSuggestions(topic: string): string[] {
  const t = topic.trim();
  const capitalized = t.charAt(0).toUpperCase() + t.slice(1);
  
  const isPerson = /^[A-Z][a-z]+(\s[A-Z][a-z]+)?$/.test(capitalized) && !/^[A-Z]{2,}$/.test(t);
  const isTech = /ai|tech|code|software|app|web|data|crypto|blockchain|robot|computer|programming|developer/i.test(t);
  const isLifestyle = /food|travel|fitness|health|yoga|meditation|style|fashion|beauty|cook|recipe/i.test(t);
  const isBusiness = /business|startup|marketing|finance|invest|money|entrepreneur|sales|revenue/i.test(t);
  const isCreative = /art|music|design|photo|video|write|paint|draw|create|craft/i.test(t);
  const isEducation = /study|learn|teach|school|university|course|student|education|book/i.test(t);
  const isSports = /sport|football|soccer|basketball|game|player|team|win|champion/i.test(t);

  const allTemplates: Record<string, string[]> = {
    person: [
      `The inspiring story of ${capitalized} and how they changed the game 💫`,
      `${capitalized}'s top 5 secrets to success revealed 🔥`,
      `What ${capitalized} can teach us about resilience and growth 🌱`,
      `Exclusive: ${capitalized}'s daily routine that boosts productivity`,
      `Why everyone is talking about ${capitalized} right now`,
    ],
    tech: [
      `How ${capitalized} is revolutionizing the tech industry in 2026 🚀`,
      `${capitalized}: The complete beginner's guide to getting started`,
      `5 ${capitalized} tools you need to know about RIGHT NOW`,
      `The dark side of ${capitalized} nobody talks about 😱`,
      `${capitalized} vs traditional methods: Which actually wins?`,
    ],
    lifestyle: [
      `My honest 30-day experience with ${capitalized} – the results shocked me`,
      `${capitalized}: Simple tips that actually work (tested & proven)`,
      `Transform your daily routine with these ${capitalized} hacks ✨`,
      `${capitalized} on a budget: How to get started without spending much`,
      `The ultimate ${capitalized} guide for complete beginners`,
    ],
    business: [
      `How I made my first $1,000 with ${capitalized} 💰`,
      `${capitalized} trends that will dominate this year`,
      `Why ${capitalized} is the most valuable skill for entrepreneurs`,
      `From zero to hero: Real ${capitalized} success stories`,
      `The complete ${capitalized} strategy that actually converts`,
    ],
    creative: [
      `Unleash your creativity with these ${capitalized} techniques 🎨`,
      `${capitalized} inspiration: 10 ideas to spark your next masterpiece`,
      `How ${capitalized} completely changed my creative process`,
      `${capitalized} for absolute beginners: Start here!`,
      `Behind the scenes: ${capitalized} secrets from the pros`,
    ],
    education: [
      `The future of learning: How ${capitalized} is transforming education 📚`,
      `${capitalized} study techniques that top students swear by`,
      `Why ${capitalized} should be part of every curriculum`,
      `Learn ${capitalized} in just 10 minutes a day – here's how`,
      `${capitalized}: The skill that will future-proof your career`,
    ],
    sports: [
      `${capitalized}: The most underrated strategy for winning 🏆`,
      `How ${capitalized} is changing the game in 2026`,
      `${capitalized} training secrets the pros don't want you to know`,
      `From amateur to pro: My ${capitalized} journey`,
      `The science behind ${capitalized} performance`,
    ],
    general: [
      `Why ${capitalized} is trending worldwide right now 🌍`,
      `Everything you need to know about ${capitalized} in 5 minutes`,
      `${capitalized}: Myths vs Facts – what's really true?`,
      `The surprising benefits of ${capitalized} you never knew about`,
      `${capitalized} 101: A complete introduction for newcomers`,
    ],
  };

  let category = 'general';
  if (isPerson) category = 'person';
  else if (isTech) category = 'tech';
  else if (isLifestyle) category = 'lifestyle';
  else if (isBusiness) category = 'business';
  else if (isCreative) category = 'creative';
  else if (isEducation) category = 'education';
  else if (isSports) category = 'sports';

  return allTemplates[category].slice(0, 4);
}

function generateLocalHashtags(topic: string): string[] {
  const base = topic.toLowerCase().replace(/\s+/g, '');
  const words = topic.toLowerCase().split(/\s+/);
  
  const hashtags = [
    `#${base}`,
    `#${base}Community`,
    `#${base}Tips`,
    `#${base}Life`,
    `#${base}Trending`,
  ];
  
  words.forEach(word => {
    if (word.length > 3) {
      hashtags.push(`#${word}Vibes`);
      hashtags.push(`#${word}Daily`);
    }
  });
  
  hashtags.push('#SaslApp', '#OfflineFirst', '#SaslCommunity', '#ContentCreator');
  return [...new Set(hashtags)].slice(0, 10);
}

// ============================================================
// VOICE AI LOGIC (from VoiceAI.tsx)
// ============================================================
const VOICE_COMMANDS: Record<string, string> = {
  'feed': 'Opening Feed – your main content page 📱',
  'marketplace': 'Opening Marketplace – buy and sell products 🛒',
  'streaming': 'Opening Streaming – go live or watch streams 🎥',
  'tutoring': 'Opening Tutoring – find teachers or students 📚',
  'wallet': 'Opening Wallet – check your balance and earnings 💰',
  'profile': 'Opening Profile – view and edit your profile 👤',
  'create post': 'Opening the post composer – share something with the world! ✍️',
  'go live': 'Starting a live stream – your audience is waiting! 🔴',
  'how to earn': '💰 You can earn money on Sasl through: Marketplace sales (95% yours), Creator subscriptions (70% yours), Streaming donations, Tutoring sessions (90% yours), Completing gigs, and Watching ads! Top creators earn $2,500-$4,500/month!',
  'earn money': 'Sasl offers multiple income streams:\n• Marketplace: Sell products (5% fee)\n• Streaming: Receive donations\n• Tutoring: Get paid for classes (90% to you)\n• Gigs: Complete tasks for payment\n• Ads: Watch ads to earn rewards\n• Subscriptions: Creator subscriptions (70% to you)\n\nTop earners make $2,500-$4,500/month!',
  'offline': 'Sasl works completely offline! Toggle the switch in the sidebar. Your posts, chats, and marketplace activity sync automatically when you reconnect. WaveMesh connects nearby phones without internet! 🌐',
  'mesh': 'WaveMesh is Sasl\'s P2P protocol. Phones connect directly via Bluetooth and Wi-Fi Direct. Messages hop from device to device until reaching their destination. No internet required! 📡',
  'what can you do': 'I can help you navigate the app, answer questions about Sasl features, generate content ideas, create hashtags, and answer any question about how the platform works! Try saying: "Feed", "How to earn", "Create post", or "Go live" 🎤',
  'help': 'Here are some things you can say:\n• "Feed" or "Marketplace" – navigate the app\n• "How to earn" – learn about making money\n• "Create post" – start writing a post\n• "Go live" – start streaming\n• "Offline" – learn about offline mode\n• Ask any question about Sasl!',
  'sasl': 'Sasl stands for Social Asynchronous Sharing Layer. It\'s the world\'s first social network that works completely offline using WaveMesh technology. Post, chat, earn, and connect – no internet needed! 💚🧡',
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function SaslAIHub() {
  // ---- Tab State ----
  const [activeTab, setActiveTab] = useState<TabType>('assistant');

  // ---- Assistant State ----
  const [assistantMode, setAssistantMode] = useState<AssistantMode>('ideas');
  const [topic, setTopic] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [caption, setCaption] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [captionLoading, setCaptionLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Voice State ----
  const [listening, setListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceResponse, setVoiceResponse] = useState('');
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [voiceConversation, setVoiceConversation] = useState<VoiceConversation[]>([
    { type: 'ai', text: '🎤 Hi! I\'m Voice AI. Tap the mic and speak a command. Try: "Feed", "How to earn", or "Create post"' }
  ]);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef(window.speechSynthesis);
  const voiceConvoRef = useRef<HTMLDivElement>(null);

  // ---- Brain State ----
  const [brainMessages, setBrainMessages] = useState<ChatMessage[]>([
    { role: 'bot', text: "Hi! I'm Sasl Brain 🧠 – your offline AI assistant. Ask me anything about the app! I can help with earning money, features, privacy, and more.\n\n💡 Try asking: \"How do I earn?\", \"What is WaveMesh?\", or \"Tell me about Marketplace\"" }
  ]);
  const [brainInput, setBrainInput] = useState('');
  const [brainLoading, setBrainLoading] = useState(false);
  const brainChatRef = useRef<HTMLDivElement>(null);

  // ============================================================
  // INITIALIZATION
  // ============================================================
  useEffect(() => {
    // Initialize voice recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPart;
        } else {
          interimTranscript += transcriptPart;
        }
      }

      if (interimTranscript) setVoiceTranscript(interimTranscript);
      if (finalTranscript) {
        setVoiceTranscript(finalTranscript);
        processVoiceCommand(finalTranscript.toLowerCase().trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') toast.error('Microphone access denied');
      setListening(false);
    };

    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
  }, []);

  useEffect(() => {
    voiceConvoRef.current?.scrollTo(0, voiceConvoRef.current.scrollHeight);
  }, [voiceConversation]);

  useEffect(() => {
    brainChatRef.current?.scrollTo(0, brainChatRef.current.scrollHeight);
  }, [brainMessages]);

  // ============================================================
  // ASSISTANT HANDLERS
  // ============================================================
  const generateContent = useCallback(async () => {
    if (!topic.trim()) {
      toast.error('Enter a topic first');
      return;
    }
    setAssistantLoading(true);
    
    // Simulate AI processing time for realism
    await new Promise(resolve => setTimeout(resolve, 600));
    
    setSuggestions(generateLocalSuggestions(topic));
    setHashtags(generateLocalHashtags(topic));
    setCaption(null);
    setAssistantLoading(false);
  }, [topic]);

  const generateImageCaption = async (file: File) => {
    setCaptionLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      // Simulate AI caption generation
      setTimeout(() => {
        const captions = [
          'Beautiful moment captured! 📸',
          'Stunning view! Nature at its finest 🌿',
          'Living my best life! ✨',
          'Perfect day, perfect vibes 🌞',
          'Capturing memories that last forever 💫',
        ];
        setCaption(captions[Math.floor(Math.random() * captions.length)]);
        setCaptionLoading(false);
      }, 1000);
    };
    reader.readAsDataURL(file);
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // ============================================================
  // VOICE HANDLERS
  // ============================================================
  const processVoiceCommand = async (command: string) => {
    setVoiceProcessing(true);
    setVoiceConversation(prev => [...prev, { type: 'user', text: command }]);

    let matchedResponse: string | null = null;
    let bestMatch = '';

    for (const [key, value] of Object.entries(VOICE_COMMANDS)) {
      if (command.includes(key) && key.length > bestMatch.length) {
        matchedResponse = value;
        bestMatch = key;
      }
    }

    if (matchedResponse) {
      setVoiceResponse(matchedResponse);
      setVoiceConversation(prev => [...prev, { type: 'ai', text: matchedResponse! }]);
      speakResponse(matchedResponse);
    } else {
      try {
        const aiResponse = await saslBrain.chatbotResponse(command);
        setVoiceResponse(aiResponse);
        setVoiceConversation(prev => [...prev, { type: 'ai', text: aiResponse }]);
        speakResponse(aiResponse);
      } catch {
        const fallback = "I didn't quite catch that. Try saying: 'Feed', 'Marketplace', 'How to earn', 'Create post', or 'Help'";
        setVoiceResponse(fallback);
        setVoiceConversation(prev => [...prev, { type: 'ai', text: fallback }]);
        speakResponse(fallback);
      }
    }

    setVoiceProcessing(false);
    setVoiceTranscript('');
  };

  const speakResponse = (text: string) => {
    if (synthRef.current) {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.1;
      utterance.volume = 0.9;
      synthRef.current.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition not available. Try Chrome desktop or Android.');
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setListening(true);
        setVoiceTranscript('');
        setVoiceResponse('');
      } catch {
        toast.error('Failed to start microphone');
      }
    }
  };

  // ============================================================
  // BRAIN HANDLERS
  // ============================================================
  const handleBrainSend = async () => {
    if (!brainInput.trim()) return;
    const userMessage = brainInput.trim();
    setBrainMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setBrainInput('');
    setBrainLoading(true);

    try {
      const response = await saslBrain.chatbotResponse(userMessage);
      setBrainMessages(prev => [...prev, { role: 'bot', text: response }]);
    } catch {
      setBrainMessages(prev => [...prev, { role: 'bot', text: 'Sorry, I had trouble processing that. Please try again.' }]);
    } finally {
      setBrainLoading(false);
    }
  };

  const quickQuestions = [
    'How do I earn money?',
    'What is WaveMesh?',
    'How does offline work?',
    'Tell me about Marketplace',
    'Privacy features?',
    'How to start streaming?',
  ];

  // ============================================================
  // RENDER
  // ============================================================
  const tabs = [
    { key: 'assistant' as TabType, icon: <Wand2 size={20} />, label: 'Content Assistant', color: 'purple' },
    { key: 'voice' as TabType, icon: <Mic size={20} />, label: 'Voice AI', color: 'green' },
    { key: 'brain' as TabType, icon: <Brain size={20} />, label: 'Sasl Brain', color: 'orange' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-600 p-6 text-white">
          <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Sparkles className="text-yellow-300" size={32} />
            Sasl AI Hub
          </h2>
          <p className="text-white/80 text-sm">
            Your all-in-one AI toolbox – content creation, voice commands & smart assistant. Works offline!
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 p-2 bg-gray-100 dark:bg-gray-800 mx-4 mt-4 rounded-xl">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all flex-1 justify-center ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-gray-700 shadow-md text-green-600 scale-105'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 md:p-6">
          <AnimatePresence mode="wait">
            {/* ============================================================ */}
            {/* CONTENT ASSISTANT TAB */}
            {/* ============================================================ */}
            {activeTab === 'assistant' && (
              <motion.div
                key="assistant"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.25 }}
              >
                {/* Mode Switcher */}
                <div className="flex gap-2 mb-6 bg-white dark:bg-gray-800 p-1 rounded-xl shadow-inner">
                  {[
                    { key: 'ideas' as AssistantMode, icon: <Lightbulb size={16} />, label: 'Post Ideas' },
                    { key: 'hashtags' as AssistantMode, icon: <Hash size={16} />, label: 'Hashtags' },
                    { key: 'caption' as AssistantMode, icon: <ImageIcon size={16} />, label: 'Image Caption' },
                  ].map(mode => (
                    <button
                      key={mode.key}
                      onClick={() => { setAssistantMode(mode.key); setSuggestions([]); setHashtags([]); setCaption(null); }}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition flex-1 justify-center ${
                        assistantMode === mode.key
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                          : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {mode.icon} <span className="hidden sm:inline">{mode.label}</span>
                    </button>
                  ))}
                </div>

                {/* Input Area */}
                {assistantMode !== 'caption' ? (
                  <div className="flex gap-3 mb-6">
                    <div className="relative flex-1">
                      <input
                        className="w-full px-5 py-3.5 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition outline-none"
                        placeholder={
                          assistantMode === 'ideas'
                            ? 'Enter a topic for post ideas... (e.g., technology, travel, food)'
                            : 'Enter a topic for hashtags... (e.g., fitness, art, business)'
                        }
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && generateContent()}
                      />
                      {topic && (
                        <button
                          onClick={() => { setTopic(''); setSuggestions([]); setHashtags([]); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={generateContent}
                      disabled={assistantLoading || !topic.trim()}
                      className="px-6 py-3.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {assistantLoading ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : (
                        <Wand2 size={20} />
                      )}
                      Generate
                    </button>
                  </div>
                ) : (
                  <div className="mb-6">
                    <div
                      className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center cursor-pointer hover:border-purple-400 transition"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera size={48} className="mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-500 font-semibold">Click to upload an image</p>
                      <p className="text-gray-400 text-sm">We'll generate a caption for you</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => e.target.files?.[0] && generateImageCaption(e.target.files[0])}
                      />
                    </div>
                  </div>
                )}

                {/* Loading State */}
                {assistantLoading && (
                  <div className="text-center py-12">
                    <Loader2 className="animate-spin mx-auto text-purple-500" size={48} />
                    <p className="text-gray-500 mt-3 font-semibold">Generating amazing content...</p>
                    <p className="text-gray-400 text-sm mt-1">Our AI is crafting the perfect suggestions for "{topic}"</p>
                  </div>
                )}

                {/* Results: Post Ideas */}
                {!assistantLoading && assistantMode === 'ideas' && suggestions.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-purple-600">
                      <Lightbulb size={20} /> Post Ideas for "{topic}"
                    </h3>
                    {suggestions.map((suggestion, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-start gap-3 hover:shadow-md transition"
                      >
                        <div className="flex-1">
                          <span className="inline-block text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-semibold mb-2">
                            Option {idx + 1}
                          </span>
                          <p className="text-gray-800 dark:text-gray-200">{suggestion}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(suggestion, idx)}
                          className="flex-shrink-0 p-2.5 rounded-full hover:bg-purple-50 transition"
                          title="Copy to clipboard"
                        >
                          {copiedIndex === idx ? (
                            <Check size={18} className="text-green-500" />
                          ) : (
                            <Copy size={18} className="text-gray-400 hover:text-purple-500" />
                          )}
                        </button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {/* Results: Hashtags */}
                {!assistantLoading && assistantMode === 'hashtags' && hashtags.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h3 className="font-bold text-lg flex items-center gap-2 text-blue-600 mb-4">
                      <Hash size={20} /> Hashtags for "{topic}"
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {hashtags.map((tag, idx) => (
                        <motion.button
                          key={idx}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: idx * 0.05, type: 'spring' }}
                          onClick={() => copyToClipboard(tag, idx)}
                          className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition flex items-center gap-1.5"
                        >
                          {tag}
                          {copiedIndex === idx ? (
                            <Check size={14} className="text-green-500" />
                          ) : (
                            <Copy size={14} className="opacity-50" />
                          )}
                        </motion.button>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        const allTags = hashtags.join(' ');
                        copyToClipboard(allTags, -1);
                      }}
                      className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                    >
                      <Copy size={14} /> Copy all hashtags
                    </button>
                  </motion.div>
                )}

                {/* Results: Caption */}
                {!assistantLoading && assistantMode === 'caption' && caption && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <h3 className="font-bold text-lg flex items-center gap-2 text-green-600 mb-4">
                      <ImageIcon size={20} /> Generated Caption
                    </h3>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                      <p className="text-xl italic text-gray-700 dark:text-gray-300">"{caption}"</p>
                      <button
                        onClick={() => copyToClipboard(caption, 0)}
                        className="mt-4 flex items-center gap-2 text-green-600 hover:text-green-800 font-semibold text-sm"
                      >
                        {copiedIndex === 0 ? <Check size={16} /> : <Copy size={16} />}
                        Copy Caption
                      </button>
                    </div>
                  </motion.div>
                )}

                {captionLoading && (
                  <div className="text-center py-8">
                    <Loader2 className="animate-spin mx-auto text-green-500" size={40} />
                    <p className="text-gray-500 mt-2">Analyzing image and generating caption...</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ============================================================ */}
            {/* VOICE AI TAB */}
            {/* ============================================================ */}
            {activeTab === 'voice' && (
              <motion.div
                key="voice"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.25 }}
                className="text-center"
              >
                {/* Conversation Display */}
                <div
                  ref={voiceConvoRef}
                  className="h-72 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 mb-6 space-y-3 text-left"
                >
                  {voiceConversation.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: msg.type === 'user' ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                        msg.type === 'user'
                          ? 'bg-green-500 text-white rounded-br-md'
                          : 'bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-bl-md'
                      }`}>
                        <p className="text-xs opacity-70 font-semibold mb-1">
                          {msg.type === 'user' ? 'You said' : 'Voice AI'}
                        </p>
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </motion.div>
                  ))}
                  {voiceProcessing && (
                    <div className="flex justify-start">
                      <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-2xl shadow-sm">
                        <Loader2 className="animate-spin text-green-500" size={20} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Live Transcript */}
                {listening && voiceTranscript && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-gray-500 italic mb-4 text-lg"
                  >
                    "{voiceTranscript}"
                  </motion.div>
                )}

                {/* Mic Button */}
                <motion.button
                  onClick={toggleListening}
                  whileTap={{ scale: 0.9 }}
                  className={`relative p-10 rounded-full transition-all shadow-2xl ${
                    listening
                      ? 'bg-red-500 shadow-red-500/30'
                      : 'bg-gradient-to-br from-green-400 to-emerald-600 shadow-green-500/30'
                  }`}
                >
                  {listening ? (
                    <>
                      <MicOff size={40} className="text-white" />
                      <motion.div
                        className="absolute inset-0 rounded-full border-4 border-red-400"
                        animate={{ scale: [1, 1.4, 1], opacity: [0.7, 0, 0.7] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      />
                    </>
                  ) : (
                    <>
                      <Mic size={40} className="text-white" />
                      <Volume2 size={20} className="text-white/70 absolute top-3 right-3" />
                    </>
                  )}
                </motion.button>

                <p className="text-lg font-semibold mt-4 text-gray-700 dark:text-gray-300">
                  {listening ? '🎤 Listening... speak now' : 'Tap the mic and speak'}
                </p>

                {/* Quick Commands */}
                <div className="mt-6">
                  <p className="text-xs text-gray-400 mb-3">Try saying:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {['Feed', 'How to earn', 'Create post', 'Go live', 'Wallet', 'Offline', 'Help'].map(cmd => (
                      <button
                        key={cmd}
                        onClick={() => processVoiceCommand(cmd.toLowerCase())}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-sm font-semibold text-gray-600 dark:text-gray-300 transition"
                      >
                        "{cmd}"
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ============================================================ */}
            {/* SASL BRAIN TAB */}
            {/* ============================================================ */}
            {activeTab === 'brain' && (
              <motion.div
                key="brain"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.25 }}
              >
                {/* Chat Messages */}
                <div
                  ref={brainChatRef}
                  className="h-[450px] overflow-y-auto bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 mb-4 space-y-4"
                >
                  {brainMessages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] px-5 py-3.5 rounded-2xl ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-br-md'
                          : 'bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-bl-md'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-bold ${msg.role === 'user' ? 'text-white/70' : 'text-green-600'}`}>
                            {msg.role === 'user' ? 'You' : '🧠 Sasl Brain'}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                      </div>
                    </motion.div>
                  ))}
                  {brainLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white dark:bg-gray-800 px-5 py-3 rounded-2xl shadow-sm flex items-center gap-2">
                        <Loader2 className="animate-spin text-green-500" size={18} />
                        <span className="text-sm text-gray-400">Sasl Brain is thinking...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Questions */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {quickQuestions.map(q => (
                    <button
                      key={q}
                      onClick={() => {
                        setBrainMessages(prev => [...prev, { role: 'user', text: q }]);
                        saslBrain.chatbotResponse(q).then(response => {
                          setBrainMessages(prev => [...prev, { role: 'bot', text: response }]);
                        });
                      }}
                      className="px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-full text-xs font-semibold hover:bg-orange-100 dark:hover:bg-orange-900/40 transition"
                    >
                      {q}
                    </button>
                  ))}
                </div>

                {/* Input */}
                <div className="flex gap-2">
                  <input
                    value={brainInput}
                    onChange={e => setBrainInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleBrainSend()}
                    placeholder="Ask me anything about Sasl..."
                    className="flex-1 px-5 py-3.5 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition outline-none"
                  />
                  <button
                    onClick={handleBrainSend}
                    disabled={brainLoading || !brainInput.trim()}
                    className="px-6 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {brainLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between text-xs text-gray-400">
          <span>💡 All AI features work offline</span>
          <span className="flex items-center gap-1">
            <Globe size={12} /> Sasl AI Hub v1.0
          </span>
        </div>
      </motion.div>
    </div>
  );
}