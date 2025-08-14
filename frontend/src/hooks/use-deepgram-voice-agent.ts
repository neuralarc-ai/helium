import { useState, useEffect, useRef } from 'react';
import { DeepgramVoiceAgent } from '@/lib/deepgram-voice-agent';
import { toast } from 'sonner';

interface UseDeepgramVoiceAgentProps {
  onTranscript?: (text: string) => void;
  onResponse?: (text: string) => void;
}

export const useDeepgramVoiceAgent = ({
  onTranscript,
  onResponse
}: UseDeepgramVoiceAgentProps = {}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const voiceAgentRef = useRef<DeepgramVoiceAgent | null>(null);

  // Initialize the voice agent
  useEffect(() => {
    const initializeAgent = async () => {
      console.log('Initializing Deepgram Voice Agent...');
      
      // Check if API key is available
      const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
      if (!apiKey) {
        console.error('NEXT_PUBLIC_DEEPGRAM_API_KEY not found in environment variables');
        toast.error('Deepgram API key not found. Please add NEXT_PUBLIC_DEEPGRAM_API_KEY to your .env.local file');
        setIsInitialized(false);
        return;
      }

      console.log('API key found, creating voice agent...');
      
      voiceAgentRef.current = new DeepgramVoiceAgent({
        model: 'nova-3',
        language: 'en-US',
        voice: 'aura-asteria'
      });

      const success = await voiceAgentRef.current.initialize();
      console.log('Voice agent initialization result:', success);
      setIsInitialized(success);
      
      if (!success) {
        toast.error('Failed to initialize voice agent. Check console for details.');
      }
    };

    initializeAgent();
  }, []);

  // Start conversation
  const startConversation = async () => {
    if (!voiceAgentRef.current || !isInitialized) {
      toast.error('Voice agent not initialized');
      return;
    }

    try {
      setIsRecording(true);
      setTranscript('');
      setResponse('');

      await voiceAgentRef.current.startConversation(
        (text: string) => {
          setTranscript(text);
          onTranscript?.(text);
        },
        (text: string) => {
          setResponse(text);
          onResponse?.(text);
        }
      );
    } catch (error) {
      console.error('Failed to start conversation:', error);
      toast.error('Failed to start conversation');
      setIsRecording(false);
    }
  };

  // Stop conversation
  const stopConversation = async () => {
    if (voiceAgentRef.current) {
      try {
        await voiceAgentRef.current.stopConversation();
        setIsRecording(false);
        setIsSpeaking(false);
        console.log('Conversation stopped successfully');
      } catch (error) {
        console.error('Error stopping conversation:', error);
        // Still reset state even if there's an error
        setIsRecording(false);
        setIsSpeaking(false);
      }
    }
  };

  // Check if currently recording
  const isCurrentlyRecording = () => {
    return voiceAgentRef.current?.isCurrentlyRecording() || false;
  };

  // Check if currently speaking
  const isCurrentlySpeaking = () => {
    return voiceAgentRef.current?.isCurrentlySpeaking() || false;
  };

  // Update speaking state
  useEffect(() => {
    const checkSpeakingState = () => {
      setIsSpeaking(isCurrentlySpeaking());
    };

    const interval = setInterval(checkSpeakingState, 100);
    return () => clearInterval(interval);
  }, []);

  return {
    isInitialized,
    isRecording,
    isSpeaking,
    transcript,
    response,
    startConversation,
    stopConversation,
    isCurrentlyRecording,
    isCurrentlySpeaking
  };
}; 