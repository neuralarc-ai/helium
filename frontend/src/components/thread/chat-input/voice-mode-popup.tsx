'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { X, Mic, MicOff, Volume2, VolumeX, AlertCircle, RotateCcw } from 'lucide-react';
import { useDeepgramVoiceAgent } from '@/hooks/use-deepgram-voice-agent';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import './voice-mode-popup.css';

interface VoiceModePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

// Enhanced voice states for better UX
type VoiceState = 'idle' | 'initializing' | 'listening' | 'processing' | 'speaking' | 'error';

const glassBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1.5px solid rgba(255,255,255,0.18)',
  boxShadow: '0 4px 24px 0 rgba(0,0,0,0.18)',
  color: 'white',
  transition: 'all 0.2s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

// Tooltip component
const Tooltip: React.FC<{ children: React.ReactNode; text: string; position?: 'top' | 'bottom' }> = ({ 
  children, 
  text, 
  position = 'top' 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={cn(
            "absolute z-[300] px-3 py-2 text-sm text-white bg-black/80 backdrop-blur-sm rounded-lg border border-white/20 shadow-lg whitespace-nowrap",
            position === 'top' ? 'bottom-full left-1/2 -translate-x-1/2 mb-2' : 'top-full left-1/2 -translate-x-1/2 mt-2'
          )}
          style={{
            boxShadow: '0 4px 24px 0 rgba(0,0,0,0.25)',
          }}
        >
          {text}
          {/* Arrow */}
          <div
            className={cn(
              "absolute left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-transparent",
              position === 'top' 
                ? 'top-full border-t-4 border-t-black/80' 
                : 'bottom-full border-b-4 border-b-black/80'
            )}
          />
        </div>
      )}
    </div>
  );
};

// Particle component for floating effects
const Particle: React.FC<{ 
  x: number; 
  y: number; 
  size: number; 
  color: string; 
  opacity: number;
  velocity: { x: number; y: number };
  life: number;
}> = ({ x, y, size, color, opacity, velocity, life }) => {
  return (
    <circle
      cx={x}
      cy={y}
      r={size}
      fill={color}
      opacity={opacity}
      style={{
        filter: `blur(${size * 0.5}px)`,
        transform: `translate(${velocity.x}px, ${velocity.y}px)`,
        transition: `all ${life}s ease-out`,
      }}
    />
  );
};

