import React, { useEffect, useState } from 'react';
import { Users, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OnlineUsers() {
  const [count, setCount] = useState(0);
  const [nearbyCount, setNearbyCount] = useState(0);

  useEffect(() => {
    // Simulate online users count
    const base = Math.floor(Math.random() * 1000) + 500;
    setCount(base);
    setNearbyCount(Math.floor(Math.random() * 50) + 5);
    
    const interval = setInterval(() => {
      setCount(prev => prev + Math.floor(Math.random() * 3) - 1);
      setNearbyCount(prev => Math.max(0, prev + Math.floor(Math.random() * 3) - 1));
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 text-xs text-gray-500"
    >
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <Users size={12} />
        <span>{count.toLocaleString()} online</span>
      </div>
      <div className="flex items-center gap-1">
        <MapPin size={12} />
        <span>{nearbyCount} near you</span>
      </div>
    </motion.div>
  );
}