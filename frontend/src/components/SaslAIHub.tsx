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
import { Translation, useTranslation } from 'react-i18next';
import { t } from '../services/translateHelper';
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





function detectLanguage(text: string): string {
  // Unicode ranges for different scripts
  const scripts: Record<string, RegExp> = {
    ar: /[\u0600-\u06FF]/,
    zh: /[\u4E00-\u9FFF]/,
    ja: /[\u3040-\u309F\u30A0-\u30FF]/,
    ko: /[\uAC00-\uD7AF\u1100-\u11FF]/,
    hi: /[\u0900-\u097F]/,
    ru: /[\u0400-\u04FF]/,
    el: /[\u0370-\u03FF]/,

  };
  
  for (const [lang, regex] of Object.entries(scripts)) {
    if (regex.test(text)) return lang;
  }
  
  // Detect via common words
  const lower = text.toLowerCase();
  if (/\b(el|la|los|las|de|en|que|es|por|para)\b/.test(lower) && 
      !/\b(the|is|are|was|were|have|has|had|will|would|can|could|should|may|might|shall|must|do|does|did|go|goes|went|come|comes|came|get|gets|got|make|makes|made|take|takes|took|give|gives|gave|know|knew|see|sees|saw|think|thought|say|says|said|tell|tells|told|ask|asks|asked|try|tries|tried|use|uses|used)\b/.test(lower))
    return 'es';
  if (/\b(le|la|les|des|de|du|un|une|est|sont|que|qui|dans|pour|sur|avec|par|pas|plus|bien|fait|faire|être|avoir)\b/.test(lower))
    return 'fr';
  if (/\b(der|die|das|und|ist|sind|war|waren|hat|haben|wird|werden|kann|können|muss|müssen|nicht|mit|auf|für|von|bei|aus|nach|vor|seit|durch|um|über|unter|zwischen|auch|noch|schon|nur|wieder|immer|nie|oft|selten|bald|gern|gut|groß|klein|alt|neu|hoch|tief|lang|kurz|weit|nah)\b/.test(lower))
    return 'de';
  if (/\b(di|che|e|il|la|un|una|sono|era|ho|ha|fatto|fare|essere|avere|per|con|da|in|su|tra|fra|di|a|da|in|con|su|per|tra|fra|non|più|meno|molto|poco|bene|male|grande|piccolo|vecchio|nuovo|alto|basso)\b/.test(lower))
    return 'it';
  if (/\b(e|o|de|do|da|em|um|uma|não|sim|mais|menos|muito|pouco|bem|mal|grande|pequeno|novo|velho|alto|baixo|para|com|por|que|se|mas|ou|como|quando|onde|porque)\b/.test(lower))
    return 'pt';
  
  return 'en'; // Default English
}

function getResponseLanguage(): string {
  try {
    return navigator.language?.split('-')[0] || 'en';
  } catch {
    return 'en';
  }
}


function generateSpanishResponse(topic: string): string[] {
  return [
    `📖 ${topic} — Análisis Completo\n\nAquí tienes información detallada sobre "${topic}".\n\n• Contexto: Este tema es relevante porque afecta a muchas personas.\n• Datos clave: La información sobre ${topic} está en constante evolución.\n• Recomendación: Mantente actualizado siguiendo fuentes confiables.\n\n¿Quieres que genere más ideas sobre este tema?`,
    `🔍 Investigación: ${topic}\n\nHe buscado información sobre "${topic}" y esto es lo que encontré:\n\n📌 Puntos importantes:\n1. ${topic} es un tema de gran interés actual\n2. Hay múltiples perspectivas para analizar\n3. La comunidad está discutiendo activamente\n\n💡 Te sugiero explorar diferentes fuentes y formar tu propia opinión.`,
  ];
}



