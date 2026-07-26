export interface Sound {
  id: string;
  title: string;
  audio_url: string;
  duration?: number;
  artist?: string;
}

// Add your sounds here
export const soundLibrary: Sound[] = [
  { id: '1', title: 'Original Audio', audio_url: '' },
];

export function searchSounds(query: string): Sound[] {
  return soundLibrary.filter(s => s.title.toLowerCase().includes(query.toLowerCase()));
}
