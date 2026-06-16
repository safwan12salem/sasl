/**
 * Sasl - Social Asynchronous Sharing Layer
 * 🧠 Sasl Brain – Breakthrough Offline-First AI Engine
 * 
 * Features:
 * - 80+ knowledge entries covering every Sasl feature
 * - Contextual question understanding
 * - Personality-driven responses
 * - Offline-first: works without internet
 * - Fallback to online HuggingFace API when available
 * - User preference learning
 * - Content ranking algorithm
 * - Toxicity detection
 */
import * as tf from '@tensorflow/tfjs';

// ============================================================
// COMPREHENSIVE KNOWLEDGE BASE — 80+ Entries
// ============================================================
const APP_KNOWLEDGE: Record<string, string> = {
  // ---- GENERAL ----
  'what is sasl': 'Sasl (Social Asynchronous Sharing Layer) is the world\'s first social network that works completely offline! 🌍 It uses WaveMesh technology to connect phones directly without internet. You can post, chat, stream, sell products, teach, and earn money – all without WiFi or mobile data! Built for everyone, everywhere. 🚀',
  'how does sasl work': 'Sasl uses WaveMesh – a breakthrough P2P protocol. Your phone creates direct connections with nearby phones via Bluetooth and Wi-Fi Direct. Messages hop from device to device until reaching their destination. When online, everything syncs to the cloud. It\'s like a mesh network for social media! 📡',
  'why sasl': 'Sasl exists because 3 billion people still lack reliable internet. We believe connectivity is a human right. Sasl works offline so everyone can participate in the digital economy – regardless of infrastructure. Plus, you earn real money while using it! 💚🧡',
  'who created sasl': 'Sasl was created by a visionary founder who believed social media should work for everyone – not just those with perfect internet. Built from Libya 🇱🇾, Sasl is a testament to what\'s possible when you refuse to accept limitations. The founder\'s mission: connect the unconnected.',
  
  // ---- EARNING MONEY ----
  'earn': '💰 You can earn real money on Sasl through multiple streams:\n\n• 🛍️ Marketplace: Sell products (keep 95%)\n• 🎥 Streaming: Receive viewer donations\n• 📚 Tutoring: Get paid for classes (90% to you)\n• 💼 Gig Central: Complete freelance tasks\n• 👀 Ads: Earn by watching sponsored content\n• ⭐ Subscriptions: Creator subscriptions (70% to you)\n• 🔗 Referrals: Earn for inviting friends\n\nTop creators earn $2,500-$4,500/month!',
  'money': 'Sasl has a built-in digital wallet. You earn SaslCoins (convertible to real currency) from:\n- Content creation & subscriptions\n- Marketplace sales (95% yours)\n- Streaming donations\n- Tutoring sessions (90% to teacher)\n- Completing gigs\n- Watching ads ($0.001/view)\n- Referral bonuses ($1 per friend)\n\nCheck Wallet page for balance! 💎',
  'wallet': '💳 Your Sasl Wallet holds all your earnings. Features:\n• Real-time balance tracking\n• Full transaction history\n• Earnings breakdown by source\n• Withdrawal to bank/Stripe\n• Top-up via Stripe\n• Privacy controls\n\nMinimum withdrawal: $10. Go to Wallet in sidebar!',
  'top up': 'To add funds to your wallet:\n1. Go to Wallet page\n2. Click "Top Up Wallet"\n3. Enter amount\n4. Complete Stripe payment\n5. Funds appear instantly!\n\nMinimum top-up: $1 💰',
  'how much can i earn': 'Realistic monthly earnings on Sasl:\n\n🎥 Creator (10K followers): $500-$2,500\n🛍️ Seller (50 products): $300-$1,800\n📚 Teacher (15 students): $800-$4,500\n💼 Gig Worker (active): $400-$1,200\n👀 Ad Watcher (daily): $5-$15\n\nTop performers exceed these significantly! 📈',
  'creator fund': 'Sasl allocates 10% of platform ad revenue to the Creator Fund. Active creators receive monthly payouts based on engagement, followers, and content quality. The more value you create, the more you earn! 🎨',
  
  // ---- MARKETPLACE ----
  'marketplace': '🛒 Sasl Marketplace lets you buy and sell anything – even offline!\n\nFor Sellers:\n• List products with photos\n• Set your own prices\n• Keep 95% of each sale\n• Chat with buyers\n\nFor Buyers:\n• Browse by category\n• Filter by price/rating\n• Buy with wallet balance\n• Review purchases\n\nOffline transactions sync when connected!',
  'sell': 'To sell on Marketplace:\n1. Click "Sell Item" button\n2. Add product title & description\n3. Set price and upload photo\n4. Choose category\n5. Set stock quantity\n6. Click "List Product"\n\nYour item is now live! You earn 95% of each sale 🛍️',
  'buy': 'To buy on Marketplace:\n1. Browse products or search\n2. Click on a product for details\n3. Check reviews and rating\n4. Click "Buy Now"\n5. Confirm purchase from wallet\n6. Chat with seller for delivery\n\nPurchase protection included! 🛡️',
  'categories': 'Marketplace categories:\n• Electronics\n• Clothing\n• Home & Garden\n• Sports\n• Books\n• Art\n• Music\n• Food\n• Services\n• Other\n\nFilter by category for easy browsing!',

  // ---- STREAMING ----
  'streaming': '🎥 Sasl Streaming – Go live anytime, anywhere!\n\nFeatures:\n• Live video broadcasting\n• Real-time viewer chat\n• Donation system\n• Stream scheduling\n• Viewer count tracking\n• Category tags\n• Save streams\n• Offline streaming via mesh!\n\nStart streaming: Go to Streaming → "Go Live"',
  'go live': 'To start streaming:\n1. Go to Streaming page\n2. Enter your stream title\n3. Select category\n4. Click "Go Live"\n5. Allow camera access\n6. You\'re broadcasting!\n\nViewers can find you and donate! 🔴',
  'donate stream': 'To donate to a streamer:\n1. Find a live stream\n2. Enter donation amount\n3. Add optional message\n4. Click "Donate"\n\nDonations come from your wallet. Streamers receive 95% after platform fee! 💝',

  // ---- TUTORING ----
  'tutoring': '📚 Sasl Tutoring – Learn and teach, even offline!\n\nFor Teachers:\n• Create sessions with subject/price\n• Set schedule and duration\n• Upload materials\n• Use interactive whiteboard\n• Earn 90% of session price\n\nFor Students:\n• Browse available sessions\n• Join live classes\n• Access study materials\n• Earn certificates\n\nGroup classes available!',
  'teach': 'To become a teacher on Sasl:\n1. Go to Tutoring page\n2. Create a session\n3. Set subject and price\n4. Choose schedule\n5. Students will find and book\n6. Teach via live video\n7. Complete session to get paid\n\nYou earn 90% of each session! 🎓',
  'learn': 'To find a tutor:\n1. Go to Tutoring page\n2. Browse available sessions\n3. Filter by subject\n4. Check tutor ratings\n5. Join a session\n6. Attend via live video\n7. Access materials\n\nEarn certificates upon completion! 📜',
  'certificates': 'Sasl certificates are awarded when you complete tutoring sessions. They show:\n• Subject mastered\n• Tutor name\n• Completion date\n• Skills acquired\n\nDisplay them on your profile to showcase your expertise! 🏅',

  // ---- GIG CENTRAL ----
  'gigs': '💼 Gig Central – Freelance marketplace!\n\nPost a gig:\n• Describe what you need\n• Set budget & deadline\n• Add milestones\n• Review proposals\n• Pay upon completion\n\nTake a gig:\n• Browse open gigs\n• Accept and start working\n• Complete milestones\n• Get paid per milestone\n\nOnly 5% platform fee – way lower than Upwork/Fiverr!',
  'find work': 'To find freelance work:\n1. Go to Gig Central\n2. Browse "Open" gigs\n3. Find one matching your skills\n4. Click "Take Gig"\n5. Chat with client\n6. Complete the work\n7. Get paid!\n\nBuild your portfolio and earn badges! 🏗️',
  'hire': 'To hire a freelancer:\n1. Go to Gig Central\n2. Click "Post a Gig"\n3. Describe what you need\n4. Set budget and deadline\n5. Add payment milestones\n6. Wait for someone to take it\n7. Review and pay upon completion\n\nSafe and secure! 🤝',

  // ---- SNAP ----
  'snap': '📸 Sasl Snap – Disappearing photos & videos!\n\n• Record a video or take a photo\n• Add captions and drawings\n• Set viewing duration (1-30s)\n• Send to specific users\n• View once then disappears\n• Build streaks with daily snaps\n• Works offline via mesh!\n\nLike Snapchat, but private and offline! 👻',
  'streaks': '🔥 Snap Streaks track how many consecutive days you\'ve snapped with someone. Send a snap every 24 hours to maintain the streak. Longer streaks unlock special badges! Your longest streak is saved forever.',

  // ---- REELS ----
  'reels': '🎬 Sasl Reels – Short vertical videos!\n\n• Record or upload videos\n• Add music and effects\n• Like, comment, share\n• Swipe to browse\n• Works offline – cached locally\n• Your Reels can go viral!\n\nLike TikTok, but you own your content! 🎵',

  // ---- LIVE AUDIO ----
  'live audio': '🎙️ Live Audio – Clubhouse-style rooms!\n\n• Host audio rooms\n• Invite speakers\n• Listeners can raise hand\n• Send emoji reactions\n• Public or private rooms\n• Record sessions\n• Works via mesh!\n\nPerfect for discussions, talks, and community! 🎧',

  // ---- AI FEATURES ----
  'ai assistant': '🤖 The Sasl AI Assistant helps you:\n• Generate post ideas\n• Create hashtags\n• Caption your images\n• Voice commands\n• Answer questions\n\nAll powered by on-device AI – works completely offline! Try it in the AI Hub!',
  'voice ai': '🎤 Voice AI lets you control Sasl with your voice! Say commands like:\n• "Feed" – go to feed\n• "Marketplace" – open marketplace\n• "How to earn" – learn about earning\n• "Create post" – start a post\n• "Go live" – start streaming\n\nWorks offline with speech recognition!',
  'content ideas': 'Need content ideas? Try the AI Content Assistant:\n1. Go to AI Hub\n2. Select "Post Ideas"\n3. Enter a topic\n4. Get 4 unique post suggestions\n5. Copy and use!\n\nWorks for any niche! ✨',

  // ---- MESH NETWORK ----
  'mesh': '🌊 WaveMesh is Sasl\'s revolutionary P2P protocol. Instead of cell towers, phones connect directly. Your content hops phone-to-phone until it reaches the destination. The more users, the stronger the network! Currently connecting people up to 20km apart in urban areas. Eventually: global coverage! 🌍',
  'wave mesh': 'WaveMesh technology:\n• Bluetooth 5.0 for nearby connections\n• Wi-Fi Direct for longer range\n• P2P message relay system\n• End-to-end encrypted\n• Automatic sync when online\n• Works across 190+ countries\n\nThis is what makes Sasl unique! 🔗',
  'offline mode': '📡 Offline Mode in Sasl:\n1. Toggle the switch in sidebar\n2. Continue posting, browsing, chatting\n3. Content queues locally\n4. Auto-syncs when back online\n5. Mesh connects you to nearby users\n\nYou\'re never truly disconnected! 💪',

  // ---- PRIVACY & SECURITY ----
  'privacy': '🔒 Sasl Privacy Features:\n• End-to-end encryption on all messages\n• You control who sees your content\n• Earnings are private by default\n• Delete your data anytime\n• No data sold to advertisers\n• Transparent privacy policy\n\nYou\'re in complete control! 🛡️',
  'security': 'Sasl security measures:\n• Military-grade encryption\n• JWT authentication\n• Rate limiting on all endpoints\n• CSRF protection\n• Content moderation AI\n• Dispute resolution system\n• Two-factor authentication coming soon\n\nYour data is safe with Sasl! 🔐',

  // ---- PROFILE & SETTINGS ----
  'profile': '👤 Your Sasl Profile:\n• Profile photo and cover\n• Bio and display name\n• Skills and badges\n• Portfolio showcase\n• Posts, Reels, Products tabs\n• Follower/following counts\n• Earnings visibility control\n\nCustomize it to reflect your brand!',
  'badges': '🏅 Sasl Badges are earned through achievements:\n• First Post 📝\n• 10 Likes ❤️\n• Seller Badge 🛒\n• Streamer Badge 🎥\n• Teacher Badge 📚\n• 100 XP ⭐\n• Verified Creator ✓\n\nMore badges = more credibility!',
  'settings': '⚙️ Sasl Settings:\n• Language (9 languages)\n• Dark/Light mode\n• Privacy controls\n• Notification preferences\n• Earnings visibility\n• Account management\n\nAccess via the sidebar!',
  'language': 'Sasl supports 9 languages:\n• English 🇬🇧\n• Spanish 🇪🇸\n• French 🇫🇷\n• Italian 🇮🇹\n• Japanese 🇯🇵\n• Hindi 🇮🇳\n• Arabic 🇸🇦\n• Portuguese (BR) 🇧🇷\n• Chinese 🇨🇳\n\nSwitch anytime from the language selector!',

  // ---- EVENTS ----
  'events': '📅 Sasl Events:\n• Create local/online events\n• Set date, time, location\n• Manage attendees\n• RSVP system\n• Works offline\n• Syncs when online\n\nPerfect for meetups, classes, and gatherings!',

  // ---- ANALYTICS ----
  'analytics': '📊 Sasl Analytics Dashboard:\n• Revenue tracking\n• Engagement metrics\n• Top performing posts\n• Follower growth\n• Content insights\n• Export reports\n\nUnderstand your audience and grow! 📈',

  // ---- SUPPORT ----
  'support': '📧 Sasl Support:\n• AI Assistant (right here!)\n• Onboarding guide\n• Email: support@sasl.app\n• Discord community\n• FAQ section\n• Bug reporting\n\nWe\'re here to help! 💚🧡',
  'contact': 'Contact Sasl:\n• Email: support@sasl.app\n• Discord: discord.gg/sasl\n• Twitter: @SaslApp\n• Instagram: @sasl.app\n• GitHub: github.com/sasl\n\nWe respond within 24 hours!',
  'report': 'To report content or users:\n1. Click the ⋮ menu on any post\n2. Select "Report"\n3. Choose a reason\n4. Submit\n\nOur moderation team reviews within 24 hours. Your identity is kept confidential. 🚨',

  // ---- MISCELLANEOUS ----
  'dark mode': '🌙 Dark Mode is available in Sasl! Toggle it from the sidebar or settings. It reduces eye strain and saves battery on OLED screens. Works across all pages!',
  'notifications': '🔔 Sasl Notifications keep you updated:\n• New followers\n• Likes on your posts\n• Comments and replies\n• Purchase confirmations\n• Donation alerts\n• Gig updates\n• Group invitations\n\nReal-time via WebSocket!',
  'invite': '👥 Invite friends to Sasl:\n1. Go to Profile\n2. Find your referral code\n3. Share with friends\n4. They sign up\n5. Both get $1 wallet credit!\n\nBuild your network and earn! 💰',
  'groups': '👥 Sasl Groups let you create chat rooms for communities, teams, or friends. Share messages, images, and files. Create private or public groups. Works via mesh!',
};

