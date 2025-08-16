'use client';

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';

type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja' | 'hi' | 'ms' | 'ar' | 'ru' | 'pt' | 'it' | 'bn' | 'ko' | 'ur' | 'en_GB';

// Define the shape of our translations
interface TranslationMap {
  [key: string]: string | TranslationMap;
}

// Define a type for all possible translation keys
type TranslationKey = string;

export const translations: Record<string, Record<string, string>> = {
  en: {
    // Language related translations
    'language.reset': 'Reset to English',
    'language.resetSuccess': 'Language reset to English',
    'language.resetFailed': 'Failed to reset language',
    'language.confirmReset': 'Are you sure you want to reset to English? This will change the interface language to English.',
    'language.confirmSave': 'Are you sure you want to save the current language settings?',
    'language.saved': 'Language settings saved successfully!',
    'language.updated': 'Language updated successfully!',
    'language.updateFailed': 'Failed to update language. Please try again.',
    'language.updating': 'Updating language...',
    'language.english': 'English',
    'language.hindi': 'हिन्दी',
    'language.language': 'Language',
    'language.settings': 'Language Settings',
    'language.interfaceLanguage': 'Interface Language',
    'language.chooseInterfaceLanguage': 'Choose your preferred language for the application interface',
    'language.spokenLanguage': 'Spoken Language',
    'language.chooseSpokenLanguage': 'Choose your preferred language for voice interactions',
    'language.changesSaved': 'Changes are saved automatically',
    'language.selectLanguage': 'Select Language',
    'language.title': 'Select Language',
    'language.description': 'Choose your preferred language for the application interface.',
    'language.label': 'Language',
    
    // Common UI translations
    'common.save': 'Save',
    'common.saving': 'Saving...',
    'common.loading': 'Loading...',
    'common.cancel': 'Cancel',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.confirm': 'Confirm',
    'common.close': 'Close',
    
    // Sidebar translations
    'sidebar.connectors': 'Connectors',
    'sidebar.settings': 'Settings',
    'sidebar.logout': 'Log Out',
    'sidebar.newChat': 'New chat',
    'sidebar.searchChats': 'Search chats',
    'sidebar.marketplace': 'Marketplace',
    'sidebar.agents': 'Agents',
    'sidebar.integrations': 'Integrations',
    
    // Profile translations
    'profile.edit': 'Edit',
    'profile.credits': 'Your team has used 80% of your credits. Need more?',
    'profile.neuralArc': 'Neural Arc Inc.',
    
    // Dashboard translations
    'dashboard.goodMorning': 'Good Morning!',
    'dashboard.goodAfternoon': 'Good Afternoon!',
    'dashboard.goodEvening': 'Good Evening!',
    'dashboard.placeholder': 'Assign tasks or ask anything.....',
    'settings.name': 'Name',
    'settings.saveChanges': 'Save Changes',
    'settings.editName': 'Edit your name',
    'settings.editNameDescription': 'This name will be displayed on your profile.',
    'settings.nameUpdated': 'Name updated!',
    'settings.failedToUpdate': 'Failed to update name.',
    'settings.menu.profile': 'Profile',
    'settings.menu.language': 'Language',
    'settings.menu.teams': 'Teams',
    'settings.menu.billing': 'Billing',
    'settings.menu.usageLogs': 'Usage Logs',
    'footer.poweredBy': 'Helium powered by Neural Arc Inc.',
    'footer.disclaimer': 'Disclaimer',
    'footer.termsOfUse': 'Terms of Use',
    'footer.responsibleAI': 'Responsible & Ethical AI Policies',
    'nav.newChat': 'New chat',
    'nav.searchChats': 'Search chats',
    'nav.agents': 'Agents',
    'nav.integrations': 'Integrations',
    'nav.noTasks': 'No tasks yet',
    'nav.searchPlaceholder': 'Search...',
    'nav.clear': 'Clear',
    'nav.searchResults': 'Search Results',
    'nav.recent': 'Recent',
    'nav.today': 'Today',
    'nav.yesterday': 'Yesterday',
    'nav.noResults': 'No results found',
    'nav.newChatButton': 'Start New Chat',
    'nav.searchButton': 'Search Chats',
    'nav.agentsButton': 'View Agents',
    'nav.integrationsButton': 'Manage Integrations',
  },
  // Other languages would follow the same structure as 'en'
  // For brevity, I'm showing just the English translations
  // You can add other languages (es, fr, de, etc.) from your original file
  es: {
    'sidebar.connectors': 'Conectores',
    'sidebar.settings': 'Configuración',
    'sidebar.logout': 'Cerrar Sesión',
    'sidebar.newChat': 'Nuevo chat',
    'sidebar.searchChats': 'Buscar chats',
    'sidebar.marketplace': 'Mercado',
    'sidebar.agents': 'Agentes',
    'sidebar.integrations': 'Integraciones',
    'profile.edit': 'Editar',
    'profile.credits': 'Tu equipo ha usado 80% de tus créditos. ¿Necesitas más?',
    'profile.neuralArc': 'Neural Arc Inc.',
    'language.title': 'Seleccionar Idioma',
    'language.description': 'Elige tu idioma preferido para la interfaz de la aplicación.',
    'language.label': 'Idioma',
    'language.save': 'Guardar',
    'common.loading': 'Cargando...',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.edit': 'Editar',
    'common.delete': 'Eliminar',
    'common.confirm': 'Confirmar',
    'common.close': 'Cerrar',
    'dashboard.goodMorning': '¡Buenos días!',
    'dashboard.goodAfternoon': '¡Buenas tardes!',
    'dashboard.goodEvening': '¡Buenas noches!',
    'dashboard.placeholder': 'Asigna tareas o pregunta cualquier cosa.....',
    'settings.name': 'Nombre',
    'settings.saveChanges': 'Guardar Cambios',
    'settings.editName': 'Editar tu nombre',
    'settings.editNameDescription': 'Este nombre se mostrará en tu perfil.',
    'settings.nameUpdated': '¡Nombre actualizado!',
    'settings.failedToUpdate': 'Error al actualizar el nombre.',
    'settings.menu.profile': 'Perfil',
    'settings.menu.language': 'Idioma',
    'settings.menu.teams': 'Equipos',
    'settings.menu.billing': 'Facturación',
    'settings.menu.usageLogs': 'Registros de uso',
    'footer.poweredBy': 'Helium impulsado por Neural Arc Inc.',
    'footer.disclaimer': 'Descargo de responsabilidad',
    'footer.termsOfUse': 'Términos de Uso',
    'footer.responsibleAI': 'Políticas de IA Responsable y Ética',
    'nav.newChat': 'Nuevo chat',
    'nav.searchChats': 'Buscar chats',
    'nav.agents': 'Agentes',
    'nav.integrations': 'Integraciones',
    'nav.noTasks': 'No hay tareas aún',
    'nav.searchPlaceholder': 'Buscar...',
    'nav.clear': 'Limpiar',
    'nav.searchResults': 'Resultados de búsqueda',
    'nav.recent': 'Reciente',
    'nav.today': 'Hoy',
    'nav.yesterday': 'Ayer',
    'nav.noResults': 'No se encontraron resultados',
    'nav.newChatButton': 'Iniciar nuevo chat',
    'nav.searchButton': 'Buscar chats',
    'nav.agentsButton': 'Ver agentes',
    'nav.integrationsButton': 'Gestionar integraciones',
  },
  // Add other languages here following the same pattern
} as const;

