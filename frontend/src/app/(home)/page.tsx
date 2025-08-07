'use client';

import { Footer } from '@/components/home/sections/Footer';
import { ModalProviders } from '@/providers/modal-providers';
import HeroSection from '@/components/home/sections/hero-section';
import HeliumPoweredActions from '@/components/home/sections/helium-powered-actions';
import StrategicServiceSection from '@/components/home/sections/strategic-service';
import NeuralArcSection from '@/components/home/sections/neuralarc';
import PerformanceSection from '@/components/home/sections/performance';
import { Integrations } from '@/components/home/sections/integrations';
import WaitlistBanner from '@/components/home/sections/waitlist-banner';

export default function Home() {
  return (
    <>
      <ModalProviders />
      <main className="flex flex-col items-center justify-center min-h-screen w-full bg-white">
        <div className="w-full">
          <HeroSection />
        </div>
        <div className="w-full max-w-[1440px] mx-auto">
            <HeliumPoweredActions />
            <StrategicServiceSection />
            <NeuralArcSection />
            <PerformanceSection />
            <Integrations />
          
            <Footer />
        </div>
      </main>
    </>
  );
}