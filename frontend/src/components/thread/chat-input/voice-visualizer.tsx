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
        startConversation,
        stopConversation
    } = useDeepgramVoiceAgent({
        onTranscript: (text) => {
            console.log('Transcript:', text);
        },
        onResponse: (text) => {
            console.log('Response:', text);
        }
    });

    // Enhanced status checking
    const isVoiceActive = isRecording || isSpeaking;
    const shouldShowActiveState = isActive || localIsActive || isVoiceActive;

    // Animate the bars when active
    useEffect(() => {
        if (!shouldShowActiveState) return;

        const animate = () => {
            setAnimationFrame(prev => (prev + 1) % 120);
            requestAnimationFrame(animate);
        };

        const animationId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationId);
    }, [shouldShowActiveState]);

    // Generate dynamic heights for the bars
    const getBarHeight = (index: number) => {
        if (!shouldShowActiveState) {
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

        // Open the voice mode popup
        setIsPopupOpen(true);
    };

    const handleClosePopup = async () => {
        console.log('Voice popup closing, stopping conversation...');
        setIsPopupOpen(false);
        
        // Stop any ongoing conversation when closing
        if (isRecording || isSpeaking) {
            try {
                await stopConversation();
                console.log('Voice conversation stopped from visualizer');
            } catch (error) {
                console.warn('Error stopping voice conversation:', error);
            }
        }
        
        // Reset local state
        setLocalIsActive(false);
        setThreadId(null);
        setAgentRunId(null);
        setMessages([]);
        setInputValue('');
        setAgentStatus('idle');
        setSaveStatus('idle');
        setIsSubmitting(false);
        setHasStartedConversation(false);
    };

    const isCurrentlyActive = shouldShowActiveState;

    return (
        <>
            <Button
                type="button"
                size="icon"
                className={cn(
                    'w-10 h-10 rounded-[10px] z-20 flex cursor-pointer items-center justify-center bg-black hover:bg-gray-900 border border-gray-800 transition-all duration-200',
                    isCurrentlyActive && 'bg-gray-900 border-gray-700 hover:bg-gray-800',
                    disabled && 'opacity-50 cursor-not-allowed'
                )}
                disabled={disabled}
                onClick={handleClick}
                title={isCurrentlyActive ? 'Click to stop voice assistant' : 'Click to start voice assistant'}
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