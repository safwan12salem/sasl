/**
 * Sasl Brain — On-Device Encyclopedia
 * Provides instant answers for known topics.
 * Returns null for unknown topics so GPT-4o takes over.
 */
import * as tf from '@tensorflow/tfjs';

// ============================================================
// ENCYCLOPEDIA KNOWLEDGE BASE
// ============================================================
const ENCYCLOPEDIA: Record<string, string> = {
  'quantum computing': `🔬 **Quantum Computing**\n\nA revolutionary computing paradigm using quantum bits (qubits).\n\n**Key Concepts:**\n• Superposition: Qubits can be 0 and 1 simultaneously\n• Entanglement: Qubits correlated across any distance\n• Quantum Gates: Operations manipulating qubits\n\n**Applications:** Drug discovery, cryptography, optimization, climate modeling.\n\n**2026 Status:** IBM 1000+ qubit processors, Google quantum supremacy, error correction breakthroughs.`,
  
  'crispr': `🧬 **CRISPR Gene Editing**\n\nRevolutionary gene-editing technology using Cas9 protein.\n\n**How:** Guide RNA locates target DNA → Cas9 cuts it → Cell repairs with modifications.\n\n**Applications:** Curing genetic diseases, disease-resistant crops, cancer immunotherapy.\n\n**2026:** First CRISPR therapy (Casgevy) FDA-approved for sickle cell disease.`,
  
  'blockchain': `⛓️ **Blockchain Technology**\n\nDecentralized distributed digital ledger.\n\n**How:** Transactions grouped into blocks → cryptographically linked → validated by network consensus → immutable record.\n\n**Beyond Crypto:** Supply chain, digital identity, voting, healthcare, smart contracts.\n\n**Sasl:** Uses blockchain-like principles for escrow system!`,
  
  'artificial intelligence': `🤖 **Artificial Intelligence**\n\nSimulation of human intelligence by machines.\n\n**Branches:** Machine Learning, Deep Learning, NLP, Computer Vision, Reinforcement Learning.\n\n**2026 State:** GPT-5 level models mainstream, AI codes 40% of new software, self-driving in 50+ cities, AI-designed drugs in trials.`,
  
  'mental health': `🏥 **Mental Health Best Practices**\n\n• Daily mindfulness (10-15 min)\n• Regular exercise (30 min, 3-5x/week)\n• Consistent sleep (7-9 hours)\n• Balanced nutrition\n• Limit social media\n\n**Stress:** Deep breathing (4-7-8 technique), progressive relaxation, journaling, nature exposure.\n\n**Crisis:** Call 988 (US), text HOME to 741741. Seeking help is strength. 💚`,
  
  'investing': `📈 **Investing for Beginners**\n\n**Why:** Beat inflation, build wealth, compound interest.\n\n**Vehicles:**\n• Index Funds/ETFs (recommended): Low fees, diversified, ~7-10% annually\n• Stocks: Higher risk/reward\n• Bonds: Lower risk, capital preservation\n• Real Estate: Via REITs\n\n**Principles:** Start early, diversify, dollar-cost average, stay the course, low fees.\n\n⚠️ Educational only — not financial advice.`,
  
  'sasl': `🌊 **Sasl — World's First Offline Social Network**\n\n**Innovation:** Phones connect directly via Bluetooth + Wi-Fi Direct. Messages hop device-to-device. No internet needed.\n\n**15+ Features:** Marketplace (95% yours), Streaming, Tutoring (90% to you), Gig Central, Reels, Snap, Live Audio, Sasl Brain AI.\n\n**Earning:** Top creators $2,500-$4,500/month. Active sellers $300-$1,800/month.\n\n**Unique:** Works in 190+ countries, end-to-end encrypted, you own your data.`,
};

// ============================================================
// TOPIC DETECTION
// ============================================================
function detectTopic(query: string): string | null {
  const q = query.toLowerCase();
  const topicMap: [RegExp, string][] = [
    [/quantum|qubit|superposition/i, 'quantum computing'],
    [/crispr|gene edit|dna edit|cas9/i, 'crispr'],
    [/blockchain|bitcoin|crypto|ethereum|web3/i, 'blockchain'],
    [/artificial intelligence|ai |machine learn|deep learn/i, 'artificial intelligence'],
    [/mental health|anxiety|depression|stress|therapy/i, 'mental health'],
    [/invest|stock|bond|etf|index fund|portfolio/i, 'investing'],
    [/sasl|wavemesh|mesh network|offline social/i, 'sasl'],
  ];
  for (const [pattern, topic] of topicMap) {
    if (pattern.test(q)) return topic;
  }
  return null;
}

function encyclopediaResponse(query: string): string | null {
  const topic = detectTopic(query);
  if (topic && ENCYCLOPEDIA[topic]) return ENCYCLOPEDIA[topic];
  
  const q = query.toLowerCase();
  for (const key of Object.keys(ENCYCLOPEDIA)) {
    const words = key.split(/\s+/);
    let score = 0;
    for (const w of words) {
      if (q.includes(w)) score++;
    }
    if (score >= 1) return ENCYCLOPEDIA[key];
  }
  return null;
}

// ============================================================
// SASL BRAIN CLASS
// ============================================================
class SaslBrain {
  async ask(query: string): Promise<string | null> {
    const q = query.trim();
    if (!q) {
      return "🧠 **Hello! I'm Sasl Brain.** Ask me anything — science, technology, business, health, education, finance, programming, and more!";
    }
    
    const encAnswer = encyclopediaResponse(q);
    if (encAnswer) return encAnswer;
    
    // Return null so GPT-4o takes over
    return null;
  }
  
  async rankPosts(posts: any[]): Promise<{ postId: string; score: number }[]> {
    return posts.map((p: any) => ({
      postId: p.id,
      score: (p.likes_count || 0) * 2 + (p.comments_count || 0) * 3
    })).sort((a, b) => b.score - a.score);
  }
}

export const saslBrain = new SaslBrain();