import React, { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';

const COUNTRIES = [
  { code: 'default', name: '🌍 All Countries' },
  { code: 'US', name: '🇺🇸 United States' },
  { code: 'GB', name: '🇬🇧 United Kingdom' },
  { code: 'DE', name: '🇩🇪 Germany' },
  { code: 'FR', name: '🇫🇷 France' },
  { code: 'ES', name: '🇪🇸 Spain' },
  { code: 'IT', name: '🇮🇹 Italy' },
  { code: 'NL', name: '🇳🇱 Netherlands' },
  { code: 'SE', name: '🇸🇪 Sweden' },
  { code: 'NO', name: '🇳🇴 Norway' },
  { code: 'DK', name: '🇩🇰 Denmark' },
  { code: 'FI', name: '🇫🇮 Finland' },
  { code: 'PT', name: '🇵🇹 Portugal' },
  { code: 'GR', name: '🇬🇷 Greece' },
  { code: 'PL', name: '🇵🇱 Poland' },
  { code: 'CZ', name: '🇨🇿 Czech Republic' },
  { code: 'AT', name: '🇦🇹 Austria' },
  { code: 'CH', name: '🇨🇭 Switzerland' },
  { code: 'IE', name: '🇮🇪 Ireland' },
  { code: 'BE', name: '🇧🇪 Belgium' },
  { code: 'CA', name: '🇨🇦 Canada' },
  { code: 'AU', name: '🇦🇺 Australia' },
  { code: 'NZ', name: '🇳🇿 New Zealand' },
  { code: 'JP', name: '🇯🇵 Japan' },
  { code: 'KR', name: '🇰🇷 South Korea' },
  { code: 'CN', name: '🇨🇳 China' },
  { code: 'IN', name: '🇮🇳 India' },
  { code: 'BR', name: '🇧🇷 Brazil' },
  { code: 'MX', name: '🇲🇽 Mexico' },
  { code: 'AR', name: '🇦🇷 Argentina' },
  { code: 'CL', name: '🇨🇱 Chile' },
  { code: 'CO', name: '🇨🇴 Colombia' },
  { code: 'PE', name: '🇵🇪 Peru' },
  { code: 'ZA', name: '🇿🇦 South Africa' },
  { code: 'NG', name: '🇳🇬 Nigeria' },
  { code: 'KE', name: '🇰🇪 Kenya' },
  { code: 'EG', name: '🇪🇬 Egypt' },
  { code: 'SA', name: '🇸🇦 Saudi Arabia' },
  { code: 'AE', name: '🇦🇪 UAE' },
  { code: 'TR', name: '🇹🇷 Turkey' },
  { code: 'RU', name: '🇷🇺 Russia' },
  { code: 'UA', name: '🇺🇦 Ukraine' },
  { code: 'TH', name: '🇹🇭 Thailand' },
  { code: 'VN', name: '🇻🇳 Vietnam' },
  { code: 'ID', name: '🇮🇩 Indonesia' },
  { code: 'MY', name: '🇲🇾 Malaysia' },
  { code: 'SG', name: '🇸🇬 Singapore' },
  { code: 'PH', name: '🇵🇭 Philippines' },
  { code: 'PK', name: '🇵🇰 Pakistan' },
  { code: 'BD', name: '🇧🇩 Bangladesh' },
  { code: 'LK', name: '🇱🇰 Sri Lanka' },
  { code: 'NP', name: '🇳🇵 Nepal' },
  { code: 'MA', name: '🇲🇦 Morocco' },
  { code: 'DZ', name: '🇩🇿 Algeria' },
  { code: 'TN', name: '🇹🇳 Tunisia' },
  { code: 'LY', name: '🇱🇾 Libya' },
  { code: 'SD', name: '🇸🇩 Sudan' },
  { code: 'ET', name: '🇪🇹 Ethiopia' },
  { code: 'GH', name: '🇬🇭 Ghana' },
];

export default function CountryFilter({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Globe size={16} className="text-green-500" />
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="input-field text-sm py-1.5 px-3 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
      >
        {COUNTRIES.map(c => (
          <option key={c.code} value={c.code}>{c.name}</option>
        ))}
      </select>
    </div>
  );
}