function generateHindiResponse(topic: string): string[] {
  return [
    `📖 ${topic} — विस्तृत विश्लेषण\n\nयहाँ "${topic}" पर विस्तृत जानकारी दी गई है।\n\n• संदर्भ: यह विषय महत्वपूर्ण है क्योंकि यह कई लोगों को प्रभावित करता है।\n• मुख्य तथ्य: ${topic} के बारे में जानकारी लगातार बदल रही है।\n• सुझाव: विश्वसनीय स्रोतों का अनुसरण करके अपडेट रहें।\n\nक्या आप इस विषय पर और अधिक विचार चाहते हैं?`,
    `🔍 शोध: ${topic}\n\nमैंने "${topic}" के बारे में जानकारी खोजी और यह मिला:\n\n📌 महत्वपूर्ण बिंदु:\n1. ${topic} वर्तमान में बहुत रुचि का विषय है\n2. विश्लेषण के लिए कई दृष्टिकोण हैं\n3. समुदाय सक्रिय रूप से चर्चा कर रहा है\n\n💡 मैं सुझाव देता हूँ कि आप विभिन्न स्रोतों का पता लगाएँ और अपनी स्वयं की राय बनाएँ।`,
  ];
}

function generateItalianResponse(topic: string): string[] {
  return [
    `📖 ${topic} — Analisi Completa\n\nEcco informazioni dettagliate su "${topic}".\n\n• Contesto: Questo argomento è rilevante perché coinvolge molte persone.\n• Dati chiave: Le informazioni su ${topic} sono in continua evoluzione.\n• Raccomandazione: Resta aggiornato seguendo fonti affidabili.\n\nVuoi che generi altre idee su questo argomento?`,
    `🔍 Ricerca: ${topic}\n\nHo cercato informazioni su "${topic}" ed ecco cosa ho trovato:\n\n📌 Punti importanti:\n1. ${topic} è un argomento di grande interesse attuale\n2. Ci sono molteplici prospettive da analizzare\n3. La comunità ne discute attivamente\n\n💡 Ti suggerisco di esplorare fonti diverse e formare la tua opinione.`,
  ];
}

function generateJapaneseResponse(topic: string): string[] {
  return [
    `📖 ${topic} — 詳細分析\n\n「${topic}」についての詳細な情報をご紹介します。\n\n• 背景: このテーマは多くの人に影響を与えるため重要です。\n• 重要データ: ${topic}に関する情報は常に進化しています。\n• 推奨: 信頼できる情報源をフォローして最新情報を入手してください。\n\nこのテーマについてさらにアイデアが必要ですか？`,
    `🔍 調査: ${topic}\n\n「${topic}」について情報を検索した結果をご紹介します：\n\n📌 重要なポイント:\n1. ${topic}は現在大きな関心を集めています\n2. 分析すべき複数の視点があります\n3. コミュニティで活発に議論されています\n\n💡 さまざまな情報源を探索し、ご自身の意見を形成することをお勧めします。`,
  ];
}

function generateKoreanResponse(topic: string): string[] {
  return [
    `📖 ${topic} — 종합 분석\n\n"${topic}"에 대한 자세한 정보를 알려드립니다.\n\n• 배경: 이 주제는 많은 사람들에게 영향을 미치기 때문에 중요합니다.\n• 핵심 데이터: ${topic}에 대한 정보는 끊임없이 변화하고 있습니다.\n• 권장사항: 신뢰할 수 있는 출처를 팔로우하여 최신 정보를 유지하세요.\n\n이 주제에 대해 더 많은 아이디어를 원하시나요?`,
    `🔍 조사: ${topic}\n\n"${topic}"에 대해 정보를 검색한 결과입니다:\n\n📌 중요 사항:\n1. ${topic}은 현재 큰 관심을 받고 있는 주제입니다\n2. 분석할 다양한 관점이 있습니다\n3. 커뮤니티에서 활발하게 논의되고 있습니다\n\n💡 다양한 출처를 탐색하고 자신만의 의견을 형성하는 것을 제안합니다.`,
  ];
}

function generatePortugueseBRResponse(topic: string): string[] {
  return [
    `📖 ${topic} — Análise Completa\n\nAqui estão informações detalhadas sobre "${topic}".\n\n• Contexto: Este assunto é relevante porque afeta muitas pessoas.\n• Dados-chave: As informações sobre ${topic} estão em constante evolução.\n• Recomendação: Mantenha-se atualizado seguindo fontes confiáveis.\n\nVocê quer mais ideias sobre este assunto?`,
    `🔍 Pesquisa: ${topic}\n\nPesquisei informações sobre "${topic}" e isso é o que encontrei:\n\n📌 Pontos importantes:\n1. ${topic} é um assunto de grande interesse atual\n2. Há múltiplas perspectivas para analisar\n3. A comunidade está discutindo ativamente\n\n💡 Sugiro explorar diferentes fontes e formar sua própria opinião.`,
  ];
}

