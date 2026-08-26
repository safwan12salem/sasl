import React from 'react';
import { Globe } from 'lucide-react';

const COUNTRIES = [
  { code: 'default', name: '🌍 All' },
  { code: 'US', name: '🇺🇸 US' }, { code: 'GB', name: '🇬🇧 UK' },
  { code: 'DE', name: '🇩🇪 DE' }, { code: 'FR', name: '🇫🇷 FR' },
  { code: 'ES', name: '🇪🇸 ES' }, { code: 'IT', name: '🇮🇹 IT' },
  { code: 'NL', name: '🇳🇱 NL' }, { code: 'SE', name: '🇸🇪 SE' },
  { code: 'NO', name: '🇳🇴 NO' }, { code: 'DK', name: '🇩🇰 DK' },
  { code: 'FI', name: '🇫🇮 FI' }, { code: 'PT', name: '🇵🇹 PT' },
  { code: 'GR', name: '🇬🇷 GR' }, { code: 'PL', name: '🇵🇱 PL' },
  { code: 'CZ', name: '🇨🇿 CZ' }, { code: 'AT', name: '🇦🇹 AT' },
  { code: 'CH', name: '🇨🇭 CH' }, { code: 'IE', name: '🇮🇪 IE' },
  { code: 'BE', name: '🇧🇪 BE' }, { code: 'CA', name: '🇨🇦 CA' },
  { code: 'AU', name: '🇦🇺 AU' }, { code: 'NZ', name: '🇳🇿 NZ' },
  { code: 'JP', name: '🇯🇵 JP' }, { code: 'KR', name: '🇰🇷 KR' },
  { code: 'CN', name: '🇨🇳 CN' }, { code: 'IN', name: '🇮🇳 IN' },
  { code: 'BR', name: '🇧🇷 BR' }, { code: 'MX', name: '🇲🇽 MX' },
  { code: 'AR', name: '🇦🇷 AR' }, { code: 'SA', name: '🇸🇦 SA' },
  { code: 'AE', name: '🇦🇪 AE' }, { code: 'TR', name: '🇹🇷 TR' },
  { code: 'IL', name: '🇮🇱 IL' }, { code: 'EG', name: '🇪🇬 EG' },
  { code: 'ZA', name: '🇿🇦 ZA' }, { code: 'NG', name: '🇳🇬 NG' },
  { code: 'KE', name: '🇰🇪 KE' }, { code: 'MA', name: '🇲🇦 MA' },
  { code: 'DZ', name: '🇩🇿 DZ' }, { code: 'TN', name: '🇹🇳 TN' },
  { code: 'LY', name: '🇱🇾 LY' },
];

export default function CountryFilter({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  return (
    <div className="inline-flex items-center gap-1 flex-shrink-0">
      <Globe size={14} className="text-green-500" />
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full px-2 py-1 outline-none max-w-[90px] truncate"
      >
        {COUNTRIES.map(c => (
          <option key={c.code} value={c.code}>{c.name}</option>
        ))}
      </select>
    </div>
  );
}