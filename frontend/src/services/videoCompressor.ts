/**
 * Compress video before upload to fit Cloudinary 10MB free tier limit
 */
export async function compressVideo(file: File, maxSizeMB: number = 10): Promise<File> {
  // If already under limit, return as-is
  if (file.size <= maxSizeMB * 1024 * 1024) return file;

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    
    video.onloadedmetadata = () => {
      const duration = video.duration;
      // Target: reduce bitrate to fit within maxSizeMB
      const targetBitrate = (maxSizeMB * 8 * 1024) / duration; // kbps
      
      const stream = (canvas as any).captureStream(30);
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: Math.min(targetBitrate * 1000, 2000000) // cap at 2Mbps
      });
      
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.webm'), { type: 'video/webm' });
        URL.revokeObjectURL(video.src);
        resolve(compressedFile);
      };
      
      recorder.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Compression failed'));
      };
      
      video.currentTime = 0;
      video.oncanplay = () => {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.drawImage(video, 0, 0);
        recorder.start();
        video.play();
        setTimeout(() => {
          recorder.stop();
          video.pause();
        }, duration * 1000);
      };
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Cannot load video'));
    };
  });
}
