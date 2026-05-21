import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kkmvlyiizyvvjtodxvlc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrbXZseWlpenl2dmp0b2R4dmxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NjAzODgsImV4cCI6MjA5NDQzNjM4OH0.ikc96hE1kXXjQlQpi2sOy0kOL9TPrId92jG6Qz2YJrU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Subscribe to real-time notifications
export const subscribeToNotifications = (callback: (payload: any) => void) => {
  return supabase
    .channel('notifications')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'notifications' }, 
      callback
    )
    .subscribe();
};

// Upload media file
export const uploadMedia = async (fileName: string, file: File) => {
  const { error } = await supabase.storage
    .from('media')
    .upload(`posts/${fileName}`, file);
  
  if (error) {
    console.warn('Supabase upload error:', error);
    return null;
  }
  
  const { data: urlData } = supabase.storage
    .from('media')
    .getPublicUrl(`posts/${fileName}`);
  
  return urlData.publicUrl;
};