function generateRussianResponse(topic: string): string[] {
  return [
    `📖 ${topic} — Полный анализ\n\nВот подробная информация о "${topic}".\n\n• Контекст: Эта тема важна, так как затрагивает многих людей.\n• Ключевые данные: Информация о ${topic} постоянно развивается.\n• Рекомендация: Следите за надёжными источниками, чтобы быть в курсе.\n\nХотите больше идей по этой теме?`,
    `🔍 Исследование: ${topic}\n\nЯ нашёл информацию о "${topic}" и вот что обнаружил:\n\n📌 Важные моменты:\n1. ${topic} — тема большого интереса в настоящее время\n2. Существует множество точек зрения для анализа\n3. Сообщество активно обсуждает эту тему\n\n💡 Рекомендую изучить разные источники и сформировать собственное мнение.`,
  ];
}

function generateGermanResponse(topic: string): string[] {
  return [
    `📖 ${topic} — Vollständige Analyse\n\nHier finden Sie detaillierte Informationen über "${topic}".\n\n• Kontext: Dieses Thema ist relevant, da es viele Menschen betrifft.\n• Wichtige Daten: Die Informationen über ${topic} entwickeln sich ständig weiter.\n• Empfehlung: Bleiben Sie auf dem Laufenden, indem Sie zuverlässige Quellen verfolgen.\n\nMöchten Sie weitere Ideen zu diesem Thema?`,
    `🔍 Recherche: ${topic}\n\nIch habe nach Informationen über "${topic}" gesucht und Folgendes gefunden:\n\n📌 Wichtige Punkte:\n1. ${topic} ist ein Thema von großem aktuellen Interesse\n2. Es gibt multiple Perspektiven zur Analyse\n3. Die Community diskutiert aktiv darüber\n\n💡 Ich empfehle, verschiedene Quellen zu erkunden und sich eine eigene Meinung zu bilden.`,
  ];
}

function generateTurkishResponse(topic: string): string[] {
  return [
    `📖 ${topic} — Kapsamlı Analiz\n\n"${topic}" hakkında detaylı bilgiler burada.\n\n• Bağlam: Bu konu birçok kişiyi etkilediği için önemlidir.\n• Temel veriler: ${topic} hakkındaki bilgiler sürekli gelişmektedir.\n• Öneri: Güvenilir kaynakları takip ederek güncel kalın.\n\nBu konu hakkında daha fazla fikir ister misiniz?`,
    `🔍 Araştırma: ${topic}\n\n"${topic}" hakkında bilgi aradım ve bulduklarım şunlar:\n\n📌 Önemli noktalar:\n1. ${topic} şu anda büyük ilgi gören bir konudur\n2. Analiz etmek için birden fazla bakış açısı vardır\n3. Topluluk aktif olarak tartışıyor\n\n💡 Farklı kaynakları keşfetmenizi ve kendi görüşünüzü oluşturmanızı öneririm.`,
  ];
}

function generateChineseResponse(topic: string): string[] {
  return [
    `📖 ${topic} — 全面分析\n\n以下是关于"${topic}"的详细信息。\n\n• 背景：这个主题很重要，因为它影响着很多人。\n• 关键数据：关于${topic}的信息在不断更新。\n• 建议：请关注可靠的信息来源以保持更新。\n\n您想获取更多关于这个主题的想法吗？`,
    `🔍 研究：${topic}\n\n我搜索了关于"${topic}"的信息，以下是发现的内容：\n\n📌 重要要点：\n1. ${topic}是当前备受关注的话题\n2. 有多个角度可以进行分析\n3. 社区正在积极讨论\n\n💡 建议您探索不同的信息来源，形成自己的观点。`,
  ];
}
function generateArabicResponse(topic: string): string[] {
  return [
    `📖 ${topic} — تحليل شامل\n\nإليك معلومات مفصلة عن "${topic}".\n\n• السياق: هذا الموضوع مهم لأنه يؤثر على الكثير من الناس.\n• بيانات رئيسية: المعلومات عن ${topic} في تطور مستمر.\n• توصية: ابق على اطلاع من خلال متابعة مصادر موثوقة.\n\nهل تريد المزيد من الأفكار حول هذا الموضوع؟`,
    `🔍 بحث: ${topic}\n\nبحثت عن معلومات حول "${topic}" وهذا ما وجدته:\n\n📌 نقاط مهمة:\n1. ${topic} موضوع ذو أهمية كبيرة حالياً\n2. هناك وجهات نظر متعددة للتحليل\n3. المجتمع يناقش بنشاط\n\n💡 أقترح استكشاف مصادر مختلفة وتكوين رأيك الخاص.`,
  ];
}

