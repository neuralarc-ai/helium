import { useI18n } from '@/lib/i18n-clients';
import { sidebarTranslations } from '@/lib/i18n/translations/sidebar';

export const useSidebarTranslations = () => {
  const { currentLanguage } = useI18n();
  
  // Get translations for the current language, fallback to English if not available
  const t = sidebarTranslations[currentLanguage as keyof typeof sidebarTranslations] || 
            sidebarTranslations.en;
  
  return t;
};
