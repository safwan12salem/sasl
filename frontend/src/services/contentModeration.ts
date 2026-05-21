/**
 * Sasl - Content Moderation AI
 * Detects spam, hate speech, and inappropriate content
 */
export class ContentModerator {
  private spamPatterns: RegExp[] = [
    /buy now/i, /click here/i, /limited offer/i, /act now/i,
    /congratulations.*won/i, /you.*selected/i, /claim.*prize/i,
    /FREE.*CLICK/i, /\d{1,3}% off/i, /while supplies last/i,
    /make \$\d+.*day/i, /work from home.*\$\d+/i,
  ];
  
  private hatePatterns: RegExp[] = [
    /\b(hate|kill|attack|destroy)\b.*\b(people|group|race|religion)\b/i,
    /\b(terrorist|extremist)\b/i,
    /\b(slur|offensive|derogatory)\b/i,
  ];
  
  private inappropriateWords: string[] = [
    'spam', 'scam', 'fraud', 'phishing', 'malware',
  ];

  async moderateText(text: string): Promise<{
    isSpam: boolean;
    isHateful: boolean;
    isInappropriate: boolean;
    confidence: number;
    reason?: string;
  }> {
    let spamScore = 0;
    let hateScore = 0;
    let inappropriateScore = 0;
    
    // Check spam patterns
    for (const pattern of this.spamPatterns) {
      if (pattern.test(text)) spamScore += 0.2;
    }
    
    // Check hate patterns
    for (const pattern of this.hatePatterns) {
      if (pattern.test(text)) hateScore += 0.3;
    }
    
    // Check inappropriate words
    const lower = text.toLowerCase();
    for (const word of this.inappropriateWords) {
      if (lower.includes(word)) inappropriateScore += 0.25;
    }
    
    // Check for excessive caps (spam indicator)
    const capsRatio = (text.match(/[A-Z]/g) || []).length / (text.length || 1);
    if (capsRatio > 0.5 && text.length > 20) spamScore += 0.3;
    
    // Check for repeated characters
    if (/(.)\1{4,}/.test(text)) spamScore += 0.2;
    
    const isSpam = spamScore >= 0.5;
    const isHateful = hateScore >= 0.3;
    const isInappropriate = inappropriateScore >= 0.5;
    
    let reason = '';
    if (isSpam) reason = 'Spam detected';
    if (isHateful) reason = 'Hateful content detected';
    if (isInappropriate) reason = 'Inappropriate content detected';
    
    return {
      isSpam,
      isHateful,
      isInappropriate,
      confidence: Math.max(spamScore, hateScore, inappropriateScore),
      reason,
    };
  }

  async moderateImage(file: File): Promise<{
    isNSFW: boolean;
    confidence: number;
  }> {
    // Offline: check file name for suspicious patterns
    const name = file.name.toLowerCase();
    const suspicious = ['nsfw', 'adult', 'explicit', 'xxx'];
    const isSuspicious = suspicious.some(w => name.includes(w));
    
    return {
      isNSFW: isSuspicious,
      confidence: isSuspicious ? 0.7 : 0.1,
    };
  }
}

export const contentModerator = new ContentModerator();