function generateFrenchResponse(topic: string): string[] {
  return [
    `📖 ${topic} — Analyse Complète\n\nVoici des informations détaillées sur "${topic}".\n\n• Contexte: Ce sujet est pertinent car il affecte de nombreuses personnes.\n• Données clés: Les informations sur ${topic} évoluent constamment.\n• Recommandation: Restez à jour en suivant des sources fiables.\n\nVoulez-vous plus d'idées sur ce sujet?`,
    `🔍 Recherche: ${topic}\n\nJ'ai cherché des informations sur "${topic}" et voici ce que j'ai trouvé:\n\n📌 Points importants:\n1. ${topic} est un sujet de grand intérêt\n2. Il y a plusieurs perspectives à analyser\n3. La communauté en discute activement\n\n💡 Je suggère d'explorer différentes sources.`,
  ];
}
// ============================================================
// BREAKTHROUGH CONTENT ASSISTANT — Detailed, Unique Responses
// ============================================================
function generateLocalSuggestions(topic: string): string[] {
  const t = topic.trim();
  const capitalized = t.charAt(0).toUpperCase() + t.slice(1);
  const lower = t.toLowerCase();
  

   
  
   const detectedLang = detectLanguage(topic);
  const responseLang = detectedLang !== 'en' ? detectedLang : getResponseLanguage();
  
  // If user typed in non-English, respond in that language
  if (responseLang === 'es') {
    return generateSpanishResponse(topic);
  }
  if (responseLang === 'ar') {
    return generateArabicResponse(topic);
  }
  if (responseLang === 'fr') {
    return generateFrenchResponse(topic);
  }
    if (responseLang === 'gr') {
    return generateGermanResponse(topic);
  }
  if (responseLang === 'hi') {
    return generateHindiResponse(topic);
  }
  if (responseLang === 'it') {
    return generateItalianResponse(topic);
  }
  if (responseLang === 'ja') {
    return generateJapaneseResponse(topic);
  }
  if (responseLang === 'ko') {
    return generateKoreanResponse(topic);
  }
  if (responseLang === 'pt-BR') {
    return generatePortugueseBRResponse(topic);
  }
  if (responseLang === 'ru') {
    return generateRussianResponse(topic);
  }
  if (responseLang === 'tr') {
    return generateTurkishResponse(topic);
  }
  if (responseLang === 'zh') {
    return generateChineseResponse(topic);
  }


   
  // Try web-style response for any multi-word query
  const wordCount = t.split(/\s+/).length;
  
  if (wordCount >= 2) {
    // Multi-word query — generate a comprehensive overview
    return [
      `📖 Comprehensive Overview: ${capitalized}\n\n${capitalized} is a topic that has garnered significant attention. Here's what you need to know:\n\n• Background: ${capitalized} relates to various fields and has practical applications in everyday life.\n• Current Relevance: People are actively searching for information about ${capitalized} because of its growing importance.\n• Key Facts: Research shows that understanding ${capitalized} can lead to better decision-making and awareness.\n\nWould you like me to:\n1. Search for real-time information about "${t}"?\n2. Generate social media post ideas about this topic?\n3. Create relevant hashtags for "${t}"?`,
      
      `🔍 Deep Dive: ${capitalized}\n\nLet me break down "${t}" comprehensively:\n\n📌 Definition: ${capitalized} refers to [concept/field/person] that impacts [relevant area].\n\n📊 Why It Matters:\n• Impact on daily life: [explanation]\n• Professional relevance: [explanation]\n• Future implications: [explanation]\n\n📚 How To Learn More:\n• Read authoritative sources\n• Follow experts in the field\n• Join communities discussing ${capitalized}\n• Apply knowledge practically\n\n💡 The best way to understand ${capitalized} is through hands-on experience and continuous learning.`,
      
      `📰 Latest on ${capitalized}\n\nHere's a comprehensive look at "${t}":\n\n🔥 Trending Now: ${capitalized} is being discussed across social media, news outlets, and professional circles.\n\n📈 Growth & Statistics:\n• Search interest has increased significantly\n• More people are seeking information daily\n• Industry experts are weighing in\n\n🎯 Action Steps:\n1. Stay updated with latest developments\n2. Connect with others interested in this topic\n3. Share your knowledge and insights\n4. Apply what you learn in real situations\n\nWould you like me to generate content ideas or hashtags for "${t}"?`,
      
      `💡 Expert Insights: ${capitalized}\n\nLet me provide a detailed analysis of "${t}":\n\n🧠 Understanding The Basics:\n${capitalized} encompasses several key aspects that are worth exploring. Whether you're a beginner or experienced, there's always something new to learn.\n\n🌟 Key Highlights:\n• Innovation: ${capitalized} represents cutting-edge developments\n• Community: A growing community discusses and shares ideas\n• Opportunity: Knowledge of ${capitalized} opens doors\n\n📖 Recommended Approach:\n1. Start with fundamentals\n2. Follow thought leaders\n3. Engage with the community\n4. Practice and experiment\n5. Share your journey\n\nRemember: The best way to master any topic is through consistent learning and practical application.`,
    ];
  }
  
  
  // Single word — use category detection (existing logic)
  const isPerson = /^[A-Z][a-z]+(\s[A-Z][a-z]+)?$/.test(capitalized) && !/^[A-Z]{2,}$/.test(t);
  const isTech = /ai|tech|code|software|app|web|data|crypto|blockchain|robot|computer|programming|developer/i.test(lower);
  const isBusiness = /business|startup|marketing|finance|invest|money|entrepreneur|sales|revenue|profit/i.test(lower);
  const isSports = /sport|football|soccer|basketball|game|player|team|win|champion|goal|score/i.test(lower);
  const isHealth = /health|fitness|diet|exercise|yoga|meditation|wellness|nutrition|workout/i.test(lower);
  const isFood = /food|cook|recipe|cuisine|bake|restaurant|meal|dish|ingredient/i.test(lower);
  const isTravel = /travel|trip|vacation|tour|destination|flight|hotel|adventure/i.test(lower);
  const isScience = /science|physics|chemistry|biology|astronomy|space|planet|star/i.test(lower);
  const isEntertainment = /movie|film|tv|show|series|netflix|anime|music|song|celebrity/i.test(lower);
  
  let category = 'general';
  if (isPerson) category = 'person';
  else if (isTech) category = 'tech';
  else if (isBusiness) category = 'business';
  else if (isSports) category = 'sports';
  else if (isHealth) category = 'health';
  else if (isFood) category = 'food';
  else if (isTravel) category = 'travel';
  else if (isScience) category = 'science';
  else if (isEntertainment) category = 'entertainment';
  
  const templates: Record<string, string[]> = {
    person: [
      `${capitalized} is one of the most remarkable figures of our time. Their journey teaches us about perseverance, innovation, and the power of believing in yourself.\n\nKey achievements:\n• Revolutionized their field through bold thinking\n• Built a legacy that inspires millions\n• Demonstrated that success comes from consistent effort\n\n3 lessons from ${capitalized}:\n1. Embrace failure as a stepping stone\n2. Stay curious — never stop learning\n3. Build genuine connections`,
      `${capitalized}'s story proves that extraordinary success comes from ordinary beginnings. Their philosophy centers on continuous improvement, authentic leadership, and giving back.\n\nWhat sets ${capitalized} apart:\n• Unwavering commitment to vision\n• Ability to adapt and pivot\n• Deep understanding of their audience\n• Relentless work ethic`,
    ],
    sports: [
      `${capitalized} continues to captivate fans worldwide. The excitement around this topic reflects its universal appeal and competitive spirit.\n\nRecent developments:\n• Record-breaking performances\n• New talents emerging\n• Tactical innovations changing the game\n\nWhat fans are saying:\nThe community is buzzing with discussions about recent events and what they mean for the future of the sport.`,
      `The world of ${capitalized} never fails to deliver excitement. From thrilling matches to unexpected upsets, there's always something to talk about.\n\nKey talking points:\n• Standout performers this season\n• Teams to watch\n• Upcoming events and predictions\n\nJoin the conversation and share your thoughts!`,
    ],
    tech: [
      `${capitalized} is transforming the technology landscape. Here's what you need to know:\n\nWhat is ${capitalized}?\nA revolutionary approach that leverages cutting-edge advancements to solve real problems.\n\nWhy it matters:\n• Reduces costs by 40-60%\n• Increases efficiency through automation\n• Democratizes access to technology\n\nReal-world applications:\n1. Healthcare: Faster diagnosis\n2. Finance: Fraud detection\n3. Education: Adaptive learning\n4. Transportation: Smart logistics`,
    ],
    business: [
      `How to succeed with ${capitalized}:\n\nStep 1: Market Research\n• Identify your target audience\n• Analyze competitors\n• Validate your idea\n\nStep 2: Business Model\n• Subscription: $10-50/month\n• Marketplace: 5-15% commission\n• Freemium: Free basic, paid premium\n\nStep 3: Growth Strategy\n• Content marketing\n• Social media presence\n• Strategic partnerships`,
    ],
    general: [
      `${capitalized}: A Comprehensive Overview\n\nWhat is ${capitalized}?\nA fascinating topic that impacts our lives in numerous ways.\n\nKey aspects:\n1. History: How it all began\n2. Current State: Where things stand today\n3. Future Trends: What experts predict\n4. Practical Applications: How to use this knowledge\n\nGetting started:\n• Read introductory materials\n• Connect with communities\n• Practice what you learn\n• Share your knowledge`,
    ],
  };
  
  const categoryTemplates = templates[category] || templates['general'];
  return categoryTemplates.slice(0, 4).map((template, i) => {
    const angles = ['📖 Deep Dive:', '🔍 Analysis:', '💡 Insights:', '🚀 Guide:'];
    return `${angles[i]} ${template}`;
  });
}

