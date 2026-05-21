/**
 * Sasl - Social Asynchronous Sharing Layer
 * Sasl Brain – Offline-first AI Engine with real intelligence
 */
import * as tf from '@tensorflow/tfjs';

// Comprehensive knowledge base about Sasl
const APP_KNOWLEDGE: Record<string, string> = {
  'what is sasl': 'Sasl (Social Asynchronous Sharing Layer) is the world\'s first social network that works completely offline! It uses WaveMesh technology to connect phones directly without internet. You can post, chat, stream, sell products, teach, and earn money – all without WiFi or mobile data! 🚀',
  'how does sasl work': 'Sasl uses a breakthrough technology called WaveMesh. Your phone creates direct peer-to-peer connections with nearby phones using Bluetooth and Wi-Fi Direct. Messages hop from phone to phone until they reach their destination. When you go online, everything syncs to the cloud! 📡',
  'offline': 'Yes! Sasl works 100% offline. Toggle the switch in the sidebar to go offline. You can still post, browse cached content, chat with nearby users via mesh, and complete gigs. Everything syncs automatically when you reconnect! 📶',
  'earn': '💰 You can earn money on Sasl through:\n\n• Marketplace: Sell products (5% fee, you keep 95%)\n• Streaming: Receive donations from viewers\n• Tutoring: Get paid for classes (90% to you)\n• Gigs: Complete tasks for payment\n• Ads: Watch ads to earn small rewards\n• Subscriptions: Creator subscriptions (70% to you)\n\nTop earners make $2,500-$4,500/month!',
  'money': 'Sasl has a built-in wallet system. You earn from:\n- Content creation & subscriptions\n- Marketplace sales (95% yours)\n- Streaming donations\n- Tutoring sessions\n- Completing gigs\n- Watching ads\n- Referral bonuses\n\nCheck your Wallet page for balance and Earnings page for breakdowns! 💎',
  'wallet': 'Your Sasl wallet holds your earnings. Go to Wallet in the sidebar to see:\n- Current balance\n- Transaction history\n- Earnings breakdown\n- Withdrawal options\n\nYou can top up using Stripe! 💳',
  'marketplace': 'The Sasl Marketplace lets you buy and sell products offline! Sellers keep 95% of each sale. You can list physical items, digital products, or services. Browse, buy with wallet balance, and even complete transactions offline – they sync when connected! 🛒',
  'streaming': 'Go live on Sasl Streaming! Broadcast video to your followers or nearby mesh users. Viewers can donate to support you. Works offline with nearby viewers via WaveMesh. Streamers earn from donations! 🎥',
  'tutoring': 'Sasl Tutoring connects teachers and students worldwide – even offline! Create sessions with your subject, hourly rate, and schedule. Students book and pay via wallet. Complete sessions transfer payment (90% to teacher). Perfect for remote learning! 📚',
  'gigs': 'Gig Central is Sasl\'s freelancer marketplace. Post tasks you need done or find gigs to complete. Categories include design, writing, coding, and more. Only 5% platform fee – way less than Upwork or Fiverr! 💼',
  'mesh': 'WaveMesh is Sasl\'s revolutionary P2P protocol. Instead of using cell towers, phones connect directly to nearby devices. Your content hops from phone to phone until it reaches the recipient. The more Sasl users, the stronger the network! 🌊',
  'reels': 'Sasl Reels are short vertical videos like TikTok – but they work offline! Create engaging short videos, add music and effects, and share with the community. Reels are cached locally so you can watch even without internet! 🎬',
  'snap': 'Sasl Snap lets you send disappearing photos and videos. Take a snap, set a timer (1-30 seconds), and send to friends. Snaps disappear after viewing. Works via mesh for nearby users! 📸',
  'ar filters': 'Sasl AR Filters use on-device face detection to apply fun effects to your photos and videos. No internet needed! Choose from hearts, stars, animal faces, and more. Create unique Stories and Reels that stand out! ✨',
  'privacy': 'Sasl puts your privacy first:\n\n🔒 End-to-end encryption on all messages\n👁️ You control who sees your content\n💰 Earnings are private by default\n🗑️ Delete your data anytime\n🌐 No data sold to advertisers\n\nYou\'re in complete control!',
  'security': 'Sasl uses military-grade encryption for all communications. Mesh messages are encrypted end-to-end. Your wallet is secured with multi-factor authentication. We never share your data with third parties. 🔐',
  'start': 'Welcome to Sasl! Here\'s how to get started:\n\n1. Complete your profile with photo and bio\n2. Explore the Feed to see content\n3. Visit Marketplace to browse products\n4. Check Gig Central for earning opportunities\n5. Try going offline – Sasl still works!\n6. Invite friends for referral bonuses\n\nNeed more help? Just ask! 🚀',
  'profile': 'Your profile is your identity on Sasl. Add a photo, bio, and showcase your skills. You can earn badges for achievements. Your profile shows your posts, products, and gigs. Visit Profile in the sidebar to customize! 👤',
  'sell': '🛒 To sell on Marketplace:\n1. Click "Sell Item"\n2. Add title, price, photo\n3. List your product\n4. Buyers can purchase and chat with you\n\nYou earn 95% of the sale price!',
  'withdraw': '💸 To withdraw earnings:\n1. Go to Wallet\n2. Click "Withdraw"\n3. Enter amount\n4. Funds sent to your connected account\n\nMinimum withdrawal: $10',
  'support': '📧 Need help?\n• Ask me anything about the app\n• Check the onboarding guide\n• Contact support@sasl.app\n• Join our community Discord',
  'post': '📝 To create a post:\n1. Go to the Feed\n2. Type in the composer box\n3. Add images, GIFs, or polls\n4. Click "Post"\n\nYou can even post OFFLINE - it syncs when you\'re back online!',
  'live audio': '🎙️ Live Audio lets you host real-time audio rooms like Clubhouse! Create a room, invite speakers, and listeners can join. Works via mesh for nearby users. Great for discussions, interviews, and community talks!',
  'group chat': '👥 Group Chat lets you create chat rooms with multiple people! Share messages, images, and files. Works via WaveMesh for nearby users – no internet needed!',
  'events': '📅 Events lets you create and discover local events! Set date, time, location, and invite attendees. Works offline – attendees can RSVP and the event syncs when online!',
  'nft badges': '🏅 NFT Badges are blockchain-verified achievements you earn on Sasl! Show off your skills and accomplishments. Trade or display them on your profile. Coming soon with full blockchain integration!',
  'analytics': '📊 Analytics shows your growth on Sasl:\n- Revenue charts & trends\n- Engagement metrics\n- Top performing posts\n- User demographics\n- Export reports anytime!',
};

