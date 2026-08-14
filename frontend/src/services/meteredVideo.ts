import { MeteredVideo } from '@metered/rtc';

let videoCall: MeteredVideo | null = null;

export async function startMeteredCall(roomName: string) {
  videoCall = new MeteredVideo({
    roomName,
    accessKey: 'YOUR_METERED_ACCESS_KEY',
    secretKey: 'YOUR_METERED_SECRET_KEY',
  });
  
  await videoCall.join();
  
  videoCall.on('remote-track', (track, stream) => {
    // Attach remote stream to video element
    const remoteVideo = document.getElementById('remote-video') as HTMLVideoElement;
    if (remoteVideo) {
      remoteVideo.srcObject = stream;
      remoteVideo.play().catch(() => {});
    }
  });
  
  videoCall.on('local-track', (track, stream) => {
    // Attach local stream
    const localVideo = document.getElementById('local-video') as HTMLVideoElement;
    if (localVideo) {
      localVideo.srcObject = stream;
      localVideo.muted = true;
      localVideo.play().catch(() => {});
    }
  });
}

export function leaveMeteredCall() {
  videoCall?.leave();
  videoCall = null;
}