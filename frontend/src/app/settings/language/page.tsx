'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
// Use the global I18nProvider from app/providers.tsx; no local provider here

// Dynamically import the LanguageSettings component with SSR disabled
const LanguageSettings = dynamic(
  () => import('@/components/settings/language-settings').then(mod => mod.default),
  { ssr: false, loading: () => <div>Loading language settings...</div> }
);

export default function LanguageSettingsPage() {
  const [isMounted, setIsMounted] = useState(false);

  // This ensures the component is only rendered on the client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div className="container mx-auto py-8 px-4">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl">
        <LanguageSettings asPage={true} />
      </div>
    </div>
  );
}
