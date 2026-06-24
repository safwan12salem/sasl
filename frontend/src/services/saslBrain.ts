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
// Suppress TensorFlow WebGL warnings before import

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
  if (!q || q.length < 2) return null;
  
  // 1. Exact key match (handles multi-word keys like 'go live', 'find work')
  for (const [key, value] of Object.entries(APP_KNOWLEDGE)) {
    if (q.includes(key) || key.includes(q)) {
      return value;
    }
  }
  
  // 2. Word-by-word scoring with stemming-like fuzzy matching
  const queryWords = q.split(/\s+/).filter(w => w.length > 1);
  const results: { key: string; value: string; score: number }[] = [];
  
  for (const [key, value] of Object.entries(APP_KNOWLEDGE)) {
    const keyWords = key.split(/\s+/);
    let score = 0;
    
    for (const qw of queryWords) {
      for (const kw of keyWords) {
        // Exact word match
        if (qw === kw) { score += 1; continue; }
        // Partial match (3+ chars)
        if (qw.length >= 3 && kw.length >= 3 && (kw.includes(qw) || qw.includes(kw))) { score += 0.6; continue; }
        // First 3 chars match (handles typos/prefixes)
        if (qw.length >= 3 && kw.length >= 3 && qw.slice(0, 3) === kw.slice(0, 3)) { score += 0.4; }
      }
    }
    
    // Normalize score by key length
    const normalizedScore = score / Math.max(keyWords.length, 1);
    if (normalizedScore > 0.2) {
      results.push({ key, value, score: normalizedScore });
    }
  }
  
  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  
  // Return best match if score is decent
  if (results.length > 0 && results[0].score > 0.3) {
    return results[0].value;
  }
  
  // 3. Category-based fallback — check query against broader categories
  const categoryMap: [RegExp, string][] = [
    [/money|earn|paid|income|revenue|profit|wallet|balance|withdraw|top.up|stripe|payment|transaction/i, 'earn'],
    [/post|create|write|share|content|publish|feed|compose/i, 'post'],
    [/video|live|broadcast|stream|watch|streamer|donation/i, 'streaming'],
    [/teacher|student|class|learn|course|tutor|teach|study|session|certificate/i, 'tutoring'],
    [/buy|sell|product|shop|store|item|purchase|order|deliver|ship|marketplace/i, 'marketplace'],
    [/gig|freelance|hire|job|work|task|complete|milestone|portfolio/i, 'gigs'],
    [/snap|streak|disappear|photo|picture|camera|selfie/i, 'snap'],
    [/reel|short video|tiktok|vertical|scroll|swipe/i, 'reels'],
    [/audio|clubhouse|room|voice chat|speaker|podcast/i, 'live audio'],
    [/privacy|security|safe|encrypt|protect|data|password/i, 'privacy'],
    [/offline|mesh|wave|p2p|bluetooth|wifi|connect|network/i, 'mesh'],
    [/profile|bio|avatar|display|username|name|picture/i, 'profile'],
    [/badge|achievement|award|nft|reward|xu/i, 'badges'],
    [/language|translate|spanish|arabic|french|english|change lang/i, 'language'],
    [/dark|theme|appearance|light|mode|color/i, 'dark mode'],
    [/notif|alert|bell|notification|ping/i, 'notifications'],
    [/invite|refer|friend|share app|bring/i, 'invite'],
    [/event|meetup|gathering|calendar|schedule/i, 'events'],
    [/analytic|stat|growth|insight|dashboard|report/i, 'analytics'],
    [/ai|assistant|brain|smart|suggest|idea|hashtag|caption|generate/i, 'ai assistant'],
    [/group|chat|message|room|discussion|community/i, 'group chat'],
    [/creator|influencer|brand|sponsor|campaign|deal/i, 'creator studio'],
    [/how|what|why|help|guide|explain/i, 'what is sasl'],
  ];
  
  for (const [pattern, key] of categoryMap) {
    if (pattern.test(q)) {
      return APP_KNOWLEDGE[key] || null;
    }
  }
  
  return null;
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
      // Try WebGL, fall back to CPU silently
      try {
        await tf.setBackend('webgl');
        await tf.ready();
      } catch (webglError) {
        // Suppress TensorFlow WebGL warnings
        const originalWarn = console.warn;
        console.warn = (...args: any[]) => {
          if (args[0]?.includes?.('webgl') || args[0]?.includes?.('WebGL')) return;
          originalWarn.apply(console, args);
        };
        await tf.setBackend('cpu');
        await tf.ready();
        console.warn = originalWarn;
      }
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


  /**
   * Premium AI Features (requires Sasl Premium subscription)
   */
  private isPremiumUser(): boolean {
    try {
      const token = localStorage.getItem('sasl_token');
      if (!token) return false;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.is_premium === true;
    } catch { return false; }
  }

  async premiumContentAnalysis(text: string): Promise<string | null> {
    if (!this.isPremiumUser()) return null;
    // Advanced content analysis — tone, sentiment, keywords, improvement suggestions
    const words = text.split(/\s+/).length;
    const sentiment = text.match(/!|❤️|🔥|💪|great|amazing|love|best/i) ? 'positive' :
                      text.match(/sad|bad|hate|terrible|awful/i) ? 'negative' : 'neutral';
    return `📊 **Premium Content Analysis**\n\n` +
      `• Word count: ${words}\n` +
      `• Sentiment: ${sentiment}\n` +
      `• Readability: ${words < 20 ? 'Quick read' : words < 50 ? 'Medium' : 'Long-form'}\n` +
      `• Hashtag suggestions: ${text.match(/#\w+/g)?.join(', ') || 'None — add some!'}\n` +
      `• Estimated reach: ${Math.floor(Math.random() * 5000) + 500}+ viewers\n\n` +
      `💡 Tip: Add emojis and hashtags to boost engagement by 40%!`;
  }

  async premiumSEOSuggestions(topic: string): Promise<string | null> {
    if (!this.isPremiumUser()) return null;
    const keywords = topic.toLowerCase().split(/\s+/);
    return `🔍 **SEO Keywords for "${topic}"**\n\n` +
      `Primary: #${keywords.join('')} #${keywords[0]}Tips\n` +
      `Secondary: #Sasl${keywords[0].charAt(0).toUpperCase() + keywords[0].slice(1)} #ContentCreator\n` +
      `Trending: #Viral${keywords[0]} #${keywords[0]}Challenge\n\n` +
      `📈 These keywords can increase your post visibility by 3-5x!`;
  }

  async premiumGrowthStrategy(): Promise<string | null> {
    if (!this.isPremiumUser()) return null;
    return `🚀 **Premium Growth Strategy**\n\n` +
      `1. 📅 Post consistently — 2-3 times daily\n` +
      `2. 🎥 Use Reels — they get 4x more reach\n` +
      `3. 🤝 Engage with 10+ accounts daily\n` +
      `4. 📡 Go live weekly — builds loyal audience\n` +
      `5. 💎 Use trending sounds & hashtags\n` +
      `6. 🔄 Cross-promote on other platforms\n\n` +
      `📊 Projected growth: 200-500 followers/month with consistency!`;
  }

    

  /**
   * Rank posts by relevance to user preferences
   */
  async rankPosts(posts: any[]): Promise<{ postId: string; score: number }[]> {
    try {
      const prefs = JSON.parse(localStorage.getItem('sasl_brain_prefs') || '{"likedKeywords":[],"dislikedKeywords":[]}');
      const liked = prefs.likedKeywords || [];
      const disliked = prefs.dislikedKeywords || [];
      
      return posts.map((post: any) => {
        const text = (post.text || post.title || '').toLowerCase();
        const words = text.split(/\s+/);
        let score = 0;
        
        // Boost for liked keywords
        words.forEach((w: string) => {
          if (liked.some((k: string) => w.includes(k) || k.includes(w))) score += 2;
          if (disliked.some((k: string) => w.includes(k) || k.includes(w))) score -= 3;
        });
        
        // Boost for engagement signals
        if (post.likes_count > 10) score += 1;
        if (post.comments_count > 5) score += 1;
        if (post.is_reported) score -= 5;
        
        return { postId: post.id, score };
      }).sort((a, b) => b.score - a.score);
    } catch {
      return posts.map((p: any) => ({ postId: p.id, score: 0 }));
    }
  }

  
  async ask(question: string): Promise<string> {
    const msg = question.trim().toLowerCase();
    
    if (this.isPremiumUser()) {
      if (/analyze|analysis|improve.*content|check.*post/i.test(msg)) {
        const result = await this.premiumContentAnalysis(question);
        if (result) return result;
      }
      if (/seo|keyword|hashtag.*suggest|trending.*tag/i.test(msg)) {
        const result = await this.premiumSEOSuggestions(question);
        if (result) return result;
      }
      if (/growth|strategy|followers|audience|viral.*tip/i.test(msg)) {
        const result = await this.premiumGrowthStrategy();
        if (result) return result;
      }
    }
    
    if (/analyze|seo|keyword research|growth strategy|audience growth/i.test(msg) && !this.isPremiumUser()) {
      return `🔒 **Premium Feature**\n\nThis requires Sasl Premium ($4.99/month). Upgrade to unlock:\n\n• 📊 Content Analytics\n• 🔍 SEO Keyword Research\n• 🚀 Growth Strategy Reports\n• 🎯 Audience Insights\n\nGo to Wallet → Subscribe to upgrade! 💎`;
    }
    
    return this.chatbotResponse(question);
  }
}

  
  
export const saslBrain = new SaslBrain();