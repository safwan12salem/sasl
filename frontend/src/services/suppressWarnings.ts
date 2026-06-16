// Suppress TensorFlow WebGL warnings globally
const _origWarn = console.warn;
console.warn = (...args: any[]) => {
  const msg = args[0]?.toString?.() || '';
  if (msg.includes('webgl') || msg.includes('WebGL') || msg.includes('backend')) return;
  _origWarn.apply(console, args);
};

export {};
