import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kkmvlyiizyvvjtodxvlc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrbXZseWlpenl2dmp0b2R4dmxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NjAzODgsImV4cCI6MjA5NDQzNjM4OH0.ikc96hE1kXXjQlQpi2sOy0kOL9TPrId92jG6Qz2YJrU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Subscribe to real-time notifications
export const subscribeToNotifications = (userId: string, callback: (payload: any) => void) => {
  return supabase
    .channel('notifications')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` }, 
      callback
    )
    .subscribe();
};

// Send notification (used by backend or frontend)
export const sendNotification = async (recipientId: string, actorName: string, message: string, type: string = 'general') => {
  const { error } = await supabase
    .from('notifications')
    .insert({ recipient_id: recipientId, actor_name: actorName, message, notification_type: type });
  return !error;
};

// Upload media file
// Upload media file
export const uploadMedia = async (fileName: string, file: File) => {
  console.log('📤 Supabase uploadMedia called:', fileName, file.size);
  const { data, error } = await supabase.storage
    .from('media')
    .upload(fileName, file, { upsert: true });
  
  if (error) {
    console.warn('❌ Supabase upload error:', error.message, error);
    return null;
  }
  
  console.log('✅ Supabase upload success:', data);
  const { data: urlData } = supabase.storage
    .from('media')
    .getPublicUrl(fileName);
  
  return urlData.publicUrl;
};