// Enhanced Voice Interaction Animation Component
const VoiceInteractionAnimation: React.FC<{ 
  state: VoiceState; 
  voiceLevel?: number;
  audioLevel?: number;
}> = ({ state, voiceLevel = 0, audioLevel = 0 }) => {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    size: number;
    color: string;
    opacity: number;
    velocity: { x: number; y: number };
    life: number;
  }>>([]);
  const [particleId, setParticleId] = useState(0);
  const animationRef = useRef<number | null>(null);

  // Dynamic color schemes based on state and audio level
  const getDynamicColors = useCallback(() => {
    const baseColors = {
      idle: ['#8338ec', '#3a86ff', '#06ffa5'],
      listening: ['#ff006e', '#8338ec', '#06ffa5'],
      speaking: ['#ff9500', '#ff006e', '#8338ec'],
      processing: ['#06ffa5', '#00d4ff', '#8338ec'],
      error: ['#ff006e', '#ff4757', '#ff3838'],
      initializing: ['#8338ec', '#3a86ff', '#06ffa5']
    } as const;

    const colors = (baseColors as any)[state] || baseColors.idle;
    const intensity = Math.min(1, audioLevel * 2);
    
    return colors.map((color: string) => {
      const hsl = hexToHsl(color);
      const newLightness = Math.min(100, hsl.l + intensity * 20);
      return hslToHex(hsl.h, hsl.s, newLightness);
    });
  }, [state, audioLevel]);

  // Helper functions for color manipulation
  const hexToHsl = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    
    return { h: h * 360, s: s * 100, l: l * 100 };
  };

  const hslToHex = (h: number, s: number, l: number) => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  // Generate wave path with audio responsiveness
  const generateWavePath = useCallback((index: number, amplitude: number = 1) => {
    const width = 1920;
    const height = 1080;
    const centerY = height / 2;
    const segments = 50;
    const frequency = (index + 1) * 0.5;
    const phase = (index * Math.PI) / 3;
    
    let path = `M 0,${centerY}`;
    
    for (let i = 0; i <= segments; i++) {
      const x = (i / segments) * width;
      const normalizedX = (i / segments) * Math.PI * 2;
      
      // Combine multiple sine waves for complex patterns
      const wave1 = Math.sin(normalizedX * frequency + phase) * amplitude * 50;
      const wave2 = Math.sin(normalizedX * frequency * 0.5 + phase * 2) * amplitude * 30;
      const wave3 = Math.sin(normalizedX * frequency * 2 + phase * 0.5) * amplitude * 20;
      
      const y = centerY + wave1 + wave2 + wave3;
      path += ` L ${x},${y}`;
    }
    
    return path;
  }, []);

  // Particle system
  useEffect(() => {
    let rafId: number | null = null;

    const createParticle = () => {
      const colors = getDynamicColors();
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      return {
        id: particleId,
        x: Math.random() * 1920,
        y: Math.random() * 1080,
        size: Math.random() * 3 + 1,
        color,
        opacity: Math.random() * 0.6 + 0.2,
        velocity: {
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2
        },
        life: Math.random() * 3 + 2
      };
    };

    const tick = () => {
      setParticles(prev => {
        const filtered = prev.filter(p => p.life > 0.05);
        const particleRate = state === 'speaking' ? 0.3 : 
                             state === 'listening' ? 0.2 : 
                             state === 'processing' ? 0.1 : 0.05;
        
        if (Math.random() < particleRate) {
          setParticleId(prevId => prevId + 1);
          filtered.push(createParticle());
        }
        
        return filtered.map(p => ({
          ...p,
          x: p.x + p.velocity.x,
          y: p.y + p.velocity.y,
          life: p.life - 0.016,
          opacity: p.opacity * 0.99
        }));
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    animationRef.current = rafId;
    
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    };
  }, [state, getDynamicColors, particleId]);

  const colors = getDynamicColors();
  const amplitude = Math.max(0.3, audioLevel * 2);

  return (
    <div className="voice-animation-container">
      <svg
        width="100vw"
        height="100vh"
        viewBox="0 0 1920 1080"
        className="voice-animation-svg"
        preserveAspectRatio="xMidYMid slice"
        style={{
          perspective: '1000px',
          transformStyle: 'preserve-3d'
        }}
      >
        <defs>
          {/* Dynamic gradients based on state */}
          <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors[0]} />
            <stop offset="50%" stopColor={colors[1]} />
            <stop offset="100%" stopColor={colors[2]} />
          </linearGradient>
          
          <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors[2]} />
            <stop offset="50%" stopColor={colors[0]} />
            <stop offset="100%" stopColor={colors[1]} />
          </linearGradient>
          
          <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors[1]} />
            <stop offset="50%" stopColor={colors[2]} />
            <stop offset="100%" stopColor={colors[0]} />
          </linearGradient>

          {/* Enhanced glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* 3D depth filter */}
          <filter id="depth">
            <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="rgba(0,0,0,0.3)"/>
          </filter>

          {/* Particle glow */}
          <filter id="particleGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Background depth layer - faint multiple copies for parallax */}
        <g style={{ transform: 'translateZ(-100px)' }}>
          <path
            d={generateWavePath(0, amplitude * 0.2)}
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="1"
          />
          <path
            d={generateWavePath(0, amplitude * 0.25)}
            fill="none"
            stroke="rgba(255,255,255,0.03)"
            strokeWidth="1"
            style={{ transform: 'translateY(10px)' }}
          />
          <path
            d={generateWavePath(0, amplitude * 0.3)}
            fill="none"
            stroke="rgba(255,255,255,0.02)"
            strokeWidth="1"
            style={{ transform: 'translateY(-10px)' }}
          />
        </g>

        {/* Main wave layers with 3D depth */}
        <g style={{ transform: 'translateZ(0px)' }}>
          <path
            className={`wave wave-1 wave-${state}`}
            d={generateWavePath(1, amplitude)}
            fill="none"
            stroke="url(#gradient1)"
            strokeWidth="8"
            filter="url(#glow)"
            style={{
              transform: 'translateZ(20px)',
              transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
        </g>

        <g style={{ transform: 'translateZ(40px)' }}>
          <path
            className={`wave wave-2 wave-${state}`}
            d={generateWavePath(2, amplitude * 0.8)}
            fill="none"
            stroke="url(#gradient2)"
            strokeWidth="6"
            filter="url(#glow)"
            style={{
              transform: 'translateZ(40px)',
              transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
        </g>

        <g style={{ transform: 'translateZ(60px)' }}>
          <path
            className={`wave wave-3 wave-${state}`}
            d={generateWavePath(3, amplitude * 0.6)}
            fill="none"
            stroke="url(#gradient3)"
            strokeWidth="4"
            filter="url(#glow)"
            style={{
              transform: 'translateZ(60px)',
              transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
        </g>

        {/* Additional flowing lines for complexity */}
        <g style={{ transform: 'translateZ(80px)' }}>
          <path
            className={`wave wave-4 wave-${state}`}
            d={generateWavePath(4, amplitude * 0.4)}
            fill="none"
            stroke="url(#gradient1)"
            strokeWidth="3"
            opacity="0.7"
            filter="url(#glow)"
            style={{
              transform: 'translateZ(80px)',
              transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
        </g>

        {/* Particle system */}
        <g style={{ transform: 'translateZ(100px)' }}>
          {particles.map(particle => (
            <Particle
              key={particle.id}
              x={particle.x}
              y={particle.y}
              size={particle.size}
              color={particle.color}
              opacity={particle.opacity}
              velocity={particle.velocity}
              life={particle.life}
            />
          ))}
        </g>

        {/* Foreground accent waves */}
        <g style={{ transform: 'translateZ(120px)' }}>
          <path
            className={`wave wave-5 wave-${state}`}
            d={generateWavePath(5, amplitude * 0.3)}
            fill="none"
            stroke="url(#gradient2)"
            strokeWidth="2"
            opacity="0.6"
            filter="url(#glow)"
            style={{
              transform: 'translateZ(120px)',
              transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
        </g>
      </svg>
    </div>
  );
};

export const VoiceModePopup: React.FC<VoiceModePopupProps> = ({ isOpen, onClose }) => {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const voiceLevelRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const {
    isInitialized,
    isRecording,
    isSpeaking,
    startConversation,
    stopConversation
  } = useDeepgramVoiceAgent({
    onTranscript: () => {},
    onResponse: () => {}
  });

  // Real-time audio analysis
  useEffect(() => {
    if (voiceState === 'listening' && !audioContextRef.current) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          analyserRef.current = audioContextRef.current.createAnalyser();
          microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
          
          analyserRef.current.fftSize = 256;
          const bufferLength = analyserRef.current.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          
          microphoneRef.current.connect(analyserRef.current);
          
          const updateAudioLevel = () => {
            if (analyserRef.current && voiceState === 'listening') {
              analyserRef.current.getByteFrequencyData(dataArray);
              const average = dataArray.reduce((a, b) => a + b) / bufferLength;
              const normalizedLevel = average / 255;
              setAudioLevel(normalizedLevel);
              requestAnimationFrame(updateAudioLevel);
            }
          };
          
          updateAudioLevel();
        })
        .catch(err => {
          console.warn('Audio analysis not available:', err);
        });
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
        analyserRef.current = null;
        microphoneRef.current = null;
      }
    };
  }, [voiceState]);

  // Enhanced state management
  useEffect(() => {
    if (!isInitialized) {
      setVoiceState('initializing');
    } else if (isRecording) {
      setVoiceState('listening');
    } else if (isSpeaking) {
      setVoiceState('speaking');
    } else if (error) {
      setVoiceState('error');
    } else {
      setVoiceState('idle');
    }
  }, [isInitialized, isRecording, isSpeaking, error]);

  // Voice level simulation for visual feedback
  useEffect(() => {
    if (voiceState === 'listening') {
      const interval = setInterval(() => {
        const newLevel = Math.random() * 0.8 + 0.2;
        setVoiceLevel(newLevel);
        voiceLevelRef.current = newLevel;
      }, 100);
      return () => clearInterval(interval);
    } else {
      setVoiceLevel(0);
    }
  }, [voiceState]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (voiceState === 'idle' || voiceState === 'error') {
            handleStartConversation();
          } else if (voiceState === 'listening') {
            handleStopConversation();
          }
          break;
        case 'Escape':
          onClose();
          break;
        case 'm':
        case 'M':
          handleToggleMute();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, voiceState]);

  const handleStartConversation = async () => {
    if (!isInitialized) {
      setError('Voice agent not initialized. Please check your API key.');
      toast.error('Voice agent not initialized. Please check your API key.');
      return;
    }
    
    try {
      setError(null);
      setVoiceState('initializing');
      toast.info('Starting voice assistant...');
      await startConversation();
    } catch (error) {
      console.error('Failed to start conversation:', error);
      setError('Failed to start voice conversation');
      toast.error('Failed to start voice conversation');
      setVoiceState('error');
    }
  };

  const handleStopConversation = () => {
    stopConversation();
    setVoiceState('idle');
    toast.info('Voice conversation stopped');
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    toast.info(isMuted ? 'Voice unmuted' : 'Voice muted');
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setError(null);
    handleStartConversation();
  };

  if (!isOpen) return null;

  const popupContent = (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Close button - top right, glassmorphic, circular */}
      <div className="absolute top-8 right-8 z-[200]">
        <Tooltip text="Close Voice Mode (Esc)" position="bottom">
          <button
            onClick={onClose}
            style={{ ...glassBtnStyle, width: 56, height: 56, borderRadius: '50%', fontSize: 0, boxShadow: '0 4px 24px 0 rgba(0,0,0,0.25)' }}
            className="hover:scale-110 transition-transform"
            aria-label="Close"
          >
            <X size={32} />
          </button>
        </Tooltip>
      </div>

      {/* Error state - center screen */}
      {voiceState === 'error' && (
        <div className="absolute inset-0 z-[150] flex items-center justify-center">
          <div className="bg-black/80 backdrop-blur-sm rounded-2xl p-8 border border-red-500/30 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="text-red-400" size={24} />
              <h3 className="text-white text-lg font-semibold">Voice Mode Error</h3>
            </div>
            <p className="text-gray-300 mb-6">{error}</p>
            <div className="flex gap-3">
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <RotateCcw size={16} />
                Retry
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls - bottom center, glassmorphic, circular */}
      <div className="absolute bottom-12 left-0 right-0 z-[200] flex items-center justify-center gap-8">
        <Tooltip text={voiceState === 'listening' ? "Stop Listening (Space)" : "Start Listening (Space)"} position="top">
          <button
            onClick={voiceState === 'listening' ? handleStopConversation : handleStartConversation}
            disabled={voiceState === 'initializing' || voiceState === 'processing'}
            style={{
              ...glassBtnStyle,
              width: 72,
              height: 72,
              borderRadius: '50%',
              fontSize: 0,
              boxShadow: voiceState === 'listening'
                ? '0 0 24px 4px rgba(255,0,80,0.25), 0 4px 24px 0 rgba(0,0,0,0.18)'
                : '0 0 24px 4px rgba(168,85,247,0.18), 0 4px 24px 0 rgba(0,0,0,0.18)',
              background: voiceState === 'listening'
                ? 'rgba(255,0,80,0.18)' : 'rgba(168,85,247,0.12)',
              border: voiceState === 'listening'
                ? '2px solid #ff006e' : '1.5px solid rgba(255,255,255,0.18)',
              color: voiceState === 'listening' ? '#ff006e' : 'white',
              transition: 'all 0.2s',
              opacity: (voiceState === 'initializing' || voiceState === 'processing') ? 0.5 : 1,
            }}
            className="hover:scale-110 transition-transform disabled:cursor-not-allowed disabled:hover:scale-100"
            aria-label={voiceState === 'listening' ? 'Stop Listening' : 'Start Listening'}
          >
            {voiceState === 'listening' ? <MicOff size={36} /> : <Mic size={36} />}
          </button>
        </Tooltip>
        
        <Tooltip text={isMuted ? "Unmute (M)" : "Mute (M)"} position="top">
          <button
            onClick={handleToggleMute}
            style={{
              ...glassBtnStyle,
              width: 56,
              height: 56,
              borderRadius: '50%',
              fontSize: 0,
              color: isMuted ? '#ff006e' : 'white',
              border: isMuted ? '2px solid #ff006e' : '1.5px solid rgba(255,255,255,0.18)',
              boxShadow: isMuted
                ? '0 0 16px 2px rgba(255,0,80,0.18), 0 4px 24px 0 rgba(0,0,0,0.18)'
                : '0 4px 24px 0 rgba(0,0,0,0.18)',
              background: isMuted ? 'rgba(255,0,80,0.10)' : 'rgba(255,255,255,0.08)',
              transition: 'all 0.2s',
            }}
            className="hover:scale-110 transition-transform"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={28} /> : <Volume2 size={28} />}
          </button>
        </Tooltip>
      </div>

      {/* Status indicator - top center */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[200]">
        <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
          <span className="text-white text-sm font-medium">
            {voiceState === 'idle' && 'Ready to listen'}
            {voiceState === 'initializing' && 'Initializing...'}
            {voiceState === 'listening' && 'Listening...'}
            {voiceState === 'processing' && 'Processing...'}
            {voiceState === 'speaking' && 'Speaking...'}
            {voiceState === 'error' && 'Error occurred'}
          </span>
        </div>
      </div>

      <VoiceInteractionAnimation 
        state={voiceState} 
        voiceLevel={voiceLevel} 
        audioLevel={audioLevel}
      />
    </div>
  );

  if (typeof window !== 'undefined') {
    return ReactDOM.createPortal(popupContent, document.body);
  }
  return null;
}; 