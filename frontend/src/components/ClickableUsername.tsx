import React from 'react';
import { useNavigate } from 'react-router-dom';

interface Props {
  username: string;
  className?: string;
  children?: React.ReactNode;
}

export default function ClickableUsername({ username, className, children }: Props) {
  const navigate = useNavigate();
  
  return (
    <span
      className={`cursor-pointer hover:text-sasl-green hover:underline transition-colors ${className || ''}`}
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/profile/${username}`);
      }}
    >
      {children || `@${username}`}
    </span>
  );
}