// Type for the translation function
type TranslateFunction = (key: TranslationKey, params?: Record<string, string | number>) => string;

// Context type for i18n
interface I18nContextType {
  t: TranslateFunction;
  currentLanguage: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  availableLanguages: { code: LanguageCode; name: string }[];
}

// Available languages with their display names
const availableLanguages: { code: LanguageCode; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ar', name: 'العربية' },
  { code: 'ru', name: 'Русский' },
  { code: 'pt', name: 'Português' },
  { code: 'it', name: 'Italiano' },
  { code: 'ko', name: '한국어' },
  { code: 'ur', name: 'اردو' },
  { code: 'bn', name: 'বাংলা' },
  { code: 'ms', name: 'Bahasa Melayu' },
  { code: 'en_GB', name: 'English (UK)' },
];

// Default language
const DEFAULT_LANGUAGE: LanguageCode = 'en';

// Create and export i18n context
export const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Custom hook to use i18n
export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

// Global variable to store the current language
let currentGlobalLanguage: LanguageCode = 'en';

// Translation function that can be used outside of React components
export const t: TranslateFunction = (key: string, params: Record<string, string | number> = {}) => {
  // Try current language first, then fallback to English
  let translation = key;
  
  // First try current language
  if (translations[currentGlobalLanguage]?.[key]) {
    translation = translations[currentGlobalLanguage][key];
  } 
  // Then try English fallback
  else if (translations['en']?.[key]) {
    translation = translations['en'][key];
  }
  
  // If no translation found, return the key
  if (typeof translation !== 'string') return key;
  
  // Replace placeholders with provided parameters
  return Object.entries(params).reduce(
    (result, [param, value]) => 
      result.replace(new RegExp(`\\{\\s*${param}\\s*\\}`, 'g'), String(value)),
    translation
  );
};

