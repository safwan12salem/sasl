import { splitVideoIntoChunks } from './videoChunker';
import { uploadMedia } from './supabase';
import api from './api';
import toast from 'react-hot-toast';

export async function uploadLargeVideo(file: File, endpoint: string, extraFields: Record<string, string> = {}): Promise<any> {
  // Try Supabase Storage first for the whole file
  try {
    const fileName = `videos/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const url = await uploadMedia(fileName, file);
    if (url) {
      // Notify backend about Supabase URL
      const res = await api.post(endpoint, { 
        video_url: url,
        ...extraFields 
      });
      return res.data;
    }
  } catch (e) {
    console.log('Supabase video upload failed, using backend API');
  }
  
  // Fallback: Backend API (current method)
  const formData = new FormData();
  formData.append('video', file);
  Object.entries(extraFields).forEach(([k, v]) => formData.append(k, v));
  const res = await api.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res.data;
}