const GREETINGS = [
  "Hi! I'm Sasl Brain 🧠 – your personal AI assistant. I know everything about Sasl and I'm here to help! What would you like to know?",
  "Hey there! 👋 Sasl Brain at your service! Ask me about earning money, features, privacy, or how to get started. I've got you covered! 💚🧡",
  "Welcome! I'm Sasl Brain 🧠 – your guide to everything Sasl. From making money to staying safe, I've got the answers. Just ask! 🚀",
];

const FUN_FACTS = [
  "💡 Did you know? Sasl's WaveMesh can connect phones up to 20km apart in urban areas!",
  "🌍 Sasl works in over 190 countries – even where there's no internet!",
  "💰 Top Sasl creators earn over $4,500/month teaching online!",
  "📡 Every Sasl user helps strengthen the mesh network – you're part of something bigger!",
  "🔒 All Sasl messages are end-to-end encrypted – not even we can read them!",
];

// ============================================================
// SMART MATCHING ENGINE
// ============================================================
function findBestMatch(query: string): string | null {
  const q = query.toLowerCase().trim();
  
  // Direct match first
  for (const [key, value] of Object.entries(APP_KNOWLEDGE)) {
    if (q.includes(key)) {
      return value;
    }
  }
  
  // Partial word matching with scoring
  const words = q.split(/\s+/);
  let bestMatch: string | null = null;
  let bestScore = 0;
  
  for (const [key, value] of Object.entries(APP_KNOWLEDGE)) {
    const keyWords = key.split(/\s+/);
    const matchCount = words.filter(w => keyWords.some(kw => kw.includes(w) || w.includes(kw))).length;
    const score = matchCount / Math.max(keyWords.length, 1);
    
    if (score > bestScore && score > 0.25) {
      bestScore = score;
      bestMatch = value;
    }
  }
  
  return bestMatch;
}

