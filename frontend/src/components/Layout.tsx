import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { useMesh } from '../hooks/useMesh';
import Logo from './Logo';
import {
  Home, ShoppingBag, Radio, GraduationCap, Wallet, User,
  LogOut, Wifi, WifiOff, Video, Camera, MessageCircle,
  Star, Briefcase, TrendingUp, Sparkles, Brain, DollarSign,
  Moon, Sun, Mic, Users
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import PageTransition from './PageTransition';
import OnlineUsers from './OnlineUsers';
import { useTheme } from '../contexts/ThemeContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const { isOnline, toggleOnlineMode } = useMesh();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();

  const navItems = [
    { to: '/', icon: Home, label: t('feed') },
    { to: '/gigs', icon: Briefcase, label: t('Gig Central') },
    { to: '/marketplace', icon: ShoppingBag, label: t('marketplace') },
     { to: '/group-chat', icon: Users, label: t('Group Chat') },
    { to: '/tutoring', icon: GraduationCap, label: t('tutoring') },
    { to: '/streaming', icon: Radio, label: t('streaming') },
    { to: '/reels', icon: Video, label: t('Reels') },
    { to: '/snap', icon: Camera, label: t('Snap') },
    { to: '/ar-filters', icon: Camera, label: t('AR Filters') },
    { to: '/analytics', icon: TrendingUp, label: t('Analytics') },
    { to: '/live-audio', icon: Mic, label: t('Live Audio') },
    { to: '/meshchat', icon: MessageCircle, label: t('meshchat') },
    { to: '/ai-hub', icon: Sparkles, label: t('Sasl AI Hub') },
    { to: '/progress', icon: Star, label: t('Progress') },
    { to: '/wallet', icon: Wallet, label: t('wallet') },
    { to: '/earnings', icon: DollarSign, label: t('Earnings') },
    { to: '/profile', icon: User, label: t('profile') },
   
  ];

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-72 bg-gradient-to-b from-green-900 via-green-800 to-gray-900 text-white p-4 flex flex-col shadow-2xl z-20">
        <div className="mb-8">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                location.pathname === to
                  ? 'bg-white/20 shadow-lg font-semibold'
                  : 'hover:bg-white/10'
              }`}
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/20 pt-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm opacity-80">{user?.username}</span>
            <button onClick={toggleOnlineMode} className={`p-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}>
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            </button>
          </div>
          <OnlineUsers />
          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={logout} className="flex items-center gap-2 w-full py-2 px-4 rounded-xl bg-red-600/80 hover:bg-red-700 transition">
            <LogOut size={18} /> {t('logout')}
          </button>
        </div>
      </aside>

      {/* Main content area with header */}
      <div className="flex-1 flex flex-col bg-gray-50/50 backdrop-blur-sm relative">
        {/* Sticky top header */}
        <header className="sticky top-0 z-10 flex justify-between items-center px-6 py-3 bg-white/80 backdrop-blur shadow-sm">
          <div />
          <div className="flex items-center gap-4">
            <OnlineUsers />
            <NotificationBell />
            <LanguageSwitcher />
          </div>
        </header>

        {/* Scrollable main */}
        <main className="flex-1 overflow-y-auto p-6">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  );
}