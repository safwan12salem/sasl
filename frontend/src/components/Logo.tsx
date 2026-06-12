import React from 'react';
import { useTranslation } from 'react-i18next';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = '' }) => {
  const { t } = useTranslation();
  return (
    <div className={`flex items-center ${className}`}>
      <span className="font-extrabold tracking-[-4px]">
        <span className="text-sasl-green" style={{ fontSize: 'inherit' }}>S</span>
        <span className="text-sasl-orange" style={{ fontSize: 'inherit' }}>L</span>
      </span>
      <span className="text-xs text-gray-400 hidden md:inline ml-2">{t('Social Async Sharing Layer')}</span>
    </div>
  );
};

export default Logo;