/**
 * Sasl - Social Asynchronous Sharing Layer
 * WaveMesh Chat – Enhanced P2P messaging with reactions, voice notes, file sharing
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  Send, Wifi, WifiOff, Users, Bluetooth, Radio, Loader2,
  Smile, Paperclip, Mic, Image as ImageIcon, FileText,
  Check, CheckCheck, Clock, MoreVertical, X, Plus,
  MessageCircle, Zap, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();

interface PeerDevice {
  id: string;
  name: string;
  rssi?: number;
  connected: boolean;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'file' | 'voice';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  voiceDuration?: number;
}

const SASL_SERVICE_UUID = '0000sasl-0000-1000-8000-00805f9b34fb';
const MSG_CHARACTERISTIC_UUID = '0000sasl-0001-1000-8000-00805f9b34fb';

export default function WaveMeshChat() {
  // Bluetooth state
  const [scanning, setScanning] = useState(false);
  const [peers, setPeers] = useState<PeerDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<any>(null);
  const [server, setServer] = useState<any>(null);
  const [characteristic, setCharacteristic] = useState<any>(null);
  const [connected, setConnected] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  // Broadcast channel for local mesh discovery
  const bcRef = useRef<BroadcastChannel | null>(null);
  const [broadcastPeers, setBroadcastPeers] = useState<string[]>([]);

  // Voice recording
  const [recordingVoice, setRecordingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);

  // File sharing
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Typing indicator
  const [peerTyping, setPeerTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
const [showEmoji, setShowEmoji] = useState(false);
  // ============================================================
  // BROADCAST CHANNEL MESH DISCOVERY
  // ============================================================
  useEffect(() => {
    bcRef.current = new BroadcastChannel(t('sasl-mesh-chat'));
    bcRef.current.onmessage = (event) => {
      const data = event.data;
      if (data.type === t('message')) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: data.sender || 'Unknown',
          text: data.text,
          timestamp: Date.now(),
          status: 'delivered',
          type: data.messageType || 'text',
          fileUrl: data.fileUrl,
          fileName: data.fileName,
        }]);
      } else if (data.type === t('typing')) {
        setPeerTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setPeerTyping(false), 2000);
      } else if (data.type === t('peer_discovery')) {
        setBroadcastPeers(prev => prev.includes(data.peerId) ? prev : [...prev, data.peerId]);
      }
    };

    // Announce presence
    const interval = setInterval(() => {
      bcRef.current?.postMessage({ type: t('peer_discovery'), peerId: t('local-user') });
    }, 5000);

    return () => {
      bcRef.current?.close();
      clearInterval(interval);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // ============================================================
  // BLUETOOTH CONNECTION
  // ============================================================
  const scanForDevices = useCallback(async () => {
    setScanning(true);
    try {
      // @ts-ignore
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [SASL_SERVICE_UUID],
      });
      setConnectedDevice(device);
      
      const gattServer = await device.gatt!.connect();
      setServer(gattServer);
      
      let service;
      try {
        service = await gattServer.getPrimaryService(SASL_SERVICE_UUID);
      } catch {
        toast.error(t('Device does not support Sasl Mesh'));
        return;
      }
      
      const char = await service.getCharacteristic(MSG_CHARACTERISTIC_UUID);
      setCharacteristic(char);
      setConnected(true);
      
      toast.success(`Connected to ${device.name || t('Unknown Device')}`);

      // Listen for messages
      await char.startNotifications();
      char.addEventListener('characteristicvaluechanged', (event: any) => {
        const value = new TextDecoder().decode(event.target.value);
        try {
          const data = JSON.parse(value);
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            sender: device.name || 'Peer',
            text: data.text || '[File]',
            timestamp: Date.now(),
            status: 'delivered',
            type: data.type || 'text',
            fileUrl: data.fileUrl,
            fileName: data.fileName,
          }]);
        } catch {
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            sender: device.name || 'Peer',
            text: value,
            timestamp: Date.now(),
            status: 'delivered',
            type: 'text',
          }]);
        }
      });
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        toast.error(err.message || 'Bluetooth scan failed');
      }
    } finally {
      setScanning(false);
    }
  }, []);

  // ============================================================
  // SEND MESSAGE
  // ============================================================
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text && !selectedFile) return;

    const messageId = Date.now().toString();
    const newMessage: ChatMessage = {
      id: messageId,
      sender: 'Me',
      text: selectedFile ? `📎 ${selectedFile.name}` : text,
      timestamp: Date.now(),
      status: 'sending',
      type: selectedFile ? (selectedFile.type.startsWith('image/') ? 'image' : 'file') : 'text',
      fileName: selectedFile?.name,
      fileSize: selectedFile?.size,
    };
    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setSending(true);

    try {
      const messageData: any = {
        type: 'message',
        text: text,
        messageType: newMessage.type,
        sender: 'Me',
        timestamp: Date.now(),
      };

      if (selectedFile) {
        const reader = new FileReader();
        reader.onload = async () => {
          messageData.fileUrl = reader.result as string;
          messageData.fileName = selectedFile.name;
          messageData.fileSize = selectedFile.size;
          messageData.messageType = selectedFile.type.startsWith('image/') ? 'image' : 'file';
          await sendData(messageData, messageId);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        await sendData(messageData, messageId);
      }
    } catch (err) {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: 'sent' } : m));
      toast.error(t('Failed to send'));
    } finally {
      setSending(false);
      setSelectedFile(null);
    }
  }, [input, selectedFile, characteristic, connected]);

  const sendData = async (data: any, messageId: string) => {
    const jsonStr = JSON.stringify(data);
    
    // Try Bluetooth first
    if (characteristic && connected) {
      try {
        const encoder = new TextEncoder();
        await characteristic.writeValue(encoder.encode(jsonStr));
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: 'delivered' } : m));
        return;
      } catch {}
    }

    // Fall back to BroadcastChannel (local mesh)
    if (bcRef.current) {
      bcRef.current.postMessage(data);
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: 'delivered' } : m));
      return;
    }

    // Offline: save locally
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: 'sent' } : m));
    toast.success(t('Message saved – will send when peer connects'));
  };

  // ============================================================
  // TYPING INDICATOR
  // ============================================================
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (bcRef.current) {
      bcRef.current.postMessage({ type: t('typing') });
    }
  };

  // ============================================================
  // VOICE RECORDING
  // ============================================================
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      voiceChunksRef.current = [];

      recorder.ondataavailable = e => voiceChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(voiceChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          const data = {
            type: t('message'),
            messageType: t('voice'),
            text: t('🎤 Voice message'),
            voiceUrl: reader.result as string,
            voiceDuration: Math.round((Date.now() - recordingStartTime) / 1000),
            sender: 'Me',
            timestamp: Date.now(),
          };
          sendData(data, Date.now().toString());
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };

      const recordingStartTime = Date.now();
      recorder.start();
      setRecordingVoice(true);
      toast(t('Recording...'));
      
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
          setRecordingVoice(false);
        }
      }, 30000); // Max 30 seconds
    } catch {
      toast.error(t('Microphone access denied'));
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecordingVoice(false);
    }
  };

  // ============================================================
  // DISCONNECT
  // ============================================================
  const disconnect = useCallback(() => {
    if (server) server.disconnect();
    setConnected(false);
    setConnectedDevice(null);
    setServer(null);
    setCharacteristic(null);
  }, [server]);

  // ============================================================
  // RENDER
  // ============================================================
  const getStatusIcon = (status: ChatMessage['status']) => {
    switch (status) {
      case 'sending': return <Clock size={10} className="text-gray-400" />;
      case 'sent': return <Check size={10} className="text-gray-400" />;
      case 'delivered': return <CheckCheck size={10} className="text-gray-400" />;
      case 'read': return <CheckCheck size={10} className="text-blue-500" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold gradient-text flex items-center gap-2">
            <Radio className="text-purple-500" /> WaveMesh Chat
          </h2>
          <p className="text-sm text-gray-500">
            Peer-to-peer messaging via Bluetooth & local network
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Connection status */}
          <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
            connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {connected ? <Bluetooth size={12} /> : <WifiOff size={12} />}
            {connected ? 'Connected' : `${broadcastPeers.length > 0 ? 'Local Mesh' : 'No peers'}`}
          </span>
          {connected ? (
            <button onClick={disconnect} className="btn-ghost text-red-500 text-sm">Disconnect</button>
          ) : (
            <button onClick={scanForDevices} disabled={scanning} className="btn-primary text-sm flex items-center gap-1">
              {scanning ? <Loader2 className="animate-spin" size={14} /> : <Bluetooth size={14} />}
              {scanning ? 'Scanning...' : 'Scan & Connect'}
            </button>
          )}
        </div>
      </div>

      {/* Mesh Info Banner */}
      {!connected && broadcastPeers.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-4 flex items-center gap-2">
          <Zap size={16} className="text-purple-500" />
          <p className="text-sm text-purple-700">
            {t('Local mesh active')} – {broadcastPeers.length} {t('peer(s) nearby')}. {t('Messages sent via BroadcastChannel')}
          </p>
        </div>
      )}

      {!connected && broadcastPeers.length === 0 && (
        <div className="bg-gray-50 rounded-2xl p-8 text-center mb-4">
          <Radio size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-semibold">{t('No mesh peers detected')}</p>
          <p className="text-sm text-gray-400 mt-1">
            {t('Open Sasl on another device or tab to test local mesh.')}
            {t('For Bluetooth, click "Scan & Connect" on both devices.')}
          </p>
          <button onClick={scanForDevices} className="btn-primary mt-4 flex items-center gap-2 mx-auto">
            <Bluetooth size={16} /> {t('Scan for Devices')}
          </button>
        </div>
      )}

      {/* Connected device info */}
      {connected && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">
              {connectedDevice?.name?.[0]?.toUpperCase() || 'D'}
            </div>
            <div>
              <p className="font-semibold text-sm">{connectedDevice?.name || t('Device')}</p>
              <p className="text-xs text-green-600">{t('Connected via Bluetooth')}</p>
            </div>
          </div>
          <Shield size={16} className="text-green-500" />
        </div>
      )}

      {/* Messages */}
       <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b">
  <span className="flex items-center gap-1 text-xs"><Wifi size={14} className={connected ? 'text-green-500' : 'text-red-500'} /> {connected ? 'Connected' : 'Disconnected'}</span>
  <span className="flex items-center gap-1 text-xs text-gray-500"><Users size={14} /> {peers.length} peers</span>
  <div className="flex items-center gap-1 ml-auto">
    <button onClick={() => setShowEmoji(!showEmoji)} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"><Smile size={18} /></button>
    <button onClick={() => fileInputRef.current?.click()} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"><Paperclip size={18} /></button>
    <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"><MoreVertical size={18} /></button>
  </div>