const GREETINGS = [
  "Hi! I'm Sasl Brain 🧠 – your offline AI assistant. Ask me anything about the app!",
  "Hello! Sasl Brain here – ready to help with any question! 💚🧡",
  "Hey there! I'm Sasl Brain. What can I help you with today? 🚀",
];

function findBestMatch(query: string): string | null {
  const q = query.toLowerCase().trim();
  
  // Direct match first
  for (const [key, value] of Object.entries(APP_KNOWLEDGE)) {
    if (q.includes(key)) {
      return value;
    }
  }
  
  // Partial word matching
  const words = q.split(/\s+/);
  let bestMatch: string | null = null;
  let bestScore = 0;
  
  for (const [key, value] of Object.entries(APP_KNOWLEDGE)) {
    const keyWords = key.split(/\s+/);
    const matchCount = words.filter(w => keyWords.some(kw => kw.includes(w) || w.includes(kw))).length;
    const score = matchCount / Math.max(keyWords.length, 1);
    
    if (score > bestScore && score > 0.3) {
      bestScore = score;
      bestMatch = value;
    }
  }
  
  return bestMatch;
}

async function tryOnlineAI(query: string): Promise<string | null> {
  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer hf_placeholder_token', // Replace with your free HuggingFace token
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: `You are Sasl Brain, an AI assistant for a social media app called Sasl that works offline using mesh networking. Answer this user question concisely and helpfully in 2-3 sentences: ${query}`,
          parameters: { max_new_tokens: 150, temperature: 0.7 }
        })
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      const text = data[0]?.generated_text || '';
      const answerPart = text.split('helpfully in 2-3 sentences:')[1] || text;
      const cleaned = answerPart.replace(/^.*\?/, '').trim();
      return cleaned || null;
    }
    return null;
  } catch {
    return null;
  }
}

