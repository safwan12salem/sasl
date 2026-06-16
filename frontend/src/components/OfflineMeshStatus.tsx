/**
 * Sasl - Offline Mesh Status Indicator
 * Shows connected peers and mesh network strength
 */
import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, Users, Radio } from 'lucide-react';
import { motion } from 'framer-motion';
import { WaveMeshNode } from '../services/waveMesh';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

let meshNode: WaveMeshNode | null = null;

export function getMeshNode(): WaveMeshNode | null {
  return meshNode;
}

export default function OfflineMeshStatus() {
  const { user } = useAuth();
  const [peers, setPeers] = useState<string[]>([]);
  const [meshActive, setMeshActive] = useState(false);
  const [incomingMessages, setIncomingMessages] = useState<any[]>([]);
  const [t] = useTranslation();

  useEffect(() => {
    if (!user) return;

    meshNode = new WaveMeshNode(user.username, {
      onMessage: (msg) => {
        setIncomingMessages(prev => [...prev.slice(-50), msg]);
      },
      onPeerConnected: (peerId) => {
        setPeers(prev => Array.from(new Set([...prev, peerId])));
      },
      onPeerDisconnected: (peerId) => {
        setPeers(prev => prev.filter(p => p !== peerId));
      },
    });

    return () => {
      meshNode?.stop();
      meshNode = null;
    };
  }, [user]);

  const toggleMesh = async () => {
    if (meshActive) {
      meshNode?.stop();
      setMeshActive(false);
      setPeers([]);
    } else {
      await meshNode?.start();
      setMeshActive(true);
    }
  };

  const sendTestMessage = () => {
    meshNode?.sendMeshMessage(t('Hello from the mesh! 🌊'));
  };

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="relative"
      >
        <button
          onClick={toggleMesh}
          className={`p-3 rounded-full shadow-lg transition ${
            meshActive ? 'bg-green-500' : 'bg-gray-400'
          }`}
        >
          {meshActive ? <Radio size={20} className="text-white animate-pulse" /> : <WifiOff size={20} className="text-white" />}
        </button>
        
        {peers.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
            {peers.length}
          </span>
        )}
      </motion.div>

      {meshActive && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-16 right-0 w-64 bg-white rounded-2xl shadow-xl p-4 border"
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-sm flex items-center gap-1">
              <Radio size={14} className="text-green-500" /> WaveMesh
            </h4>
            <span className="text-xs text-green-600 font-semibold">
              {peers.length} peer{peers.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          {peers.length > 0 && (
            <div className="space-y-1 mb-3">
              {peers.map(peer => (
                <div key={peer} className="flex items-center gap-2 text-xs text-gray-600">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  {peer}
                </div>
              ))}
            </div>
          )}
          
          <div className="flex gap-2">
            <button onClick={sendTestMessage} className="btn-primary text-xs py-1 px-3 flex-1">
              {t('Send Message')}
            </button>
          </div>
          
          <p className="text-[10px] text-gray-400 mt-2 text-center">
            {t('Post, chat, and search without internet via WaveMesh')}
          </p>
        </motion.div>
      )}
    </div>
  );
}