// I18n Provider component
interface I18nProviderProps {
  children: ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [version, setVersion] = useState(0); // Add version state to force re-renders
  
  // Load saved language from localStorage on mount
  useEffect(() => {
    const initializeLanguage = () => {
      const savedLanguage = localStorage.getItem('preferredLanguage') as LanguageCode;
      console.log('Loading saved language from localStorage:', savedLanguage);
      
      const validLanguage = savedLanguage && availableLanguages.some(lang => lang.code === savedLanguage)
        ? savedLanguage
        : DEFAULT_LANGUAGE;
      
      console.log('Setting language to:', validLanguage);
      
      // Update all language references
      setCurrentLanguage(validLanguage);
      currentGlobalLanguage = validLanguage;
      document.documentElement.lang = validLanguage;
      
      // Store in localStorage if not already set
      if (!savedLanguage || savedLanguage !== validLanguage) {
        localStorage.setItem('preferredLanguage', validLanguage);
      }
    };
    
    initializeLanguage();
    
    // Add storage event listener to handle changes from other tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'preferredLanguage' && e.newValue) {
        const newLang = e.newValue as LanguageCode;
        if (newLang !== currentLanguage) {
          setCurrentLanguage(newLang);
          currentGlobalLanguage = newLang;
          document.documentElement.lang = newLang;
          setVersion(v => v + 1); // Force re-render
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  // Save language preference to localStorage when it changes
  const setLanguage = async (lang: LanguageCode) => {
    console.log('setLanguage called with:', lang);
    
    if (lang === currentLanguage) {
      console.log('Language already set to:', lang);
      return Promise.resolve();
    }
    
    try {
      console.log('Updating language to:', lang);
      
      // Update localStorage first
      localStorage.setItem('preferredLanguage', lang);
      
      // Update the global language reference
      currentGlobalLanguage = lang;
      
      // Update the document language
      document.documentElement.lang = lang;
      
      // Update the React state to trigger re-renders
      setCurrentLanguage(lang);
      
      // Force a re-render of the entire app
      setVersion(prev => prev + 1);
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error changing language:', error);
      return Promise.reject(error);
    }
  };
  
  // Translation function with current language and fallback
  const t: TranslateFunction = (key: string, params: Record<string, string | number> = {}) => {
    // Try current language first, then fallback to English
    let translation = key;
    
    // First try current language
    if (translations[currentLanguage]?.[key]) {
      translation = translations[currentLanguage][key];
    } 
    // Then try English fallback
    else if (translations['en']?.[key]) {
      translation = translations['en'][key];
    }
    
    // If no translation found, return the key
    if (typeof translation !== 'string') return key;
    
    // Replace placeholders with provided parameters
    return Object.entries(params).reduce(
      (result, [param, value]) => 
        result.replace(new RegExp(`\\{\\s*${param}\\s*\\}`, 'g'), String(value)),
      translation
    );
  };

  const value = {
    t,
    currentLanguage,
    setLanguage,
    availableLanguages,
  };
  
  return React.createElement(
    I18nContext.Provider,
    { value },
    children
  );
};

export default useI18n;