// ============================================================
// WEB SEARCH — Fetches real information from the internet
// ============================================================
async function searchWeb(topic: string): Promise<string[]> {
  try {
    // Use DuckDuckGo Instant Answer API (free, no key needed)
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(topic)}&format=json&no_html=1&skip_disambig=1`
    );
    const data = await response.json();
    
    const results: string[] = [];
    
    // Get abstract
    if (data.AbstractText && data.AbstractText.length > 50) {
      results.push(`📚 Overview: ${data.AbstractText}\n\nSource: ${data.AbstractSource || 'DuckDuckGo'}`);
    }
    
    // Get related topics
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      const topics = data.RelatedTopics.slice(0, 3)
        .filter((t: any) => t.Text)
        .map((t: any) => `• ${t.Text.replace(/<\/?[^>]+(>|$)/g, '')}`);
      
      if (topics.length > 0) {
        results.push(`🔗 Related Information:\n${topics.join('\n')}`);
      }
    }
    
    // If we got results, return them
    if (results.length > 0) {
      return results;
    }
    
    // Fallback: Use Wikipedia API
    const wikiResponse = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic.replace(/\s+/g, '_'))}`
    );
    
    if (wikiResponse.ok) {
      const wikiData = await wikiResponse.json();
      if (wikiData.extract && wikiData.extract.length > 100) {
        results.push(`📖 Wikipedia: ${wikiData.extract.substring(0, 800)}...\n\nFull article: ${wikiData.content_urls?.desktop?.page || ''}`);
      }
    }
    
    return results.length > 0 ? results : [];
  } catch (err) {
    console.log('Web search failed, using offline suggestions');
    return [];
  }
}



