/**
 * Sasl Legendary AI Engine — Orchestrator
 * 
 * Routes questions to the best available AI tier:
 * 1. On-device SaslBrain (offline, instant, free)
 * 2. Free online API (HuggingFace, when online)
 * 3. Premium backend GPT (for subscribers, unlimited)
 * 
 * Free: 20 queries/day
 * Premium: Unlimited + GPT-level responses
 */

import { saslBrain } from './saslBrain';
import api from './api';

const ENGINE_STORAGE_KEY = 'sasl_engine_usage';
export const FREE_LIMIT = 20;
export const PREMIUM_PRICE = '$4.99/month';

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

function incrementUsage(): UsageData {
  const usage = getUsage();
  usage.count++;
  localStorage.setItem(ENGINE_STORAGE_KEY, JSON.stringify(usage));
  return usage;
}

export function isPremiumUser(): boolean {
  try {
    const token = localStorage.getItem('sasl_token');
    if (!token) return false;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.is_premium === true;
  } catch { return false; }
}

/**
 * Tier 2: Free online AI (HuggingFace)
 */
async function tryOnlineAI(query: string): Promise<string | null> {
  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/google/flan-t5-large',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer YOUR_HUGGINGFACE_TOKEN',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: `Answer this question with detailed, helpful information. Be comprehensive and educational:\n\nQ: ${query}\nA:`,
          parameters: { max_new_tokens: 250, temperature: 0.7, do_sample: true }
        })
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      const text = data[0]?.generated_text || '';
      if (text.length > 40) return text.trim();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Tier 3: Premium backend AI (GPT-level, for subscribers)
 */
async function tryPremiumAI(query: string): Promise<string | null> {
  try {
    const response = await api.post('/ai/ask/', { question: query });
    if (response.data?.answer) return response.data.answer;
    return null;
  } catch {
    return null;
  }
}

/**
 * Main orchestration function
 */
export async function askSaslEngine(question: string): Promise<string> {
  const msg = question.trim();
  if (!msg) return "Ask me anything! I'm Sasl Brain 🧠 — your legendary AI assistant.";
  
  const usage = getUsage();
  const premium = isPremiumUser();
  
  // Free tier limit check
  if (!premium && usage.count >= FREE_LIMIT && !/^(hi|hello|hey|thanks|help)$/i.test(msg)) {
    return `🔒 **Free Limit Reached** (${usage.count}/${FREE_LIMIT} queries today)\n\n` +
      `Upgrade to Sasl Premium (${PREMIUM_PRICE}) for:\n\n` +
      `🌐 **Unlimited AI queries** — ask as many questions as you want\n` +
      `🧠 **GPT-level responses** — powered by advanced AI models\n` +
      `📊 **In-depth analysis** — comprehensive answers on any topic\n` +
      `🎯 **Priority access** — faster responses, newest features\n\n` +
      `Go to **Wallet → Subscribe** to upgrade! 💎`;
  }
  
  // Increment usage for substantive questions
  if (!premium && msg.length > 5 && !/^(hi|hello|hey|thanks|help|what can you do)/i.test(msg)) {
    incrementUsage();
  }
  
  // Tier 3: Premium backend AI (best quality)
  if (premium) {
    const premiumAnswer = await tryPremiumAI(msg);
    if (premiumAnswer) return premiumAnswer;
  }
  
  // Tier 2: Free online AI
  const onlineAnswer = await tryOnlineAI(msg);
  if (onlineAnswer) return onlineAnswer;
  
  // Tier 1: On-device SaslBrain (always available, offline)
  const brainAnswer = await saslBrain.ask(msg);
  return brainAnswer;
}