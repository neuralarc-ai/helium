import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSpokenLanguage } from '@/contexts/SpokenLanguageContext';

// Add TypeScript declarations for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
  item(index: number): SpeechRecognitionAlternative;
  length: number;
}

interface VoiceRecognitionEvent extends Event {
  resultIndex: number;
  results: {
    [index: number]: SpeechRecognitionResult;
    item(index: number): SpeechRecognitionResult;
    length: number;
  };
}

interface VoiceRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: VoiceRecognitionEvent) => void;
  onerror: (event: Event) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

const MAX_RECORDING_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onTranscription,
  disabled = false,
  className,
}) => {
  const { spokenLanguageCode } = useSpokenLanguage();
  const [state, setState] = useState<'idle' | 'recording' | 'processing'>('idle');
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const lastFinalTranscript = useRef('');
  const lastUpdateTime = useRef(0);
  const updateQueue = useRef<{transcript: string; isFinal: boolean}[]>([]);
  const isProcessing = useRef(false);
  // Keep a ref of state to avoid stale closures in event handlers
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const deviceChangeHandlerRef = useRef<((this: MediaDevices, ev: Event) => any) | null>(null);

  // Process queue function to handle speech recognition results
  const processQueue = () => {
    if (updateQueue.current.length === 0 || isProcessing.current) return;
    
    const now = Date.now();
    if (now - lastUpdateTime.current < 50) { // Throttle to ~20fps for smoothness
      requestAnimationFrame(processQueue);
      return;
    }
    
    isProcessing.current = true;
    const { transcript, isFinal } = updateQueue.current.shift()!;
    
    if (isFinal) {
      // For final results, update the final transcript and keep it in the chat
      if (transcript && transcript !== lastFinalTranscript.current) {
        const updatedTranscript = finalTranscript 
          ? `${finalTranscript} ${transcript}`
          : transcript;
          
        lastFinalTranscript.current = updatedTranscript;
        setFinalTranscript(updatedTranscript);
        onTranscription(updatedTranscript);
      }
      // Don't clear interim transcript on final result to maintain context
    } else {
      // For interim results, update the display but keep the final transcript
      const fullTranscript = finalTranscript 
        ? `${finalTranscript} ${transcript}`
        : transcript;
        
      setInterimTranscript(fullTranscript);
      onTranscription(fullTranscript);
    }
    
    lastUpdateTime.current = now;
    isProcessing.current = false;
    
    // Process next in queue if available
    if (updateQueue.current.length > 0) {
      requestAnimationFrame(processQueue);
    }
  };

  // Initialize speech recognition (once)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in your browser');
      return;
    }

    // Create new recognition instance with current language
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.maxAlternatives = 1;
    
    // Set the language based on the selected spoken language
    recognitionRef.current.lang = spokenLanguageCode || 'en-US';
    
    // @ts-ignore - experimental feature for faster response
    recognitionRef.current.continuous = true;

    recognitionRef.current.onspeechstart = () => {
      setIsSpeaking(true);
    };

    recognitionRef.current.onspeechend = () => {
      setIsSpeaking(false);
    };

    recognitionRef.current.onresult = (event: VoiceRecognitionEvent) => {
      const result = event.results[event.resultIndex];
      if (!result || !result[0]) return;
      
      const transcript = result[0].transcript.trim();
      
      // Add to queue for processing
      updateQueue.current.push({
        transcript,
        isFinal: result.isFinal
      });
      
      // Process queue if not already processing
      if (!isProcessing.current) {
        requestAnimationFrame(processQueue);
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      const err = (event && (event.error || event.name)) || 'unknown';
      console.error('Speech recognition error', err, event);
      // Handle recoverable vs fatal errors
      const recoverableErrors = new Set(['no-speech', 'aborted', 'network', 'service-not-allowed', 'invalid-state']);
      const permissionErrors = new Set(['not-allowed', 'audio-capture']);

      if (permissionErrors.has(err)) {
        // Permission denied or no mic available
        setError(
          err === 'audio-capture'
            ? 'No microphone found. Please connect a microphone and try again.'
            : 'Microphone access denied. Please grant permission in your browser settings and retry.'
        );
        stopRecording();
        return;
      }

      if (recoverableErrors.has(err)) {
        // Attempt to auto-recover if we are still recording
        if (stateRef.current === 'recording') {
          try {
            recognitionRef.current?.stop();
          } catch {}
          setTimeout(() => {
            try {
              if (stateRef.current === 'recording') recognitionRef.current?.start();
            } catch (e) {
              console.error('Failed to recover recognition after error:', e);
            }
          }, 150);
        }
        return;
      }

      // Unknown error: show message but don't permanently disable retry
      setError('Speech recognition error. Try again.');
      // Do not call stopRecording() here to avoid tearing down mic unnecessarily
    };

    recognitionRef.current.onend = () => {
      if (stateRef.current === 'recording') {
        console.log('Speech recognition ended, restarting...');
        // Add a small delay before restarting to prevent rapid restarts
        setTimeout(() => {
          if (stateRef.current === 'recording' && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.error('Error restarting speech recognition:', e);
              // Only show error if we're still supposed to be recording
              if (stateRef.current === 'recording') {
                setError('Error with voice recognition. Please try again.');
                stopRecording();
              }
            }
          }
        }, 300);
      }
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Handle volume visualization
  const analyzeVolume = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;

    // Normalize to 0-1 range and smooth the transition
    setVolume((prevVolume) => {
      const targetVolume = average / 255;
      return prevVolume * 0.7 + targetVolume * 0.3;
    });

    animationFrameRef.current = requestAnimationFrame(analyzeVolume);
  };

  const startRecording = async () => {
    if (state !== 'idle') return;

    try {
      setState('recording');
      setError(null);
      setRecordingTime(0);
      // Don't clear final transcript when starting a new recording
      // to maintain conversation history
      setInterimTranscript('');
      lastFinalTranscript.current = finalTranscript || '';
      updateQueue.current = [];
      isProcessing.current = false;
      lastUpdateTime.current = 0;
      setIsTimerRunning(true);
      
      // Request animation frame for smooth updates
      requestAnimationFrame(processQueue);
      
      // Clear any previous recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log('No active recognition to stop');
        }
      }

      // Ensure secure context (required by most browsers for mic access)
      const isLocalhost = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
      if (typeof window !== 'undefined' && !window.isSecureContext && !isLocalhost) {
        throw Object.assign(new Error('Microphone requires HTTPS. Open the app over https:// or use localhost.'), { name: 'SecurityError' });
      }

      // Check Permissions API (best-effort, not supported everywhere)
      if (typeof navigator !== 'undefined' && (navigator as any).permissions?.query) {
        try {
          const status = await (navigator as any).permissions.query({ name: 'microphone' as any });
          if (status.state === 'denied') {
            throw Object.assign(new Error('Microphone permission is denied. Please enable it in site settings and retry.'), { name: 'NotAllowedError' });
          }
        } catch {
          // Ignore permissions API errors; we'll fallback to getUserMedia prompt
        }
      }

      // Request microphone access (will prompt if needed)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      // If the audio input device goes away (USB unplug, OS revoke), try to recover
      const [track] = stream.getAudioTracks();
      if (track) {
        track.onended = async () => {
          console.warn('Microphone track ended; attempting to re-acquire...');
          if (stateRef.current !== 'recording') return;
          try {
            // Tear down current audio context resources
            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current);
              animationFrameRef.current = null;
            }
            if (audioContextRef.current) {
              await audioContextRef.current.close();
              audioContextRef.current = null;
            }
            // Get a fresh stream
            const newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = newStream;
            const newTrack = newStream.getAudioTracks()[0];
            if (newTrack) {
              newTrack.onended = track.onended as any;
            }
            // Recreate audio nodes
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioContext;
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 32;
            analyserRef.current = analyser;
            const source = audioContext.createMediaStreamSource(newStream);
            source.connect(analyser);
            animationFrameRef.current = requestAnimationFrame(analyzeVolume);
            // Ensure recognition is running
            try {
              recognitionRef.current?.stop();
            } catch {}
            setTimeout(() => {
              try { if (stateRef.current === 'recording') recognitionRef.current?.start(); } catch {}
            }, 100);
          } catch (e) {
            console.error('Failed to re-acquire microphone:', e);
            setError('Lost access to the microphone. Please check your device and try again.');
            stopRecording();
          }
        };
      }

      // Set up audio context for volume visualization
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 32;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // Start volume analysis
      animationFrameRef.current = requestAnimationFrame(analyzeVolume);

      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }

          // Removed auto-stop to keep mic on until user stops it
      // Recording can be manually stopped by the user

      // Listen for device changes (e.g., mic unplugged/replugged) and try to recover
      if (navigator.mediaDevices && 'addEventListener' in navigator.mediaDevices) {
        const handler = async () => {
          if (stateRef.current !== 'recording') return;
          console.warn('Media devices changed; attempting to re-acquire microphone...');
          try {
            const newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Replace current stream
            if (mediaStreamRef.current) {
              mediaStreamRef.current.getTracks().forEach(t => t.stop());
            }
            mediaStreamRef.current = newStream;
            const newTrack = newStream.getAudioTracks()[0];
            if (newTrack) {
              // Reuse the same onended logic as above
              newTrack.onended = (mediaStreamRef.current?.getAudioTracks()[0]?.onended || null) as any;
            }
            // Rebuild audio graph
            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current);
              animationFrameRef.current = null;
            }
            if (audioContextRef.current) {
              await audioContextRef.current.close();
              audioContextRef.current = null;
            }
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioContext;
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 32;
            analyserRef.current = analyser;
            const source = audioContext.createMediaStreamSource(newStream);
            source.connect(analyser);
            animationFrameRef.current = requestAnimationFrame(analyzeVolume);
            // Ensure recognition runs
            try { recognitionRef.current?.stop(); } catch {}
            setTimeout(() => { try { if (stateRef.current === 'recording') recognitionRef.current?.start(); } catch {} }, 150);
          } catch (e) {
            console.error('Failed to re-acquire mic after devicechange:', e);
          }
        };
        deviceChangeHandlerRef.current = handler as any;
        navigator.mediaDevices.addEventListener('devicechange', handler);
      }
    } catch (err: any) {
      const name = err?.name || 'Error';
      console.error('Error accessing microphone:', name, err);
      let message = 'Could not access microphone. Please ensure you have granted microphone permissions.';
      if (name === 'NotAllowedError') {
        message = 'Microphone access denied. Click the mic icon again after allowing access in your browser.';
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        message = 'No microphone found. Please connect a microphone and try again.';
      } else if (name === 'SecurityError') {
        message = 'Microphone requires a secure context (HTTPS) or localhost. Open the app over https:// or use localhost and try again.';
      } else if (name === 'NotReadableError') {
        message = 'Microphone is in use by another application. Close other apps using the mic and try again.';
      }
      setError(message);
      setState('idle');
    }
  };

  const stopRecording = () => {
    if (state !== 'recording') return;

    console.log('Stopping recording...');
    setState('processing');
    setIsTimerRunning(false);

    // Stop all media tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // Stop audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Clear animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Remove devicechange listener
    if (navigator.mediaDevices && deviceChangeHandlerRef.current && 'removeEventListener' in navigator.mediaDevices) {
      try { navigator.mediaDevices.removeEventListener('devicechange', deviceChangeHandlerRef.current); } catch {}
      deviceChangeHandlerRef.current = null;
    }

    // Clear recording timeout
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }

    // Finalize any remaining interim text
    if (interimTranscript) {
      const combinedTranscript = finalTranscript 
        ? `${finalTranscript} ${interimTranscript}`
        : interimTranscript;
      
      setFinalTranscript(combinedTranscript);
      onTranscription(combinedTranscript.trim());
      setInterimTranscript('');
    }

    // Reset state but don't clear the final transcript
    setState('idle');
    setVolume(0);
  };

  // Timer effect
  useEffect(() => {
    if (state === 'idle') return;
    
    let interval: NodeJS.Timeout;
    
    if (isTimerRunning) {
      interval = setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state, isTimerRunning]);
  
  // (Removed duplicate language-change effect)

  // Handle language changes (lightweight): update recognition language or restart recognition only,
  // without tearing down the microphone stream.
  useEffect(() => {
    if (recognitionRef.current) {
      if (state === 'recording') {
        try {
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current.lang = spokenLanguageCode || 'en-US';
        setTimeout(() => {
          try { if (state === 'recording') recognitionRef.current.start(); } catch {}
        }, 100);
      } else {
        recognitionRef.current.lang = spokenLanguageCode || 'en-US';
      }
    }
  }, [spokenLanguageCode, state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (navigator.mediaDevices && deviceChangeHandlerRef.current && 'removeEventListener' in navigator.mediaDevices) {
        try { navigator.mediaDevices.removeEventListener('devicechange', deviceChangeHandlerRef.current); } catch {}
        deviceChangeHandlerRef.current = null;
      }
      stopRecording();
    };
  }, []);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const getButtonVariant = () => {
    if (error) return 'destructive';
    return state === 'recording' ? 'default' : 'ghost';
  };

  const getIcon = () => {
    if (error) return <MicOff className="h-4 w-4" />;
    if (state === 'processing') return <Loader2 className="h-4 w-4 animate-spin" />;
    if (state === 'recording') {
      if (isSpeaking) {
        return (
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"></div>
            <div className="absolute inset-0 rounded-full bg-green-500/30"></div>
            <Mic className="h-4 w-4 relative text-green-600" />
          </div>
        );
      }
      return (
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-red-500/30"></div>
          <Mic className="h-4 w-4 relative text-red-600" />
        </div>
      );
    }
    return <Mic className="h-4 w-4" />;
  };

  const getTooltipContent = () => {
    if (error) return error;
    if (state === 'recording') {
      return isSpeaking ? 'Listening... Speak now' : 'Paused - click to stop';
    }
    if (state === 'processing') return 'Processing...';
    return 'Click to start voice input';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            {state === 'recording' && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="h-4 w-4 mr-1" />
                {formatTime(recordingTime)}
              </div>
            )}
            <Button
              type="button"
              variant={getButtonVariant()}
              size="sm"
              onClick={state === 'recording' ? stopRecording : startRecording}
              disabled={disabled || state === 'processing'}
              className={cn(
                'h-fit p-2 rounded-full aspect-square transition-all',
                state === 'recording' && 'bg-red-500 hover:bg-red-600 text-white',
                state === 'processing' && 'opacity-70 cursor-not-allowed',
                error && 'bg-destructive text-destructive-foreground',
                className
              )}
            >
              {getIcon()}
              {state === 'recording' && (
                <div
                  className="absolute inset-0 rounded-full bg-red-500/20"
                  style={{
                    transform: `scale(${1 + volume * 0.5})`,
                    opacity: volume,
                    transition: 'transform 0.1s, opacity 0.1s',
                  }}
                />
              )}
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-center">
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};