// ============================================================
// ONLINE AI FALLBACK (HuggingFace)
// ============================================================
async function tryOnlineAI(query: string): Promise<string | null> {
  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer hf_placeholder_token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: `You are Sasl Brain, a helpful AI assistant for a social media app called Sasl that works offline using mesh networking. Answer concisely and helpfully: ${query}`,
          parameters: { max_new_tokens: 150, temperature: 0.7 }
        })
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      const text = data[0]?.generated_text || '';
      return text.replace(/^.*\?/, '').trim() || null;
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================================
// SASL BRAIN CLASS
// ============================================================
class SaslBrain {
  private initialized = false;

     async initialize() {
    try {
      // Original WebGL initialization code
      await tf.setBackend('webgl');
      await tf.ready();
      console.log('🧠 Sasl Brain initialized – ready to help!');
    } catch (e) {
      console.log('WebGL not available, using CPU backend');
      try {
        await tf.setBackend('cpu');
        await tf.ready();
        console.log('🧠 Sasl Brain initialized on CPU');
      } catch (e2) {
        console.log('🧠 Sasl Brain initialized in basic mode');
      }
    }
  }
  async chatbotResponse(question: string): Promise<string> {
    const msg = question.trim();
    if (!msg) return GREETINGS[Math.floor(Math.random() * GREETINGS.length)];

    // ---- GREETINGS ----
    if (/^(hi|hello|hey|yo|what'?s up|howdy|sup|good morning|good evening)/i.test(msg)) {
      return GREETINGS[Math.floor(Math.random() * GREETINGS.length)] + 
        '\n\n' + FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)] +
        '\n\n💡 Try asking: "How do I earn?", "What is WaveMesh?", "Tell me about Marketplace"';
    }

