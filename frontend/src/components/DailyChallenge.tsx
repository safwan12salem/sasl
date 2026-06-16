import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Star, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
const challenges = [
  { id: 1, text: 'Post 3 times today', goal: 3, xp: 50 },
  { id: 2, text: 'Like 10 posts', goal: 10, xp: 30 },
  { id: 3, text: 'Make 1 donation', goal: 1, xp: 80 },
];

export default function DailyChallenge() {
  const { user } = useAuth();
  const [current, setCurrent] = useState<{ id: number; text: string; goal: number; xp: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    // Random challenge each day
    const today = new Date().toDateString();
    const stored = localStorage.getItem(`challenge_${today}`);
    if (stored) {
      const data = JSON.parse(stored);
      setCurrent(data.challenge);
      setProgress(data.progress);
      setCompleted(data.completed);
    } else {
      const random = challenges[Math.floor(Math.random() * challenges.length)];
      setCurrent(random);
      localStorage.setItem(`challenge_${today}`, JSON.stringify({ challenge: random, progress: 0, completed: false }));
    }
  }, []);

  // For demo, increment progress on a button
  const increment = () => {
    if (!current) return;
    const newProgress = progress + 1;
    setProgress(newProgress);
    if (newProgress >= current.goal && !completed) {
      setCompleted(true);
      toast.success(t('challenge_completed', { xp: current.xp }));
    }
    const today = new Date().toDateString();
    localStorage.setItem(`challenge_${today}`, JSON.stringify({ challenge: current, progress: newProgress, completed: newProgress >= current.goal }));
  };

  if (!current) return null;

  return (
    <div className="glass p-4 rounded-2xl mb-6">
      <h3 className="font-bold text-lg flex items-center gap-2"><Star size={18} /> {t('daily_challenge')}</h3>
      <p className="text-sm mt-1">{current.text}</p>
      <div className="w-full bg-gray-200 h-2 rounded-full mt-2">
        <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${(progress / current.goal) * 100}%` }} />
      </div>
      <div className="flex justify-between items-center mt-2">
        <span className="text-xs text-gray-500">{progress}/{current.goal}</span>
        {completed ? (
          <span className="text-green-600 flex items-center gap-1 text-sm"><CheckCircle size={14} /> Done (+{current.xp} XP)</span>
        ) : (
          <button onClick={increment} className="btn-primary text-xs py-1 px-2">{t('do_it')}</button>
        )}
      </div>
    </div>
  );
}