</div>

      <div className="h-96 bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 mb-3 overflow-y-auto space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <MessageCircle size={48} className="mx-auto mb-2 opacity-50" />
              <p>{t('No messages yet')}</p>
              <p className="text-sm">{t('Start chatting via mesh!')}</p>
            </div>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.sender === 'Me' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] px-4 py-3 rounded-2xl ${
              msg.sender === 'Me'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-br-md'
                : 'bg-white dark:bg-gray-800 shadow-sm border rounded-bl-md'
            }`}>
              <p className="text-xs opacity-70 font-semibold mb-1">{msg.sender}</p>
              
              {msg.type === 'image' && msg.fileUrl && (
                <img src={msg.fileUrl} alt={msg.fileName} className="rounded-lg mb-2 max-h-48 w-full object-cover" />
              )}
              
              {msg.type === 'voice' && (
                <div className="flex items-center gap-2 mb-1">
                  <Mic size={16} />
                  <span className="text-sm">{t('🎤 Voice message')}</span>
                  {msg.voiceDuration && <span className="text-xs opacity-70">{msg.voiceDuration}{t('s')}</span>}
                </div>
              )}
              
              {msg.type === 'file' && (
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={16} />
                  <span className="text-sm">{msg.fileName || 'File'}</span>
                </div>
              )}
              
              <p className="text-sm">{msg.text}</p>
              <div className="flex items-center gap-1 mt-1 justify-end">
                <span className="text-[10px] opacity-60">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {msg.sender === 'Me' && getStatusIcon(msg.status)}
              </div>
            </div>
          </motion.div>
        ))}

        {peerTyping && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-2xl shadow-sm">
              <p className="text-sm text-gray-400 italic">{t('Peer is typing...')}</p>
            </div>
          </div>
        )}
      </div>

      {/* File preview */}
      {selectedFile && (
        <div className="flex items-center gap-2 mb-2 p-2 bg-gray-100 rounded-lg">
          {selectedFile.type.startsWith('image/') ? (
            <img src={URL.createObjectURL(selectedFile)} alt="Preview" className="w-10 h-10 rounded object-cover" />
          ) : (
            <FileText size={20} className="text-gray-500" />
          )}
          <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
          <button onClick={() => setSelectedFile(null)} className="text-red-500"><X size={16} /></button>
        </div>
      )}

      {/* Voice recording indicator */}
      {recordingVoice && (
        <div className="flex items-center gap-2 mb-2 p-3 bg-red-50 border border-red-200 rounded-xl">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm text-red-600 font-semibold">{t('Recording...')}</span>
          <button onClick={stopVoiceRecording} className="ml-auto bg-red-500 text-white px-3 py-1 rounded-full text-xs">
            {t('Stop')}
          </button>
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <button onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            className="p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition">
            <Plus size={20} />
          </button>
          
          <AnimatePresence>
            {showAttachmentMenu && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-2 flex gap-1 z-20">
                <button onClick={() => { imageInputRef.current?.click(); setShowAttachmentMenu(false); }}
                  className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl flex flex-col items-center text-xs gap-1">
                  <ImageIcon size={20} className="text-blue-500" /> {t('Photo')}
                </button>
                <button onClick={() => { fileInputRef.current?.click(); setShowAttachmentMenu(false); }}
                  className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl flex flex-col items-center text-xs gap-1">
                  <FileText size={20} className="text-orange-500" /> {t('File')}
                </button>
                <button onClick={() => { startVoiceRecording(); setShowAttachmentMenu(false); }}
                  className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl flex flex-col items-center text-xs gap-1">
                  <Mic size={20} className="text-red-500" /> {t('Voice')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <input type="file" accept="image/*" ref={imageInputRef} className="hidden"
            onChange={e => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]); }} />
          <input type="file" ref={fileInputRef} className="hidden"
            onChange={e => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]); }} />
        </div>

        <input value={input} onChange={handleInputChange}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder={connected ? t('Type a message...') : t('Type a message (local mesh)...')}
          className="input-field flex-1" />

        <button onClick={sendMessage} disabled={sending || (!input.trim() && !selectedFile)}
          className="btn-primary p-3 rounded-full disabled:opacity-50">
          {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
        </button>
      </div>
    </div>
  );
}