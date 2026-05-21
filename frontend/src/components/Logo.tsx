/**
 * Sasl - Social Asynchronous Sharing Layer
 * Animated logo component – green S, orange L.
 */
import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="text-sasl-green font-bold" style={{ fontSize: 'inherit' }}>S</span>
      <span className="text-sasl-orange font-bold" style={{ fontSize: 'inherit' }}>L</span>
      <span className="text-xs text-gray-400 hidden md:inline ml-2">Social Async Sharing Layer</span>
    </div>
  );
};

export default Logo;