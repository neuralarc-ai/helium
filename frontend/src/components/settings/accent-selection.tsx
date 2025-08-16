import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown } from 'lucide-react';

interface AccentProfile {
  id: string;
  name: string;
  languageCode: string;
  model?: string;
  boostWords?: string[];
  phonemes?: Record<string, string[]>;
}

interface AccentSelectionProps {
  selectedLanguageCode: string;
  onAccentChange: (accent: AccentProfile) => void;
  className?: string;
}

// Common accents with language mappings
const COMMON_ACCENTS: AccentProfile[] = [
  // English Accents
  { id: 'en-US', name: 'English (US)', languageCode: 'en-US' },
  { id: 'en-GB', name: 'English (UK)', languageCode: '-en-GB' },
  { id: 'en-AU', name: 'English (Australia)', languageCode: 'en-AU' },
  { id: 'en-IN', name: 'English (India)', languageCode: 'en-IN' },
  
  // Spanish Accents
  { id: 'es-ES', name: 'Spanish (Spain)', languageCode: 'es-ES' },
  { id: 'es-MX', name: 'Spanish (Mexico)', languageCode: 'es-MX' },
  
  // French Accents
  { id: 'fr-FR', name: 'French (France)', languageCode: 'fr-FR' },
  { id: 'fr-CA', name: 'French (Canada)', languageCode: 'fr-CA' },
];

export const AccentSelection: React.FC<AccentSelectionProps> = ({
  selectedLanguageCode,
  onAccentChange,
  className,
}) => {
  const [availableAccents, setAvailableAccents] = useState<AccentProfile[]>([]);
  const [selectedAccent, setSelectedAccent] = useState<AccentProfile | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Update available accents when language changes
  useEffect(() => {
    const baseLanguage = selectedLanguageCode.split('-')[0];
    const accents = COMMON_ACCENTS.filter(
      accent => accent.languageCode.startsWith(baseLanguage)
    );
    
    // Only update if accents have actually changed
    if (JSON.stringify(accents) !== JSON.stringify(availableAccents)) {
      setAvailableAccents(accents);
      
      // Only update selected accent if it's not set or doesn't match the new language
      const currentAccentValid = selectedAccent && 
        accents.some(a => a.id === selectedAccent.id);
        
      if (!currentAccentValid && accents.length > 0) {
        setSelectedAccent(accents[0]);
        onAccentChange(accents[0]);
      } else if (!currentAccentValid && accents.length === 0) {
        const defaultAccent = {
          id: selectedLanguageCode,
          name: `Standard ${selectedLanguageCode}`,
          languageCode: selectedLanguageCode
        };
        setSelectedAccent(defaultAccent);
        onAccentChange(defaultAccent);
      }
    }
  }, [selectedLanguageCode, onAccentChange, availableAccents, selectedAccent]);

  // Don't show if there's only one option or none
  const shouldShow = availableAccents.length > 1;
  if (!shouldShow) return null;

  return (
    <div className={`relative mt-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="text-green-600 dark:text-green-400"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" x2="12" y1="19" y2="22"></line>
            </svg>
          </div>
          <span className="text-sm font-medium text-foreground/90">Accent</span>
        </div>
        
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="gap-2 pr-2 h-9 border-2 border-border/50 hover:border-green-500/50 bg-background/80 backdrop-blur-sm"
          >
            <span className="font-medium">
              {selectedAccent?.name.split('(')[0].trim() || 'Select Accent'}
            </span>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
          
          {isOpen && (
            <div 
              className="absolute right-0 mt-1 w-48 bg-background border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
              onMouseLeave={() => setIsOpen(false)}
            >
              <div className="p-1">
                {availableAccents.map((accent) => (
                  <div
                    key={accent.id}
                    className={`px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-accent ${
                      selectedAccent?.id === accent.id ? 'bg-accent font-medium' : ''
                    }`}
                    onClick={() => {
                      setSelectedAccent(accent);
                      onAccentChange(accent);
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span>{accent.name}</span>
                      {selectedAccent?.id === accent.id && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2 ml-11">
        Select your preferred accent for better speech recognition
      </p>
    </div>
  );
};
