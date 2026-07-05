/**
 * Sasl Sound Library
 * Curated free-to-use sounds for Snaps & Reels
 */

export interface Sound {
  id: string;
  title: string;
  artist: string;
  category: string;
  duration: string;
  url: string;  // Free sound from Pixabay/Freesound
  trending: boolean;
}

export const soundLibrary: Sound[] = [
  // TRENDING
  { id: 't1', title: 'Summer Vibes', artist: 'Sasl Audio', category: 'trending', duration: '0:30', url: 'https://cdn.pixabay.com/audio/2022/10/25/audio_946b4e6d50.mp3', trending: true },
  { id: 't2', title: 'Chill Lofi', artist: 'Sasl Audio', category: 'trending', duration: '0:28', url: 'https://cdn.pixabay.com/audio/2022/05/17/audio_a2ba44e1fc.mp3', trending: true },
  { id: 't3', title: 'Upbeat Energy', artist: 'Sasl Audio', category: 'trending', duration: '0:25', url: 'https://cdn.pixabay.com/audio/2022/10/14/audio_993c91c7c2.mp3', trending: true },
  { id: 't4', title: 'Gentle Piano', artist: 'Sasl Audio', category: 'trending', duration: '0:32', url: 'https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a7075c.mp3', trending: true },
  
  // HIP HOP
  { id: 'h1', title: 'Trap Beat', artist: 'Sasl Audio', category: 'hiphop', duration: '0:22', url: 'https://cdn.pixabay.com/audio/2022/10/18/audio_2d4387c8f6.mp3', trending: false },
  { id: 'h2', title: 'Old School', artist: 'Sasl Audio', category: 'hiphop', duration: '0:26', url: 'https://cdn.pixabay.com/audio/2022/08/23/audio_d5e7c6d8.mp3', trending: false },
  
  // ELECTRONIC
  { id: 'e1', title: 'Deep House', artist: 'Sasl Audio', category: 'electronic', duration: '0:30', url: 'https://cdn.pixabay.com/audio/2022/01/18/audio_1424f4e2c5.mp3', trending: false },
  { id: 'e2', title: 'Synthwave', artist: 'Sasl Audio', category: 'electronic', duration: '0:24', url: 'https://cdn.pixabay.com/audio/2022/05/09/audio_c6c8c3b9a2.mp3', trending: false },
  { id: 'e3', title: 'Future Bass', artist: 'Sasl Audio', category: 'electronic', duration: '0:28', url: 'https://cdn.pixabay.com/audio/2022/09/16/audio_3f2d7e1a.mp3', trending: false },
  
  // ACOUSTIC
  { id: 'a1', title: 'Acoustic Guitar', artist: 'Sasl Audio', category: 'acoustic', duration: '0:35', url: 'https://cdn.pixabay.com/audio/2022/04/07/audio_8b5c7d2e.mp3', trending: false },
  { id: 'a2', title: 'Ukulele Fun', artist: 'Sasl Audio', category: 'acoustic', duration: '0:20', url: 'https://cdn.pixabay.com/audio/2022/11/22/audio_7a4b2c1d.mp3', trending: false },
  
  // CINEMATIC
  { id: 'c1', title: 'Epic Orchestra', artist: 'Sasl Audio', category: 'cinematic', duration: '0:40', url: 'https://cdn.pixabay.com/audio/2022/07/28/audio_4e6f8a2c.mp3', trending: false },
  { id: 'c2', title: 'Dramatic Rise', artist: 'Sasl Audio', category: 'cinematic', duration: '0:18', url: 'https://cdn.pixabay.com/audio/2022/02/14/audio_1a3b5c7d.mp3', trending: false },
  
  // FUNNY
  { id: 'f1', title: 'Cartoon Boing', artist: 'Sasl Audio', category: 'funny', duration: '0:03', url: 'https://cdn.pixabay.com/audio/2022/12/01/audio_5c8d2e1f.mp3', trending: false },
  { id: 'f2', title: 'Laugh Track', artist: 'Sasl Audio', category: 'funny', duration: '0:05', url: 'https://cdn.pixabay.com/audio/2022/06/30/audio_9b4c7e2d.mp3', trending: false },
  { id: 'f3', title: 'Squeaky Toy', artist: 'Sasl Audio', category: 'funny', duration: '0:02', url: 'https://cdn.pixabay.com/audio/2022/08/15/audio_2f6a8b4c.mp3', trending: false },
];

export const categories = [
  { key: 'trending', label: '🔥 Trending', icon: '🔥' },
  { key: 'hiphop', label: '🎤 Hip Hop', icon: '🎤' },
  { key: 'electronic', label: '🎧 Electronic', icon: '🎧' },
  { key: 'acoustic', label: '🎸 Acoustic', icon: '🎸' },
  { key: 'cinematic', label: '🎬 Cinematic', icon: '🎬' },
  { key: 'funny', label: '😂 Funny', icon: '😂' },
];

export function getSoundsByCategory(category: string): Sound[] {
  return soundLibrary.filter(s => s.category === category);
}

export function getTrendingSounds(): Sound[] {
  return soundLibrary.filter(s => s.trending);
}

export function searchSounds(query: string): Sound[] {
  const q = query.toLowerCase();
  return soundLibrary.filter(s => 
    s.title.toLowerCase().includes(q) || 
    s.artist.toLowerCase().includes(q) ||
    s.category.toLowerCase().includes(q)
  );
}
