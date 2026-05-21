/**
 * Sasl - Social Asynchronous Sharing Layer
 * GifPicker with Tenor API – handles errors gracefully.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

const API_KEY = 'LIVDSRZULELA';
const BASE_URL = 'https://g.tenor.com/v1';

interface GifObject {
  id: string;
  title: string;
  media_formats: {
    gif?: { url: string };
    tinygif?: { url: string };
  };
}

interface GifPickerProps {
  onSelect: (url: string) => void;
  onClose: () => void;
}

const GifPicker: React.FC<GifPickerProps> = ({ onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const [gifs, setGifs] = useState<GifObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextPos, setNextPos] = useState<string>('');

  const fetchGifs = useCallback(async (query: string, pos: string = '') => {
    setLoading(true);
    try {
      const endpoint = query
        ? `${BASE_URL}/search?q=${encodeURIComponent(query)}&key=${API_KEY}&limit=20&pos=${pos}`
        : `${BASE_URL}/trending?key=${API_KEY}&limit=20&pos=${pos}`;
      const res = await fetch(endpoint);
      const data = await res.json();
      const results = data.results || [];
      const validGifs = results.filter((g: any) => g.media_formats && (g.media_formats.gif || g.media_formats.tinygif));
      if (pos) {
        setGifs(prev => [...prev, ...validGifs]);
      } else {
        setGifs(validGifs);
      }
      setNextPos(data.next || '');
      setHasMore(!!data.next);
    } catch (err) {
      console.error('GIF fetch error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGifs('', '');
  }, [fetchGifs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGifs(search, '');
  };

  return (
    <div className="absolute bottom-full left-0 mb-2 w-80 bg-white rounded-xl shadow-2xl border p-3 z-50">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-sm">GIFs</h3>
        <button onClick={onClose}><X size={16} /></button>
      </div>
      <form onSubmit={handleSearch} className="flex gap-1 mb-2">
        <input
          type="text"
          placeholder="Search GIFs..."
          className="input-field text-sm py-1"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button type="submit" className="btn-primary text-xs py-1 px-2"><Search size={14} /></button>
      </form>
      <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
        {gifs.map(gif => (
          <img
            key={gif.id}
            src={gif.media_formats.tinygif?.url || gif.media_formats.gif?.url || ''}
            alt={gif.title}
            className="rounded cursor-pointer hover:opacity-80 transition w-full h-24 object-cover"
            onClick={() => {
              const url = gif.media_formats.gif?.url || gif.media_formats.tinygif?.url;
              if (url) onSelect(url);
            }}
          />
        ))}
      </div>
      {loading && <div className="flex justify-center py-2"><Loader2 className="animate-spin" size={18} /></div>}
      {hasMore && !loading && (
        <button onClick={() => fetchGifs(search, nextPos)} className="w-full text-center text-sm text-green-600 hover:underline mt-2">
          Load more
        </button>
      )}
    </div>
  );
};

export default GifPicker;