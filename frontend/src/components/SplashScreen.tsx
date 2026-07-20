import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from './Logo';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<'bubble' | 'explode' | 'logo'>('bubble');
  const [startTime] = useState(Date.now());

  useEffect(() => {
    // Phase 1: Show bubble (0-1.5s)
    const bubbleTimer = setTimeout(() => setPhase('explode'), 1500);
    // Phase 2: Explode (1.5-2.5s)
    const explodeTimer = setTimeout(() => setPhase('logo'), 2500);
    // Phase 3: Finish (3s)
    const finishTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onFinish, 500);
    }, 3500);

    return () => {
      clearTimeout(bubbleTimer);
      clearTimeout(explodeTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Generate particles for explosion
  const particles = [...Array(20)].map((_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 400,
    y: (Math.random() - 0.5) * 400,
    scale: Math.random() * 0.5 + 0.5,
    rotation: Math.random() * 360,
    color: i % 3 === 0 ? '#00A86B' : i % 3 === 1 ? '#FF7F11' : '#FFFFFF',
    size: Math.random() * 12 + 4,
  }));

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-gray-950"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-br from-sasl-green/10 via-gray-950 to-sasl-orange/10" />

          {/* Phase 1: Message Bubble */}
          <AnimatePresence>
            {phase === 'bubble' && (
              <motion.div
                className="relative z-10 flex flex-col items-center"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.5, transition: { duration: 0.3 } }}
              >
                {/* Chat bubble */}
                <motion.div
                  className="bg-gradient-to-br from-sasl-green to-emerald-600 text-white px-8 py-5 rounded-3xl rounded-bl-md shadow-2xl shadow-sasl-green/30 max-w-xs"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <motion.p
                    className="text-2xl font-bold text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    No WiFi?
                  </motion.p>
                  <motion.p
                    className="text-lg text-center text-white/80 mt-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                  >
                    No Problem.
                  </motion.p>
                </motion.div>

                {/* Typing dots */}
                <motion.div
                  className="flex gap-1.5 mt-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.0 }}
                >
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full bg-sasl-green/60"
                      animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                    />
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Phase 2: Explosion */}
          <AnimatePresence>
            {phase === 'explode' && (
              <motion.div className="relative z-10" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Particles flying out */}
                {particles.map(p => (
                  <motion.div
                    key={p.id}
                    className="absolute rounded-full"
                    style={{
                      width: p.size,
                      height: p.size,
                      backgroundColor: p.color,
                      left: '50%',
                      top: '50%',
                    }}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                    animate={{
                      x: p.x,
                      y: p.y,
                      opacity: [1, 1, 0],
                      scale: [0, p.scale, 0],
                      rotate: p.rotation,
                    }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                  />
                ))}

                {/* Center flash */}
                <motion.div
                  className="absolute w-32 h-32 rounded-full bg-white/30 blur-xl"
                  style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{ scale: 3, opacity: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />

                {/* "Offline" text in center of explosion */}
                <motion.p
                  className="text-white/60 text-sm tracking-widest absolute"
                  style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  OFFLINE
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Phase 3: Logo Reveal */}
          <AnimatePresence>
            {phase === 'logo' && (
              <motion.div
                className="relative z-10 flex flex-col items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                <motion.div
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                >
                  <Logo className="text-7xl md:text-8xl" />
                </motion.div>

                <motion.p
                  className="text-white/80 mt-6 text-xl md:text-2xl font-light tracking-wider text-center px-4"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  Social Asynchronous Sharing Layer
                </motion.p>

                <motion.p
                  className="text-sasl-green/60 mt-3 text-sm tracking-widest uppercase"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  🌊 Offline-First Social Network
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;