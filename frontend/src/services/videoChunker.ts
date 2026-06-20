/**
 * Split large videos into 9MB chunks for Cloudinary free tier upload
 * Reassembled on playback via HLS-like manifest
 */
const CHUNK_SIZE = 9 * 1024 * 1024; // 9MB per chunk (safe under 10MB limit)

export interface VideoChunk {
  blob: Blob;
  index: number;
  total: number;
  fileName: string;
}

export async function splitVideoIntoChunks(file: File): Promise<VideoChunk[]> {
  const chunks: VideoChunk[] = [];
  const total = Math.ceil(file.size / CHUNK_SIZE);
  
  for (let i = 0; i < total; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const blob = file.slice(start, end);
    chunks.push({
      blob,
      index: i,
      total,
      fileName: file.name
    });
  }
  
  return chunks;
}

export function createVideoManifest(originalName: string, cloudinaryUrls: string[]): string {
  return JSON.stringify({
    name: originalName,
    chunks: cloudinaryUrls,
    createdAt: new Date().toISOString()
  });
}

export function parseVideoManifest(manifest: string): { name: string; chunks: string[] } {
  const data = JSON.parse(manifest);
  return { name: data.name, chunks: data.chunks };
}
