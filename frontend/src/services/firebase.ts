import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import api from './api';

const firebaseConfig = {
  apiKey: "AIzaSyBoIjcVvA78Z7CPD62Gy0_Dl5VTP_M20xU",
  authDomain: "sasl-20bca.firebaseapp.com",
  projectId: "sasl-20bca",
  storageBucket: "sasl-20bca.firebasestorage.app",
  messagingSenderId: "579972013274",
  appId: "1:579972013274:web:ceaf4c1adccabae40019e3"
};




const app = initializeApp(firebaseConfig);

const messaging = getMessaging(app);

export async function requestNotificationPermission() {
  try {
    const token = await getToken(messaging, { vapidKey: 'BD3IRo_XPLHMFUw5N4b7aBqVv1aolEyBml8a_obM0JtyYWZiJY0TBLl075A2m6tDsNfxIYf53KQ1hxD0UCD5fbk' });
    // Send token to backend
    await api.post('/users/device-token/', { token });
    return token;
  } catch (err) {
    console.log('Notification permission denied');
    return null;
  }
}

export function onForegroundMessage(callback: (payload: any) => void) {
  return onMessage(messaging, callback);
}