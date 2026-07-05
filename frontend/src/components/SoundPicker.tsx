import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Play, Pause, X, Search, Check } from 'lucide-react';
import { soundLibrary, categories, searchSounds, Sound } from '../services/soundLibrary';
import { useTranslation } from 'react-i18next';

interface SoundPickerProps {
  onSelect: (sound: Sound) => void;
  onClose: () => void;
  currentSound?: Sound | null;
}

export default function SoundPicker({ onSelect, onClose, currentSound }: SoundPickerProps) {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState('trending');
  const [search, setSearch] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(currentSound?.id || null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const filteredSounds = search.trim() 
    ? searchSounds(search)
    : soundLibrary.filter(s => s.category === activeCategory);

  const handlePlay = (sound: Sound) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (playingId === sound.id) {
      setPlayingId(null);
      return;
    }
    const audio = new Audio(sound.url);
    audio.play();
    audio.onended = () => setPlayingId(null);
    audioRef.current = audio;
    setPlayingId(sound.id);
  };

  const handleSelect = (sound: Sound) => {
    setSelectedId(sound.id);
    onSelect(sound);
  };

  const handleDone = () => {
    if (selectedId) {
      const sound = soundLibrary.find(s => s.id === selectedId);
      if (sound) onSelect(sound);
    }
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <X size={20} />
          </button>
          <h3 className="font-bold flex items-center gap-2"><Music size={18} className="text-purple-500" /> {t('Add Sound')}</h3>
          <button onClick={handleDone} className="text-purple-600 font-semibold text-sm hover:underline">
            {t('Done')}
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm outline-none"
              placeholder={t('Search sounds...')} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
          {categories.map(cat => (
            <button key={cat.key} onClick={() => { setActiveCategory(cat.key); setSearch(''); }}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                activeCategory === cat.key && !search ? 'bg-purple-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 hover:bg-gray-200'
              }`}>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sound List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {filteredSounds.length === 0 ? (
            <p className="text-center text-gray-400 py-10">{t('No sounds found')}</p>
          ) : (
            <div className="space-y-1">
              {filteredSounds.map(sound => (
                <motion.div key={sound.id} whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition ${
                    selectedId === sound.id ? 'bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}>
                  {/* Play button */}
                  <button onClick={() => handlePlay(sound)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
                      playingId === sound.id ? 'bg-purple-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600'
                    }`}>
                    {playingId === sound.id ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                  </button>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0" onClick={() => handleSelect(sound)}>
                    <p className="font-semibold text-sm truncate">{sound.title}</p>
                    <p className="text-xs text-gray-500">{sound.artist} · {sound.duration}</p>
                  </div>

                  {/* Select checkmark */}
                  {selectedId === sound.id && <Check size={20} className="text-purple-500 flex-shrink-0" />}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
