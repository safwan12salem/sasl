/**
 * 🧠 Sasl Brain — Legendary AI Engine
 * 
 * Powered by OpenRouter GPT-4o (free tier: 20 queries/day)
 * Premium: Unlimited GPT-4o + advanced features
 * 
 * Architecture:
 * - Tier 1: OpenRouter GPT-4o (primary, real AI)
 * - Tier 2: Wikipedia API (free knowledge, no key)
 * - Tier 3: Smart fallback with helpful suggestions
 */

import api from './api';

// ============================================================
// CONFIGURATION
// ============================================================
const ENGINE_STORAGE_KEY = 'sasl_brain_usage';
export const FREE_LIMIT = 20;
export const PREMIUM_PRICE = '$4.99/month';

// OpenRouter configuration
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_KEY = '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';
const OPENROUTER_MODEL = 'openai/gpt-4o';
const SITE_URL = 'https://sasl.vercel.app';
const SITE_NAME = 'Sasl';

// ============================================================
// USAGE TRACKING
// ============================================================
interface UsageData {
  date: string;
  count: number;
}

export function getUsage(): UsageData {
  const today = new Date().toDateString();
  try {
    const data = JSON.parse(localStorage.getItem(ENGINE_STORAGE_KEY) || '{}');
    if (data.date !== today) return { date: today, count: 0 };
    return data;
  } catch {
    return { date: today, count: 0 };
  }
}

function incrementUsage(): void {
  const usage = getUsage();
  usage.count++;
  localStorage.setItem(ENGINE_STORAGE_KEY, JSON.stringify(usage));
}

export function isPremiumUser(): boolean {
  try {
    const token = localStorage.getItem('sasl_token');
    if (!token) return false;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.is_premium === true;
  } catch {
    return false;
  }
}

// ============================================================
// TIER 1: OpenRouter GPT-4o — Real AI Responses
// ============================================================
async function askGPT4o(question: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'HTTP-Referer': SITE_URL,
        'X-Title': SITE_NAME,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are Sasl Brain, the legendary AI assistant for Sasl — the world's first offline social network. 

Your personality:
- Brilliant, warm, and genuinely helpful
- Expert on ALL topics: science, history, technology, business, arts, sports, health, education, programming, and more
- Give detailed, structured, encyclopedia-grade answers
- Use markdown formatting: **bold** for emphasis, bullet points for lists, sections with ## headers
- Be conversational but thorough — like a brilliant professor who's also your friend
- When asked about Sasl, highlight its unique features (offline WaveMesh, marketplace with 95% earnings, tutoring, streaming, AI assistant)
- End responses with a helpful follow-up question or suggestion
- Never mention you're an AI unless directly asked
- Maximum response length: 400 words (comprehensive but focused)`
          },
          {
            role: 'user',
            content: question
          }
        ],
        max_tokens: 600,
        temperature: 0.7,
        top_p: 0.9,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error('OpenRouter error:', response.status);
      return null;
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content;

    if (answer && answer.length > 30) {
      return answer.trim();
    }

    return null;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.log('OpenRouter request timed out');
    }
    return null;
  }
}

// ============================================================
// TIER 2: Wikipedia API — Free Knowledge Base
// ============================================================
async function searchWikipedia(query: string): Promise<string | null> {
  try {
    // First try exact title match
    const titleQuery = query
      .replace(/^(who is|what is|who are|what are|tell me about|explain|define) /i, '')
      .trim()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join('_');

    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titleQuery)}`;
    const response = await fetch(summaryUrl);

    if (response.ok) {
      const data = await response.json();
      if (data.extract && data.extract.length > 80) {
        let result = `📚 **${data.title}**\n\n${data.extract}`;
        if (data.content_urls?.desktop?.page) {
          result += `\n\n🔗 [Read full article on Wikipedia](${data.content_urls.desktop.page})`;
        }
        return result;
      }
    }

    // Fallback: search Wikipedia
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const results = searchData.query?.search || [];

      if (results.length > 0) {
        const bestTitle = results[0].title.replace(/ /g, '_');
        const bestSummaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(bestTitle)}`;
        const bestRes = await fetch(bestSummaryUrl);

        if (bestRes.ok) {
          const bestData = await bestRes.json();
          if (bestData.extract && bestData.extract.length > 50) {
            let result = `📚 **${bestData.title}** (from Wikipedia)\n\n${bestData.extract}`;
            if (bestData.content_urls?.desktop?.page) {
              result += `\n\n🔗 [Read full article](${bestData.content_urls.desktop.page})`;
            }
            return result;
          }
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

// ============================================================
// TIER 3: Premium Backend AI
// ============================================================
async function tryPremiumBackend(question: string): Promise<string | null> {
  try {
    const response = await api.post('/api/ai/ask/', { question });
    if (response.data?.answer && response.data.answer.length > 30) {
      return response.data.answer;
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================================
// TIER 4: Smart Fallback
// ============================================================
function smartFallback(query: string): string {
  const q = query.toLowerCase();

  // Greetings
  if (/^(hi|hello|hey|yo|sup|good morning|good evening|howdy)$/i.test(q)) {
    return "👋 **Hello!** I'm Sasl Brain, your legendary AI assistant. I can answer any question — from science and history to business and technology. What would you like to explore today?";
  }

  // Thanks
  if (/^(thanks|thank you|thx|ty|appreciate)/i.test(q)) {
    return "You're very welcome! 😊 I'm always here to help. Feel free to ask me anything else!";
  }

  // Who is / What is — couldn't find
  if (/^(who is|what is|who are|what are) /i.test(q)) {
    const topic = q.replace(/^(who is|what is|who are|what are) /i, '').trim();
    return `🔍 I searched for information about **${topic}** but couldn't find a reliable source right now.\n\n` +
      `**Suggestions:**\n` +
      `• Try rephrasing: "${topic} biography" or "${topic} explained"\n` +
      `• Add more context: "${topic} achievements" or "${topic} history"\n` +
      `• Check spelling — even small errors can affect results\n\n` +
      `🧠 **Premium users** get priority access to GPT-4o, which can answer virtually any question with detailed, accurate responses.`;
  }

  // How to
  if (/^how (to|do|can|should) /i.test(q)) {
    const topic = q.replace(/^how (to|do|can|should) /i, '').trim();
    return `📖 **How to ${topic}**\n\n` +
      `**Step-by-Step Approach:**\n\n` +
      `1. **Research:** Learn the fundamentals of "${topic}" from reliable sources\n` +
      `2. **Plan:** Break down your goal into manageable steps\n` +
      `3. **Start Small:** Begin with the basics and build up gradually\n` +
      `4. **Practice:** Consistent effort beats occasional intensity\n` +
      `5. **Seek Feedback:** Learn from experts and communities\n` +
      `6. **Iterate:** Improve based on what works and what doesn't\n\n` +
      `💡 For a more detailed guide, try asking: "${topic} step by step guide for beginners"`;
  }

  // Why
  if (/^why /i.test(q)) {
    const topic = q.replace(/^why /i, '').trim();
    return `🤔 **Why ${topic}?**\n\n` +
      `**Key Reasons:**\n\n` +
      `1. **Importance:** ${topic} matters because it impacts [relevant area]\n` +
      `2. **Benefits:** Understanding this leads to better outcomes\n` +
      `3. **Current Relevance:** This is increasingly significant in 2026\n` +
      `4. **Future Impact:** Will continue to shape developments\n\n` +
      `💡 For a comprehensive analysis, try: "importance of ${topic}" or "${topic} explained in detail"`;
  }

  // Default
  return `🤔 I don't have a complete answer for **"${query}"** right now.\n\n` +
    `**What you can do:**\n` +
    `• Rephrase your question with more detail\n` +
    `• Try a more specific version\n` +
    `• Ask about a related topic\n\n` +
    `🧠 **Premium users** (${PREMIUM_PRICE}) get unlimited GPT-4o access — the most advanced AI that answers virtually any question with expert-level detail.\n\n` +
    `💎 Upgrade in **Wallet → Subscribe** to unlock the full power of Sasl Brain.`;
}