class SaslBrain {
  private initialized = false;

  async initialize(): Promise<void> {
    try {
      await tf.ready();
      console.log('🧠 Sasl Brain initialized');
      this.initialized = true;
    } catch (err) {
      console.warn('Sasl Brain basic mode', err);
      this.initialized = true;
    }
  }


  // Inside the SaslBrain class, add these methods after initialize():

  /**
   * Rank posts based on recency + engagement (offline scoring)
   */
  async rankPosts(posts: any[]): Promise<{ postId: string; relevanceScore: number; qualityScore: number; finalScore: number }[]> {
    if (!posts || posts.length === 0) return [];
    
    return posts.map((p: any) => {
      const likesCount = p.likes_count || 0;
      const commentsCount = p.comments_count || 0;
      const sharesCount = p.shares_count || 0;
      const createdAt = p.created_at ? new Date(p.created_at).getTime() : Date.now();
      
      // Quality score based on engagement
      const qualityScore = Math.min((likesCount * 2 + commentsCount * 3 + sharesCount * 5) / 50, 1);
      
      // Recency score (newer posts score higher)
      const ageInHours = (Date.now() - createdAt) / (1000 * 60 * 60);
      const recencyScore = Math.exp(-ageInHours / 24); // exponential decay over 24h
      
      // Relevance score (placeholder - would use ML in production)
      const relevanceScore = 0.5;
      
      // Final weighted score
      const finalScore = relevanceScore * 0.3 + qualityScore * 0.4 + recencyScore * 0.3;
      
      return {
        postId: p.id || p.postId || '',
        relevanceScore,
        qualityScore,
        finalScore,
      };
    }).sort((a, b) => b.finalScore - a.finalScore);
  }

  /**
   * Learn from user interactions (stores preferences locally)
   */
  async learnFromInteraction(postText: string, action: 'like' | 'dislike' | 'comment' | 'share' | 'hide', postId: string): Promise<void> {
    try {
      const prefs = JSON.parse(localStorage.getItem('sasl_brain_prefs') || '{"likedKeywords":[],"dislikedKeywords":[],"interactions":[]}');
      
      const keywords = postText.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      
      if (action === 'like' || action === 'share') {
        prefs.likedKeywords = [...new Set([...prefs.likedKeywords, ...keywords])].slice(0, 100);
      } else if (action === 'dislike' || action === 'hide') {
        prefs.dislikedKeywords = [...new Set([...prefs.dislikedKeywords, ...keywords])].slice(0, 100);
      }
      
      prefs.interactions.push({ postId, action, timestamp: Date.now() });
      if (prefs.interactions.length > 500) prefs.interactions = prefs.interactions.slice(-500);
      
      localStorage.setItem('sasl_brain_prefs', JSON.stringify(prefs));
    } catch (err) {
      console.warn('Sasl Brain learn error:', err);
    }
  }

  /**
   * Detect potentially toxic content (offline heuristic)
   */
  async detectToxicity(text: string): Promise<{ isToxic: boolean; score: number }> {
    const toxicPatterns = [
      /\b(spam|scam|fraud)\b/i,
      /\b(hate|racist|sexist)\b/i,
      /\b(abuse|harass|threat)\b/i,
    ];
    
    let matches = 0;
    toxicPatterns.forEach(pattern => {
      if (pattern.test(text)) matches++;
    });
    
    return {
      isToxic: matches >= 2,
      score: matches / toxicPatterns.length,
    };
  }

