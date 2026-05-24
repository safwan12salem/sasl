import React from 'react';
import QRCode from 'qrcode.react';
import { Download, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
export default function QRProfile({ username }: { username: string }) {
  const profileUrl = `https://sasl.app/profile/${username}`;

  const downloadQR = () => {
    const canvas = document.getElementById('sasl-qr') as HTMLCanvasElement;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `sasl-${username}.png`;
    a.click();
  };

  const { t } = useTranslation();

  return (
    <div className="text-center p-6">
      <h3 className="font-bold mb-4">{t('Your QR Profile')}</h3>
      <div className="bg-white p-4 rounded-2xl inline-block">
        <QRCodeSVG id="sasl-qr" value={profileUrl} size={200} level="H" includeMargin />
      </div>
      <p className="text-sm text-gray-500 mt-2">@{username}</p>
      <div className="flex gap-2 mt-4 justify-center">
        <button onClick={downloadQR} className="btn-ghost text-sm flex items-center gap-1">
          <Download size={14} /> {t('Save')}
        </button>
        <button onClick={() => { navigator.clipboard.writeText(profileUrl); toast.success(t('Link copied!')); }} className="btn-ghost text-sm flex items-center gap-1">
          <Share2 size={14} /> {t('Share')}
        </button>
      </div>
    </div>
  );
}