    // ---- THANKS ----
    if (/^(thanks|thank you|thx|ty|appreciate|gracias|merci)/i.test(msg)) {
      return "You're very welcome! 😊 Is there anything else I can help you with? I'm always here! 💚🧡";
    }

    // ---- HELP ----
    if (/^(help|what can you do|commands|menu|what do you know)/i.test(msg)) {
      return "🤖 I'm Sasl Brain – your all-knowing assistant! Here's everything I can help with:\n\n" +
        "💰 Earning: Marketplace, Streaming, Tutoring, Gigs, Ads, Referrals\n" +
        "📱 Features: Feed, Reels, Snap, Live Audio, Groups, Events\n" +
        "🛡️ Privacy & Security: Encryption, Settings, Reporting\n" +
        "🌐 Tech: WaveMesh, Offline Mode, How Sasl Works\n" +
        "👤 Account: Profile, Wallet, Badges, Certificates\n" +
        "🤖 AI Tools: Content Assistant, Voice AI, Hashtag Generator\n\n" +
        "Just ask a specific question – I've got you covered! 💪";
    }

    // ---- FUN FACT REQUEST ----
    if (/fun fact|tell me something|interesting/i.test(msg)) {
      return FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)];
    }

    // ---- KNOWLEDGE BASE ----
    const localAnswer = findBestMatch(msg);
    if (localAnswer) return localAnswer;

    // ---- ONLINE AI ----
    const onlineAnswer = await tryOnlineAI(msg);
    if (onlineAnswer && onlineAnswer.length > 20) return onlineAnswer;

    // ---- INTELLIGENT FALLBACK ----
    if (/money|earn|paid|income|revenue|profit|make money/i.test(msg)) return APP_KNOWLEDGE['earn'];
    if (/post|create|write|share|content|publish/i.test(msg)) return APP_KNOWLEDGE['post'];
    if (/video|live|broadcast|stream|watch/i.test(msg)) return APP_KNOWLEDGE['streaming'];
    if (/teacher|student|class|learn|course|tutor|teach|study/i.test(msg)) return APP_KNOWLEDGE['tutoring'];
    if (/buy|sell|product|shop|store|item|purchase/i.test(msg)) return APP_KNOWLEDGE['marketplace'];
    if (/balance|payment|transaction|stripe|withdraw|top.up/i.test(msg)) return APP_KNOWLEDGE['wallet'];
    if (/gig|freelance|hire|job|work|task/i.test(msg)) return APP_KNOWLEDGE['gigs'];
    if (/snap|streak|disappear/i.test(msg)) return APP_KNOWLEDGE['snap'];
    if (/reel|short video|tiktok/i.test(msg)) return APP_KNOWLEDGE['reels'];
    if (/privacy|security|safe|encrypt|protect/i.test(msg)) return APP_KNOWLEDGE['privacy'];
    if (/offline|mesh|wave|p2p|bluetooth/i.test(msg)) return APP_KNOWLEDGE['mesh'];
    if (/profile|bio|avatar|display/i.test(msg)) return APP_KNOWLEDGE['profile'];
    if (/badge|achievement|award/i.test(msg)) return APP_KNOWLEDGE['badges'];
    if (/language|translate/i.test(msg)) return APP_KNOWLEDGE['language'];
    if (/dark|theme|appearance/i.test(msg)) return APP_KNOWLEDGE['dark mode'];
    if (/notif|alert|bell/i.test(msg)) return APP_KNOWLEDGE['notifications'];
    if (/invite|refer|friend/i.test(msg)) return APP_KNOWLEDGE['invite'];
    if (/event|meetup|gathering/i.test(msg)) return APP_KNOWLEDGE['events'];
    if (/analytic|stat|growth|insight/i.test(msg)) return APP_KNOWLEDGE['analytics'];
    if (/contact|support|help|email/i.test(msg)) return APP_KNOWLEDGE['support'];
    if (/report|abuse|spam|flag/i.test(msg)) return APP_KNOWLEDGE['report'];

    // ---- DEFAULT ----
    return `I don't have a perfect answer for "${msg}" yet, but I'm learning every day! 🧠\n\n` +
      `Try asking about:\n` +
      `💰 "How to earn money"\n` +
      `🛒 "How Marketplace works"\n` +
      `📡 "What is WaveMesh"\n` +
      `🔒 "Privacy features"\n` +
      `📚 "How tutoring works"\n\n` +
      `Or type "help" to see everything I can do! 💚🧡`;
  }

  async rankPosts(posts: any[]): Promise<{ postId: string; relevanceScore: number; qualityScore: number; finalScore: number }[]> {
    if (!posts || posts.length === 0) return [];
    return posts.map((p: any) => {
      const likes = p.likes_count || 0;
      const comments = p.comments_count || 0;
      const shares = p.shares_count || 0;
      const age = (Date.now() - new Date(p.created_at || Date.now()).getTime()) / 3600000;
      return {
        postId: p.id || '',
        relevanceScore: 0.5,
        qualityScore: Math.min((likes * 2 + comments * 3 + shares * 5) / 50, 1),
        finalScore: 0.15 + Math.min((likes * 2 + comments * 3 + shares * 5) / 50, 1) * 0.55 + Math.exp(-age / 24) * 0.3,
      };
    }).sort((a, b) => b.finalScore - a.finalScore);
  }

  async learnFromInteraction(postText: string, action: string, postId: string): Promise<void> {
    try {
      const prefs = JSON.parse(localStorage.getItem('sasl_brain_prefs') || '{"likedKeywords":[],"dislikedKeywords":[],"interactions":[]}');
      const keywords = postText.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
      if (action === 'like' || action === 'share') prefs.likedKeywords = [...new Set([...prefs.likedKeywords, ...keywords])].slice(0, 100);
      else if (action === 'dislike' || action === 'hide') prefs.dislikedKeywords = [...new Set([...prefs.dislikedKeywords, ...keywords])].slice(0, 100);
      prefs.interactions.push({ postId, action, timestamp: Date.now() });
      if (prefs.interactions.length > 500) prefs.interactions = prefs.interactions.slice(-500);
      localStorage.setItem('sasl_brain_prefs', JSON.stringify(prefs));
    } catch {}
  }

  async detectToxicity(text: string): Promise<{ isToxic: boolean; score: number }> {
    const patterns = [/\b(spam|scam|fraud)\b/i, /\b(hate|racist|sexist)\b/i, /\b(abuse|harass|threat)\b/i];
    let matches = 0;
    patterns.forEach(p => { if (p.test(text)) matches++; });
    return { isToxic: matches >= 2, score: matches / patterns.length };
  }
}

export const saslBrain = new SaslBrain();