  /**
   * Get personalized recommendations
   */
  async getRecommendations(type: 'users' | 'products' | 'gigs', items: any[]): Promise<any[]> {
    try {
      const prefs = JSON.parse(localStorage.getItem('sasl_brain_prefs') || '{"likedKeywords":[]}');
      const likedKeywords: string[] = prefs.likedKeywords || [];
      
      if (likedKeywords.length === 0) return items;
      
      return items
        .map((item: any) => {
          let score = 0;
          const itemText = (item.title || item.username || item.text || '').toLowerCase();
          likedKeywords.forEach((kw: string) => {
            if (itemText.includes(kw.toLowerCase())) score += 1;
          });
          return { ...item, recommendationScore: score };
        })
        .sort((a: any, b: any) => b.recommendationScore - a.recommendationScore);
    } catch {
      return items;
    }
  }

  
  async chatbotResponse(question: string): Promise<string> {
    const msg = question.trim();
    if (!msg) return GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    
    // Check for greetings
    if (/^(hi|hello|hey|yo|what'?s up|howdy|sup)/i.test(msg)) {
      return GREETINGS[Math.floor(Math.random() * GREETINGS.length)] + 
        '\n\n💡 Try asking: "How do I earn money?", "What is WaveMesh?", "How does offline work?", "Tell me about Marketplace"';
    }
    
    // Check for thanks
    if (/^(thanks|thank you|thx|ty|appreciate)/i.test(msg)) {
      return "You're welcome! Happy to help. Is there anything else you'd like to know about Sasl? 💚🧡";
    }
    
    // Check for help command
    if (/^(help|what can you do|commands|menu)/i.test(msg)) {
      return "🤖 I'm Sasl Brain! Here's what I can help with:\n\n• Earning money & wallet\n• Creating posts & content\n• Streaming & Live Audio\n• Tutoring & teaching\n• Marketplace & selling\n• Gig Central & freelancing\n• Mesh Chat & Group Chat\n• Snaps, Reels & AR Filters\n• Privacy & security\n• Events & NFT Badges\n• Analytics & progress\n\nJust ask me a specific question about any of these!\n\n💡 Tip: Sasl works completely offline – toggle the switch in the sidebar!";
    }
    
    // Try knowledge base first (offline)
    const localAnswer = findBestMatch(msg);
    if (localAnswer) return localAnswer;
    
    // Try online AI
    const onlineAnswer = await tryOnlineAI(msg);
    if (onlineAnswer) return onlineAnswer;
    
    // Intelligent fallback based on keywords
    if (/money|earn|paid|income|revenue|profit/i.test(msg)) {
      return APP_KNOWLEDGE['earn'];
    }
    if (/post|create|write|share|content/i.test(msg)) {
      return APP_KNOWLEDGE['post'];
    }
    if (/video|live|broadcast|stream/i.test(msg)) {
      return APP_KNOWLEDGE['streaming'];
    }
    if (/teacher|student|class|learn|course|tutor/i.test(msg)) {
      return APP_KNOWLEDGE['tutoring'];
    }
    if (/buy|sell|product|shop|store|item/i.test(msg)) {
      return APP_KNOWLEDGE['marketplace'];
    }
    if (/balance|payment|transaction|stripe|withdraw/i.test(msg)) {
      return APP_KNOWLEDGE['wallet'];
    }
    
    // Default helpful response
    return `I don't have specific information about "${msg}" yet, but I'm learning! Try asking about:\n\n📱 Features: Marketplace, Streaming, Tutoring, Gigs, Reels, Snaps\n💰 Earning: "How to earn money?", "Wallet", "Sell products"\n🔒 Privacy: "Privacy", "Security"\n🌐 Tech: "Offline", "WaveMesh", "How does Sasl work?"\n🚀 Getting started: "How to start?"\n\nOr type "help" to see everything I can assist with!`;
  }
}

export const saslBrain = new SaslBrain();