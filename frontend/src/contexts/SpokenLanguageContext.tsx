'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface SpokenLanguageContextType {
  spokenLanguage: string;
  setSpokenLanguage: (language: string) => void;
  spokenLanguageCode: string;
}

const SpokenLanguageContext = createContext<SpokenLanguageContextType | undefined>(undefined);

// Speech recognition language codes mapping from language name to speech recognition code
const spokenLanguageMap: { [key: string]: string } = {
  // English
  'English': 'en-US',
  'English (UK)': 'en-GB',
  
  // Asian languages
  'हिन्दी': 'hi-IN',  // Hindi
  '中文': 'zh-CN',     // Chinese
  '日本語': 'ja-JP',   // Japanese
  '한국어': 'ko-KR',   // Korean
  'বাংলা': 'bn-IN',   // Bengali
  'اردو': 'ur-PK',    // Urdu
  'Bahasa Melayu': 'ms-MY', // Malay
  
  // European languages
  'Español': 'es-ES', // Spanish
  'Français': 'fr-FR', // French
  'Deutsch': 'de-DE', // German
  'Italiano': 'it-IT', // Italian
  'Português': 'pt-PT', // Portuguese
  'Русский': 'ru-RU', // Russian
  
  // Middle Eastern languages
  'العربية': 'ar-SA', // Arabic
  
  // Add fallbacks for any potential missing mappings
  'English (US)': 'en-US',
  'English (United States)': 'en-US',
  'English (United Kingdom)': 'en-GB',
  'Chinese': 'zh-CN',
  'Chinese (Simplified)': 'zh-CN',
  '中文 (Chinese)': 'zh-CN',
  'Japanese': 'ja-JP',
  '日本語 (Japanese)': 'ja-JP',
  'Korean': 'ko-KR',
  '한국어 (Korean)': 'ko-KR',
  'Hindi': 'hi-IN',
  'हिन्दी (Hindi)': 'hi-IN',
  'Bengali': 'bn-IN',
  'বাংলা (Bengali)': 'bn-IN',
  'Urdu': 'ur-PK',
  'اردو (Urdu)': 'ur-PK',
  'Malay': 'ms-MY',
  'Bahasa Melayu (Malay)': 'ms-MY',
  'Spanish': 'es-ES',
  'Español (Spanish)': 'es-ES',
  'French': 'fr-FR',
  'Français (French)': 'fr-FR',
  'German': 'de-DE',
  'Deutsch (German)': 'de-DE',
  'Italian': 'it-IT',
  'Italiano (Italian)': 'it-IT',
  'Portuguese': 'pt-PT',
  'Português (Portuguese)': 'pt-PT',
  'Russian': 'ru-RU',
  'Русский (Russian)': 'ru-RU',
  'Arabic': 'ar-SA'
};

// Helper function to safely get language from localStorage
const getInitialLanguage = (): string => {
  if (typeof window === 'undefined') return 'English';
  const savedLanguage = localStorage.getItem('spokenLanguage');
  return savedLanguage || 'English';
};

export function SpokenLanguageProvider({ children }: { children: React.ReactNode }) {
  const [spokenLanguage, setSpokenLanguageState] = useState<string>(getInitialLanguage);

  // Keep localStorage in sync with state changes
  useEffect(() => {
    localStorage.setItem('spokenLanguage', spokenLanguage);
  }, [spokenLanguage]);

  const setSpokenLanguage = (language: string) => {
    // Allow any language to be set, but only if it's not empty
    if (language && language.trim() !== '') {
      setSpokenLanguageState(language);
    }
  };

  // Get the language code from the map, or use the language itself if not found
  const spokenLanguageCode = spokenLanguageMap[spokenLanguage] || spokenLanguage || 'en-US';

  return (
    <SpokenLanguageContext.Provider value={{
      spokenLanguage,
      setSpokenLanguage,
      spokenLanguageCode
    }}>
      {children}
    </SpokenLanguageContext.Provider>
  );
}

export function useSpokenLanguage() {
  const context = useContext(SpokenLanguageContext);
  if (context === undefined) {
    throw new Error('useSpokenLanguage must be used within a SpokenLanguageProvider');
  }
  return context;
}