// ============================================================
// MAIN ORCHESTRATOR
// ============================================================
export async function askSaslEngine(question: string): Promise<string> {
  const msg = question.trim();
  if (!msg) {
    return "🧠 **I'm Sasl Brain!** Ask me anything — science, history, technology, business, sports, arts, or any topic you're curious about. I'm here to help!";
  }

  const usage = getUsage();
  const premium = isPremiumUser();

  // Free tier limit check (skip for simple greetings)
  if (!premium && usage.count >= FREE_LIMIT && msg.length > 8 && !/^(hi|hello|hey|thanks|help|what can you do|who are you)$/i.test(msg)) {
    return `🔒 **Free Limit Reached** (${usage.count}/${FREE_LIMIT} queries today)\n\n` +
      `You've used all your free queries for today. Upgrade to **Sasl Premium** (${PREMIUM_PRICE}) to unlock:\n\n` +
      `🧠 **Unlimited GPT-4o access** — the world's most advanced AI\n` +
      `📚 **Encyclopedia-grade answers** on any topic imaginable\n` +
      `⚡ **Priority responses** — no waiting, no limits\n` +
      `🎯 **Personalized insights** tailored to your interests\n\n` +
      `**Go to Wallet → Subscribe to upgrade now!** 💎`;
  }

  // Count usage for substantive questions
  if (!premium && msg.length > 8 && !/^(hi|hello|hey|thanks|help|what can you do|who are you)$/i.test(msg)) {
    incrementUsage();
  }

  // ---- TIER 1: OpenRouter GPT-4o (Primary) ----
  const gptAnswer = await askGPT4o(msg);
  if (gptAnswer) return gptAnswer;

  // ---- TIER 2: Premium Backend (if subscribed) ----
  if (premium) {
    const backendAnswer = await tryPremiumBackend(msg);
    if (backendAnswer) return backendAnswer;
  }

  // ---- TIER 3: Wikipedia (free knowledge) ----
  const wikiAnswer = await searchWikipedia(msg);
  if (wikiAnswer) return wikiAnswer;

  // ---- TIER 4: Smart Fallback ----
  return smartFallback(msg);
}

// ============================================================
// PREMIUM FEATURES
// ============================================================
export async function analyzeContent(text: string): Promise<string | null> {
  if (!isPremiumUser()) return null;

  return askGPT4o(
    `Analyze this content and provide insights:\n\n"${text}"\n\nInclude: tone, readability, engagement potential, suggested improvements, and estimated reach.`
  );
}

export async function generateSEOKeys(topic: string): Promise<string | null> {
  if (!isPremiumUser()) return null;

  return askGPT4o(
    `Generate 10 SEO keywords and 5 hashtag suggestions for content about: "${topic}". Include primary, secondary, and trending keywords.`
  );
}

export async function growthStrategy(niche: string): Promise<string | null> {
  if (!isPremiumUser()) return null;

  return askGPT4o(
    `Create a 30-day growth strategy for a ${niche} content creator. Include daily posting schedule, content pillars, engagement tactics, and follower growth projections.`
  );
}