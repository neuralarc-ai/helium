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
  const [state, setState] = useState<'idle' | 'recording' | 'processing'>('idle');
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { spokenLanguageCode } = useSpokenLanguage();
  const lastFinalTranscript = useRef('');
  const lastUpdateTime = useRef(0);
  const updateQueue = useRef<{transcript: string; isFinal: boolean}[]>([]);
  const isProcessing = useRef(false);

  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      if (transcript && transcript !== lastFinalTranscript.current) {
        lastFinalTranscript.current = transcript;
        setFinalTranscript(transcript);
        onTranscription(transcript);
      }
      setInterimTranscript('');
    } else {
      setInterimTranscript(transcript);
      // Only update if this is new information
      if (transcript && !lastFinalTranscript.current.endsWith(transcript)) {
        onTranscription(transcript);
      }
    }
    
    lastUpdateTime.current = now;
    isProcessing.current = false;
    
    // Process next in queue if available
    if (updateQueue.current.length > 0) {
      requestAnimationFrame(processQueue);
    }
  };

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in your browser');
      return;
    }

    // Create new recognition instance with current language
    recognitionRef.current = new SpeechRecognition() as VoiceRecognition;
    recognitionRef.current.lang = spokenLanguageCode;
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.maxAlternatives = 1;
    
    // @ts-ignore - experimental feature for faster response
    recognitionRef.current.continuous = true;

    recognitionRef.current.onspeechstart = () => {
      setIsSpeaking(true);
    };

    recognitionRef.current.onspeechend = () => {
      setIsSpeaking(false);
    };

    let silenceTimer: NodeJS.Timeout;
    
    recognitionRef.current.onresult = (event: VoiceRecognitionEvent) => {
      const result = event.results[event.resultIndex];
      if (!result || !result[0]) return;
      
      const transcript = result[0].transcript.trim();
      
      // Clear any existing silence timer for final results
      if (result.isFinal) {
        if (silenceTimer) clearTimeout(silenceTimer);
      }
      
      // Add to queue for processing
      updateQueue.current.push({
        transcript,
        isFinal: result.isFinal
      });
      
      // Process queue if not already processing
      if (!isProcessing.current) {
        requestAnimationFrame(processQueue);
      }
      
      // Set a timer to detect end of speech
      if (!result.isFinal) {
        if (silenceTimer) clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => {
          if (transcript) {
            updateQueue.current.push({
              transcript,
              isFinal: true
            });
            if (!isProcessing.current) {
              requestAnimationFrame(processQueue);
            }
          }
        }, 300); // Shorter delay for more responsive feel
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setError(`Error: ${event.error}`);
      stopRecording();
    };

    recognitionRef.current.onend = () => {
      if (state === 'recording') {
        console.log('Speech recognition ended, restarting...');
        try {
          recognitionRef.current?.start();
        } catch (e) {
          console.error('Error restarting speech recognition:', e);
          setError('Error with voice recognition. Please try again.');
          stopRecording();
        }
      }
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscription, state, finalTranscript]);

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
      setFinalTranscript('');
      setInterimTranscript('');
      lastFinalTranscript.current = '';
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

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

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
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Could not access microphone. Please ensure you have granted microphone permissions.');
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

    // Clear recording timeout
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }

    // If there's any remaining interim text, finalize it
    if (interimTranscript) {
      const combinedTranscript = finalTranscript + ' ' + interimTranscript;
      setFinalTranscript(combinedTranscript);
      onTranscription(combinedTranscript.trim());
      setInterimTranscript('');
    }

    setState('idle');
    setVolume(0);
  };

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isTimerRunning) {
      interval = setInterval(() => {
        setRecordingTime(prevTime => prevTime + 1);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  // Handle language changes
  useEffect(() => {
    if (recognitionRef.current && state === 'recording') {
      // If we're currently recording and the language changes,
      // we need to restart the recognition with the new language
      const wasRecording = state === 'recording';
      if (wasRecording) {
        stopRecording();
        // Small delay to ensure recognition is properly stopped before restarting
        setTimeout(() => {
          startRecording();
        }, 100);
      }
    } else if (recognitionRef.current) {
      // Just update the language if we're not currently recording
      recognitionRef.current.lang = spokenLanguageCode;
    }
  }, [spokenLanguageCode]);

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
              disabled={disabled || state === 'processing' || !!error}
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