const [showSuggestions, setShowSuggestions] = useState(false);
const [suggestionsList, setSuggestionsList] = useState<string[]>([]);



const TOPICS = [
  'How do I earn money?', 'What is WaveMesh?', 'How does offline work?',
  'Tell me about Marketplace', 'Privacy features?', 'How to start streaming?',
  'How to sell products?', 'How to go live?', 'What are gigs?',
  'How does tutoring work?', 'How to withdraw money?', 'Creator Studio',
  'Dark mode', 'Notifications', 'Invite friends', 'Certificates',
  'Live Audio', 'Group Chat', 'Events', 'Wallet', 'Profile'
];

const getSuggestions = (text: string): string[] => {
  if (text.length < 2) return [];
  const lower = text.toLowerCase();
  return TOPICS.filter(t => t.toLowerCase().includes(lower));
};

// ============================================================
// CONTENT ASSISTANT LOGIC (from AIAssistant.tsx)
// ============================================================
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
  'how to earn':'💰 You can earn money on Sasl through: Marketplace sales (95% yours), Creator subscriptions (70% yours), Streaming donations, Tutoring sessions (90% yours), Completing gigs, and Watching ads! Top creators earn $2,500-$4,500/month!',
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
  
  // Try web search first for real information
  const webResults = await searchWeb(topic);
  
  if (webResults.length > 0) {
    // We got real web data!
    setSuggestions(webResults);
    setHashtags(generateLocalHashtags(topic));
    setCaption(null);
    toast.success('📡 Real-time information loaded!');
  } else {
    // Fall back to local AI suggestions
    await new Promise(resolve => setTimeout(resolve, 400));
    setSuggestions(generateLocalSuggestions(topic));
    setHashtags(generateLocalHashtags(topic));
    setCaption(null);
    toast.success('Suggestions generated offline');
  }
  
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
              // Try Sasl Brain for unknown questions
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
    setShowSuggestions(false);
    setBrainLoading(true);

    try {
      // Space handling: detect topic from last meaningful words
      const words = userMessage.split(/\s+/);
      const searchQuery = words.slice(-3).join(' '); // Last 3 words
      
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
            {t('sasl-ai-hub')}
          </h2>
          <p className="text-white/80 text-sm">
            {t('sasl-ai-hub-description')}
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
                      {t('generate')}
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
                    <p className="text-gray-500 mt-3 font-semibold">{t('generating-amazing-content')}</p>
                    <p className="text-gray-400 text-sm mt-1">{t('ai-crafting-suggestions')}, { topic }</p>
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
                            {t('option')} {idx + 1}
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
                      <Hash size={20} /> {t('hashtags-for')}, { topic }
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
                      <Copy size={14} /> {t('copy-all-hashtags')}
                    </button>
                  </motion.div>
                )}

                {/* Results: Caption */}
                {!assistantLoading && assistantMode === 'caption' && caption && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <h3 className="font-bold text-lg flex items-center gap-2 text-green-600 mb-4">
                      <ImageIcon size={20} /> {t('generated-caption')}
                    </h3>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                      <p className="text-xl italic text-gray-700 dark:text-gray-300">"{caption}"</p>
                      <button
                        onClick={() => copyToClipboard(caption, 0)}
                        className="mt-4 flex items-center gap-2 text-green-600 hover:text-green-800 font-semibold text-sm"
                      >
                        {copiedIndex === 0 ? <Check size={16} /> : <Copy size={16} />}
                        {t('copy-caption')}
                      </button>
                    </div>
                  </motion.div>
                )}

                {captionLoading && (
                  <div className="text-center py-8">
                    <Loader2 className="animate-spin mx-auto text-green-500" size={40} />
                    <p className="text-gray-500 mt-2">{t('analyzing-image-and-generating-caption')}</p>
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
                  <p className="text-xs text-gray-400 mb-3">{t('try-saying')}:</p>
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
                           <div className="flex gap-2 relative">
                  <div className="flex-1 relative">
                    <input
                      value={brainInput}
                      onChange={e => {
                        setBrainInput(e.target.value);
                        const suggestions = getSuggestions(e.target.value);
                        setSuggestionsList(suggestions);
                        setShowSuggestions(suggestions.length > 0);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleBrainSend();
                      }}
                      placeholder="Ask me anything about Sasl..."
                      className="w-full px-5 py-3.5 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition outline-none"
                    />
                    {showSuggestions && (
                      <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border z-50 max-h-48 overflow-y-auto">
                        {suggestionsList.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setBrainInput(s);
                              setShowSuggestions(false);
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm border-b last:border-b-0"
                          >
                            💡 {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
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
          <span>  && Ask me anything about Sasl...</span>
          <span className="flex items-center gap-1">
            <Globe size={12} /> Sasl AI Hub v1.0
          </span>
        </div>
      </motion.div>
    </div>
  );
}