'use client';

import React, { useState } from 'react';
import useI18n from '@/lib/i18n-clients';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useSpokenLanguage } from '@/contexts/SpokenLanguageContext';
import { Mic, Globe, Check, ChevronDown, Languages, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Move the type and availableLanguages to a separate file if used in multiple places
type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja' | 'hi' | 'ar' | 'ru' | 'pt' | 'it' | 'ko' | 'ur' | 'bn' | 'ms' | 'en_GB';

const availableLanguages = [
  { code: 'en' as LanguageCode, name: 'English' },
  { code: 'es' as LanguageCode, name: 'Español (Spanish)' },
  { code: 'fr' as LanguageCode, name: 'Français (French)' },
  { code: 'de' as LanguageCode, name: 'Deutsch (German)' },
  { code: 'zh' as LanguageCode, name: '中文 (Chinese)' },
  { code: 'ja' as LanguageCode, name: '日本語 (Japanese)' },
  { code: 'hi' as LanguageCode, name: 'हिन्दी (Hindi)' },
  { code: 'ar' as LanguageCode, name: 'العربية (Arabic)' },
  { code: 'ru' as LanguageCode, name: 'Русский (Russian)' },
  { code: 'pt' as LanguageCode, name: 'Português (Portuguese)' },
  { code: 'it' as LanguageCode, name: 'Italiano (Italian)' },
  { code: 'ko' as LanguageCode, name: '한국어 (Korean)' },
  { code: 'ur' as LanguageCode, name: 'اردو (Urdu)' },
  { code: 'bn' as LanguageCode, name: 'বাংলা (Bengali)' },
  { code: 'ms' as LanguageCode, name: 'Bahasa Melayu (Malay)' },
  { code: 'en_GB' as LanguageCode, name: 'English (UK)' },
];

// Map interface language codes to Web Speech API BCP-47 codes
const interfaceToSpeechCode: Record<LanguageCode, string> = {
  en: 'en-US',
  en_GB: 'en-GB',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  zh: 'zh-CN',
  ja: 'ja-JP',
  hi: 'hi-IN',
  ar: 'ar-SA',
  ru: 'ru-RU',
  pt: 'pt-PT',
  it: 'it-IT',
  ko: 'ko-KR',
  ur: 'ur-PK',
  bn: 'bn-IN',
  ms: 'ms-MY',
};

// Resolve a human-readable name for a given speech code
const getNameForSpeechCode = (speechCode: string, fallbackName: string): string => {
  // Try exact match against availableLanguages codes
  const exact = availableLanguages.find(l => l.code === (speechCode as LanguageCode));
  if (exact) return exact.name;
  // Fallback: match base language (e.g., hi from hi-IN)
  const base = speechCode.split('-')[0] as LanguageCode;
  const byBase = availableLanguages.find(l => l.code === base);
  return byBase?.name || fallbackName;
};

interface LanguageSettingsProps {
  asPage?: boolean;
}

export default function LanguageSettings({ asPage = false }: LanguageSettingsProps) {
  const router = useRouter();
  const { t, currentLanguage, setLanguage } = useI18n();
  const { spokenLanguage, setSpokenLanguage, spokenLanguageCode } = useSpokenLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(currentLanguage);
  const [pendingLanguage, setPendingLanguage] = useState<LanguageCode | null>(null);
  const [pendingSpokenLanguage, setPendingSpokenLanguage] = useState<{code: LanguageCode, name: string} | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [hasSpokenChanges, setHasSpokenChanges] = useState(false);
  const [hoveredLanguage, setHoveredLanguage] = useState<LanguageCode | null>(null);
  const [hoveredSpokenLanguage, setHoveredSpokenLanguage] = useState<LanguageCode | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isConfirmSaving, setIsConfirmSaving] = useState(false);
  
  // State for dropdown open/close
  const [isOpen, setIsOpen] = useState(false);
  
  // Get current language display names
  const currentLanguageName = availableLanguages.find(lang => lang.code === currentLanguage)?.name || t('language.english', { defaultValue: 'English' });
  const pendingLanguageName = availableLanguages.find(lang => lang.code === pendingLanguage)?.name || currentLanguageName;
  const currentSpokenLanguageName = getNameForSpeechCode(
    spokenLanguageCode,
    spokenLanguage || t('language.english', { defaultValue: 'English' })
  );
  
  // Handle interface language change
  const handleLanguageChange = (langCode: LanguageCode) => {
    if (langCode === currentLanguage && !pendingLanguage) {
      return; // No change needed
    }
    
    setPendingLanguage(langCode);
    // Only update interface language changes, not spoken language
    setHasChanges(langCode !== currentLanguage);
  };
  
  // Handle save button click
  const handleSave = async () => {
    if (!pendingLanguage || pendingLanguage === currentLanguage) {
      return; // No changes to save
    }
    
    try {
      setIsSaving(true);
      const toastId = toast.loading(t('language.updating'));
      
      // Change the language - this will update the UI without a page reload
      await setLanguage(pendingLanguage);
      
      // Reset the pending state
      setPendingLanguage(null);
      setHasChanges(false);
      
      // Show success message
      toast.success(t('language.updated'), { id: toastId });
      
    } catch (error) {
      console.error('Failed to change language:', error);
      toast.error(t('language.updateFailed'));
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle spoken language change
  const handleSpokenLanguageChange = (langCode: LanguageCode, langName: string) => {
    setPendingSpokenLanguage({ code: langCode, name: langName });
    const newSpeechCode = interfaceToSpeechCode[langCode] || langCode;
    setHasSpokenChanges(newSpeechCode !== spokenLanguageCode);
  };
  
  // Handle save spoken language
  const handleSaveSpokenLanguage = async () => {
    if (!pendingSpokenLanguage) return;
    
    try {
      setIsSaving(true);
      // Store a valid BCP-47 speech recognition code in context
      const speechCode = interfaceToSpeechCode[pendingSpokenLanguage.code] || pendingSpokenLanguage.code;
      setSpokenLanguage(speechCode);
      setHasSpokenChanges(false);
      setHasChanges(!!pendingLanguage && pendingLanguage !== currentLanguage); // Only keep interface language changes
      toast.success(t('language.spokenLanguageUpdated') || 'Spoken language updated');
    } catch (error) {
      console.error('Failed to update spoken language:', error);
      toast.error(t('language.updateFailed') || 'Failed to update spoken language');
    } finally {
      setIsSaving(false);
    }
  };

  // Back button with confirmation on unsaved changes
  const handleBack = () => {
    if (hasChanges || hasSpokenChanges) {
      setConfirmOpen(true);
      return;
    }
    router.push('/dashboard');
  };

  const handleConfirmSaveAndBack = async () => {
    try {
      setIsConfirmSaving(true);
      if (hasSpokenChanges && pendingSpokenLanguage) {
        await handleSaveSpokenLanguage();
      }
      if (hasChanges && pendingLanguage) {
        await handleSave();
      }
      setConfirmOpen(false);
      router.push('/dashboard');
    } finally {
      setIsConfirmSaving(false);
    }
  };
  
  // Handle reset spoken language
  const handleResetSpokenLanguage = () => {
    // Find English language from available languages
    const englishLang = availableLanguages.find(lang => lang.code === 'en');
    if (!englishLang) return;
    
    // Check if already in English (accept en, en-US, en-GB)
    const isAlreadyEnglish = (!pendingSpokenLanguage) && (
      spokenLanguageCode === 'en' || spokenLanguageCode === 'en-US' || spokenLanguageCode === 'en-GB'
    );
    
    if (isAlreadyEnglish) {
      toast.info(t('language.alreadyInEnglish') || 'Spoken language is already set to English');
      return;
    }
    
    // Reset to English
    setSpokenLanguage(interfaceToSpeechCode['en']);
    setPendingSpokenLanguage(null);
    setHasSpokenChanges(!(spokenLanguageCode === 'en' || spokenLanguageCode === 'en-US'));
    // Don't modify hasChanges here as it's for interface language
    
    // Show success message
    toast.success(t('language.spokenLanguageReset') || 'Spoken language reset to English');
  };

  // Content to be rendered inside dropdown or page
  const languageSettingsContent = (
    <div className="bg-gradient-to-b from-background to-muted/10">
      {!asPage && (
        <DropdownMenuLabel className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Languages className="h-5 w-5 text-primary" />
            </div>
            <span className="font-semibold text-foreground/90">{t('language.settings')}</span>
          </div>
        </DropdownMenuLabel>
      )}
        
        {/* Interface Language Section */}
        <div className="px-6 py-4 group">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 group-hover:translate-x-1 transition-transform duration-200">
              <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="font-medium text-sm text-foreground/90">{t('language.interfaceLanguage')}</span>
            </div>
            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 pr-2 h-9 border-2 border-border/50 hover:border-primary/50 bg-background/80 backdrop-blur-sm transition-all duration-200 hover:shadow-sm"
                  >
                    <span className="font-medium">{pendingLanguage ? pendingLanguageName : currentLanguageName}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[200px] max-h-60 overflow-y-auto">
                  {availableLanguages.map((lang) => {
                    // Get the translation for 'Save' in the hovered language
                    const saveTranslation = (() => {
                      switch(lang.code) {
                        case 'hi': return 'सहेजें';
                        case 'es': return 'Guardar';
                        case 'fr': return 'Enregistrer';
                        case 'de': return 'Speichern';
                        case 'zh': return '保存';
                        case 'ja': return '保存';
                        case 'ar': return 'حفظ';
                        case 'ru': return 'Сохранить';
                        case 'pt': return 'Salvar';
                        case 'it': return 'Salva';
                        case 'bn': return 'সংরক্ষণ করুন';
                        case 'ko': return '저장';
                        case 'ur': return 'محفوظ کریں';
                        case 'ms': return 'Simpan';
                        case 'en_GB': return 'Save';
                        default: return 'Save';
                      }
                    })();
                    
                    return (
                      <DropdownMenuItem
                        key={`interface-${lang.code}`}
                        onClick={() => handleLanguageChange(lang.code)}
                        onMouseEnter={() => setHoveredLanguage(lang.code)}
                        onMouseLeave={() => setHoveredLanguage(null)}
                        className="flex items-center justify-between px-3 py-2.5 rounded-lg m-1 text-sm transition-all duration-200 hover:bg-accent/80 data-[highlighted]:bg-accent/90 data-[highlighted]:text-accent-foreground"
                      >
                        <span>{lang.name}</span>
                        {(lang.code === (pendingLanguage || currentLanguage)) && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 mb-3 ml-1 px-1">
            {t('language.chooseInterfaceLanguage')}
          </p>
          
          {/* Action Buttons */}
          <div className="flex gap-3 mt-4 px-1">
            <Button 
              variant="outline"
              size="sm"
              onClick={async () => {
                setIsSaving(true);
                try {
                  await setLanguage('en');
                  setPendingLanguage(null);
                  setHasChanges(false);
                  toast.success(t('language.resetSuccess') || 'Language reset to English');
                } catch (error) {
                  console.error('Failed to reset language:', error);
                  toast.error(t('language.resetFailed') || 'Failed to reset language');
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={isSaving}
              className="h-9 px-4 rounded-lg border-2 border-border/50 bg-transparent hover:bg-destructive/5 hover:border-destructive/30 text-destructive/90 hover:text-destructive transition-all duration-200 flex-1 sm:flex-none"
            >
              <span className="font-medium">{t('language.reset')}</span>
            </Button>
            <Button 
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="h-9 px-6 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-md hover:shadow-lg transition-all duration-200 flex-1 sm:flex-none"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{t('common.saving')}</span>
                </>
              ) : (
                <span className="font-medium">
                  {hoveredLanguage 
                    ? (() => {
                        switch(hoveredLanguage) {
                          case 'hi': return 'सहेजें';
                          case 'es': return 'Guardar';
                          case 'fr': return 'Enregistrer';
                          case 'de': return 'Speichern';
                          case 'zh': return '保存';
                          case 'ja': return '保存';
                          case 'ar': return 'حفظ';
                          case 'ru': return 'Сохранить';
                          case 'pt': return 'Salvar';
                          case 'it': return 'Salva';
                          case 'bn': return 'সংরক্ষণ করুন';
                          case 'ko': return '저장';
                          case 'ur': return 'محفوظ کریں';
                          case 'ms': return 'Simpan';
                          case 'en_GB': 
                          default: return 'Save';
                        }
                      })()
                    : t('common.save')}
                </span>
              )}
            </Button>
          </div>
        </div>
        
        <Separator className="my-2 mx-6 w-auto" />
        
        {/* Spoken Language Section */}
        <div className="px-6 py-4 group">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 group-hover:translate-x-1 transition-transform duration-200">
              <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Mic className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="font-medium text-sm text-foreground/90">{t('language.spokenLanguage')}</span>
            </div>
            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 pr-2 h-9 border-2 border-border/50 hover:border-purple-500/50 bg-background/80 backdrop-blur-sm transition-all duration-200 hover:shadow-sm"
                  >
                    <span className="font-medium">{pendingSpokenLanguage?.name || currentSpokenLanguageName}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[200px] max-h-60 overflow-y-auto">
                  {availableLanguages.map((lang) => {
                    const isSelected = pendingSpokenLanguage 
                      ? lang.code === pendingSpokenLanguage.code 
                      : lang.code === spokenLanguageCode;
                    
                    return (
                      <DropdownMenuItem
                        key={`spoken-${lang.code}`}
                        onClick={() => handleSpokenLanguageChange(lang.code, lang.name)}
                        onMouseEnter={() => setHoveredSpokenLanguage(lang.code)}
                        onMouseLeave={() => setHoveredSpokenLanguage(null)}
                        className="flex items-center justify-between px-3 py-2.5 rounded-lg m-1 text-sm transition-all duration-200 hover:bg-accent/80 data-[highlighted]:bg-accent/90 data-[highlighted]:text-accent-foreground"
                      >
                        <span>{lang.name}</span>
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 mb-3 ml-1 px-1">
            {t('language.chooseSpokenLanguage')}
          </p>
          
          {/* Spoken Language Action Buttons */}
          <div className="flex gap-3 mt-4 px-1">
            <Button 
              variant="outline"
              size="sm"
              onClick={handleResetSpokenLanguage}
              disabled={isSaving}
              className="h-9 px-4 rounded-lg border-2 border-border/50 bg-transparent hover:bg-destructive/5 hover:border-destructive/30 text-destructive/90 hover:text-destructive transition-all duration-200 flex-1 sm:flex-none"
            >
              <span className="font-medium">{t('language.reset')}</span>
            </Button>
            <Button 
              variant="default"
              size="sm"
              onClick={handleSaveSpokenLanguage}
              disabled={!hasSpokenChanges || isSaving}
              className="h-9 px-6 rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-md hover:shadow-lg transition-all duration-200 flex-1 sm:flex-none"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{t('common.saving')}</span>
                </>
              ) : (
                <span className="font-medium">
                  {(() => {
                    const currentLang = pendingSpokenLanguage?.code || spokenLanguageCode || 'en';
                    switch(currentLang) {
                      case 'hi': return 'सहेजें';
                      case 'es': return 'Guardar';
                      case 'fr': return 'Enregistrer';
                      case 'de': return 'Speichern';
                      case 'zh': return '保存';
                      case 'ja': return '保存';
                      case 'ar': return 'حفظ';
                      case 'ru': return 'Сохранить';
                      case 'pt': return 'Salvar';
                      case 'it': return 'Salva';
                      case 'bn': return 'সংরক্ষণ করুন';
                      case 'ko': return '저장';
                      case 'ur': return 'محفوظ کریں';
                      case 'ms': return 'Simpan';
                      case 'en_GB': 
                      default: return 'Save';
                    }
                  })()}
                </span>
              )}
            </Button>
          </div>
        </div>
        
      {!asPage && (
        <>
          <DropdownMenuSeparator className="mt-1 mx-6 w-auto" />
          <div className="p-3 text-xs text-center text-muted-foreground bg-muted/20 rounded-b-lg">
            <div className="flex items-center justify-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
              <span>{t('language.changesSaved')}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // If rendered as a page, just return the content
  if (asPage) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full border-2 border-border/40 hover:border-primary/50 hover:bg-accent/60 shadow-sm hover:shadow transition-all"
                onClick={handleBack}
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Back</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Back to dashboard</TooltipContent>
          </Tooltip>
          <h1 className="text-2xl font-bold">{t('language.settings')}</h1>
        </div>
        {/* Unsaved changes confirmation dialog */}
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <div className="-mx-6 -mt-6 mb-4 rounded-t-2xl bg-amber-50 dark:bg-amber-900/30 px-6 py-4 border-b">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-sm font-semibold">Confirm Changes</span>
              </div>
            </div>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl">Unsaved changes</AlertDialogTitle>
              <AlertDialogDescription>
                You have unsaved changes to your interface or spoken language. Choose an action below.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <ul className="mt-2 mb-4 list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Save and apply changes, then return to dashboard</li>
              <li>Discard changes and return to dashboard</li>
              <li>Stay on this page to continue editing</li>
            </ul>
            <AlertDialogFooter className="sm:flex-row sm:justify-between">
              <AlertDialogCancel className="sm:mr-auto">Stay</AlertDialogCancel>
              <div className="flex gap-2">
                <AlertDialogAction
                  className="bg-amber-600 text-white hover:bg-amber-500 dark:bg-amber-500 dark:hover:bg-amber-400"
                  onClick={() => {
                    setConfirmOpen(false);
                    router.push('/dashboard');
                  }}
                >
                  Discard and go back
                </AlertDialogAction>
                <AlertDialogAction
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleConfirmSaveAndBack}
                  disabled={isConfirmSaving}
                >
                  {isConfirmSaving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>Save and go back</>
                  )}
                </AlertDialogAction>
              </div>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <div className="space-y-6">
          {languageSettingsContent}
        </div>
      </div>
    );
  }

  // Otherwise, render as a dropdown
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-9 w-9 rounded-lg transition-all duration-200 hover:bg-accent/50 hover:scale-105"
        >
          <div className="relative">
            <Languages className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-blue-500 border-2 border-background"></span>
          </div>
          <span className="sr-only">Language settings</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-[360px] p-0 rounded-xl shadow-xl border border-border/50 overflow-hidden bg-background/95 backdrop-blur-lg" 
        align="end" 
        sideOffset={8}
      >
        {languageSettingsContent}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
