import { splitVideoIntoChunks } from './videoChunker';
import api from './api';
import toast from 'react-hot-toast';

export async function uploadLargeVideo(file: File, endpoint: string, extraFields: Record<string, string> = {}): Promise<any> {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB Cloudinary limit
  
  if (file.size <= MAX_SIZE) {
    // Upload directly
    const formData = new FormData();
    formData.append('video', file);
    Object.entries(extraFields).forEach(([k, v]) => formData.append(k, v));
    const res = await api.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data;
  }
  
  // Split and upload chunks
  toast.loading(`Processing large video (${Math.round(file.size / 1024 / 1024)}MB)...`);
  
  const chunks = await splitVideoIntoChunks(file);
  const urls: string[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const formData = new FormData();
    formData.append('video', new File([chunk.blob], `chunk_${i}_${file.name}`, { type: file.type }));
    formData.append('chunk_index', String(i));
    formData.append('chunk_total', String(chunks.length));
    formData.append('video_manifest_name', file.name);
    Object.entries(extraFields).forEach(([k, v]) => formData.append(k, v));
    
    try {
      const res = await api.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data.video_url) urls.push(res.data.video_url);
    } catch (err) {
      toast.error(`Chunk ${i + 1}/${chunks.length} failed`);
      throw err;
    }
  }
  
  toast.dismiss();
  
  // Upload manifest
  const manifest = JSON.stringify({ name: file.name, chunks: urls });
  const manifestBlob = new Blob([manifest], { type: 'application/json' });
  const manifestForm = new FormData();
  manifestForm.append('video', new File([manifestBlob], file.name + '.manifest.json'));
  manifestForm.append('is_manifest', 'true');
  Object.entries(extraFields).forEach(([k, v]) => manifestForm.append(k, v));
  
  const manifestRes = await api.post(endpoint, manifestForm, { headers: { 'Content-Type': 'multipart/form-data' } });
  return manifestRes.data;
}
