import { uploadMedia } from './supabase';

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dwem1chqc/upload';
const CLOUDINARY_PRESET = 'sasl_upload';

export async function uploadFile(file: File, folder: string = 'posts'): Promise<string> {
  try {
    const fileName = `${folder}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const url = await uploadMedia(fileName, file);
    if (url) return url;
   } catch (e) {
    console.log('Supabase upload failed, falling back to Cloudinary:', e);
  }

  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_PRESET);
  const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
  const data = await res.json();
  return data.secure_url;
}