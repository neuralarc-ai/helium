import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDeepgramVoiceAgent } from '@/hooks/use-deepgram-voice-agent';
import { toast } from 'sonner';
import { VoiceModePopup } from './voice-mode-popup';

interface VoiceVisualizerProps {
    disabled?: boolean;
    onClick?: () => void;
    isActive?: boolean;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
    disabled = false,
    onClick,
    isActive = false,
}) => {
    const [animationFrame, setAnimationFrame] = useState(0);
    const [localIsActive, setLocalIsActive] = useState(false);
    const [isPopupOpen, setIsPopupOpen] = useState(false);

    // Initialize Deepgram Voice Agent
    const {
        isInitialized,
        isRecording,
        isSpeaking,
        transcript,
        response,
        startConversation,
        stopConversation,
        continueListening
    } = useDeepgramVoiceAgent({
        onTranscript: (text) => {
            console.log('Transcript:', text);
        },
        onResponse: (text) => {
            console.log('Response:', text);
        }
    });

    // Animate the bars when active
    useEffect(() => {
        const shouldAnimate = isActive || localIsActive || isRecording || isSpeaking;
        
        if (!shouldAnimate) return;

        const animate = () => {
            setAnimationFrame(prev => (prev + 1) % 120);
            requestAnimationFrame(animate);
        };

        const animationId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationId);
    }, [isActive, localIsActive, isRecording, isSpeaking]);

    // Generate dynamic heights for the bars
    const getBarHeight = (index: number) => {
        const isCurrentlyActive = isActive || localIsActive || isRecording || isSpeaking;
        
        if (!isCurrentlyActive) {
            // Static symmetrical pattern: medium-shorter-shortest-shorter-medium
            return [9, 6, 3, 6, 9][index];
        }
        
        // Create animated wave pattern
        const time = animationFrame * 0.1;
        const wave = Math.sin(time + index * 0.6) * 0.5 + 0.5;
        const baseHeight = [9, 6, 3, 6, 9][index]; // Base symmetrical pattern
        const animatedHeight = Math.max(3, Math.floor(wave * 12));
        return Math.max(baseHeight, animatedHeight);
    };

    const handleClick = async () => {
        if (onClick) {
            onClick();
            return;
        }

        // If already recording, stop the conversation
        if (isRecording) {
            stopConversation();
            setLocalIsActive(false);
            return;
        }

        // If was previously recording but stopped, continue listening
        if (transcript && !isRecording && !isSpeaking) {
            continueListening();
            setLocalIsActive(true);
            return;
        }

        // Open the voice mode popup for new conversation
        setIsPopupOpen(true);
    };

    const handleClosePopup = () => {
        setIsPopupOpen(false);
        // Stop any ongoing conversation when closing
        if (isRecording || isSpeaking) {
            stopConversation();
            setLocalIsActive(false);
        }
    };

    const isCurrentlyActive = isActive || localIsActive || isRecording || isSpeaking;

    return (
        <>
            <Button
                type="button"
                size="icon"
                className={cn(
                    'w-10 h-10 rounded-[10px] z-20 flex cursor-pointer items-center justify-center bg-black hover:bg-gray-900 border border-gray-800 transition-all duration-200',
                    isCurrentlyActive && 'bg-gray-900 border-gray-700 hover:bg-gray-800',
                    transcript && !isRecording && !isSpeaking && 'bg-blue-600 border-blue-500 hover:bg-blue-700',
                    disabled && 'opacity-50 cursor-not-allowed'
                )}
                disabled={disabled}
                onClick={handleClick}
                title={
                    isRecording ? 'Click to stop voice assistant' : 
                    transcript && !isRecording && !isSpeaking ? 'Click to continue voice conversation' :
                    'Click to start voice assistant'
                }
            >
                <div className="w-5 h-5 flex items-center justify-center">
                    <div className="flex items-center justify-center space-x-0.5 h-5">
                        {[0, 1, 2, 3, 4].map((index) => (
                            <div
                                key={index}
                                className={cn(
                                    'w-0.5 rounded-full transition-all duration-150',
                                    'bg-white'
                                )}
                                style={{
                                    height: `${getBarHeight(index)}px`,
                                    animationDelay: `${index * 80}ms`
                                }}
                            />
                        ))}
                    </div>
                </div>
            </Button>

            {/* Voice Mode Popup */}
            <VoiceModePopup 
                isOpen={isPopupOpen} 
                onClose={handleClosePopup} 
            />
        </>
    );
}; 