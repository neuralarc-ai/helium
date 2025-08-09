import React from 'react';
import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';
import Image from 'next/image';
import WaitlistForm from './WaitlistForm';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, useScroll, useTransform } from 'framer-motion';

export default function HeroSection() {
  const { user } = useAuth();
  const [waitlistOpen, setWaitlistOpen] = React.useState(false);
 
  // Parallax scroll effect
  const { scrollY } = useScroll();
  const parallaxY1 = useTransform(scrollY, [0, 1000], [0, -200]);
  const parallaxY2 = useTransform(scrollY, [0, 1000], [0, -150]);
  const parallaxY3 = useTransform(scrollY, [0, 1000], [0, -250]);
  const parallaxY4 = useTransform(scrollY, [0, 1000], [0, -180]);
  const parallaxY5 = useTransform(scrollY, [0, 1000], [0, -220]);
  const parallaxY6 = useTransform(scrollY, [0, 1000], [0, -190]);

  // Create floating animation values
  const [floatingOffset1, setFloatingOffset1] = React.useState(0);
  const [floatingOffset2, setFloatingOffset2] = React.useState(0);
  const [floatingOffset3, setFloatingOffset3] = React.useState(0);
  const [floatingOffset4, setFloatingOffset4] = React.useState(0);
  const [floatingOffset5, setFloatingOffset5] = React.useState(0);
  const [floatingOffset6, setFloatingOffset6] = React.useState(0);

  // Floating animation effect
  React.useEffect(() => {
    const interval1 = setInterval(() => {
      setFloatingOffset1(Math.sin(Date.now() * 0.0008) * 18);
    }, 16);
    const interval2 = setInterval(() => {
      setFloatingOffset2(Math.sin(Date.now() * 0.0006) * 16);
    }, 16);
    const interval3 = setInterval(() => {
      setFloatingOffset3(Math.sin(Date.now() * 0.0009) * 20);
    }, 16);
    const interval4 = setInterval(() => {
      setFloatingOffset4(Math.sin(Date.now() * 0.0007) * 17);
    }, 16);
    const interval5 = setInterval(() => {
      setFloatingOffset5(Math.sin(Date.now() * 0.0012) * 19);
    }, 16);
    const interval6 = setInterval(() => {
      setFloatingOffset6(Math.sin(Date.now() * 0.0005) * 15);
    }, 16);

    return () => {
      clearInterval(interval1);
      clearInterval(interval2);
      clearInterval(interval3);
      clearInterval(interval4);
      clearInterval(interval5);
      clearInterval(interval6);
    };
  }, []);

  // Orbital movement states
  const [orbitalPhase1, setOrbitalPhase1] = React.useState(0);
  const [orbitalPhase2, setOrbitalPhase2] = React.useState(0);
  const [orbitalPhase3, setOrbitalPhase3] = React.useState(0);
  const [orbitalPhase4, setOrbitalPhase4] = React.useState(0);
  const [orbitalPhase5, setOrbitalPhase5] = React.useState(0);
  const [orbitalPhase6, setOrbitalPhase6] = React.useState(0);

  // Orbital animation effect
  React.useEffect(() => {
    const orbitalInterval1 = setInterval(() => {
      setOrbitalPhase1(Date.now() * 0.0003);
    }, 16);
    const orbitalInterval2 = setInterval(() => {
      setOrbitalPhase2(Date.now() * 0.0004);
    }, 16);
    const orbitalInterval3 = setInterval(() => {
      setOrbitalPhase3(Date.now() * 0.00025);
    }, 16);
    const orbitalInterval4 = setInterval(() => {
      setOrbitalPhase4(Date.now() * 0.00035);
    }, 16);
    const orbitalInterval5 = setInterval(() => {
      setOrbitalPhase5(Date.now() * 0.00045);
    }, 16);
    const orbitalInterval6 = setInterval(() => {
      setOrbitalPhase6(Date.now() * 0.0002);
    }, 16);

    return () => {
      clearInterval(orbitalInterval1);
      clearInterval(orbitalInterval2);
      clearInterval(orbitalInterval3);
      clearInterval(orbitalInterval4);
      clearInterval(orbitalInterval5);
      clearInterval(orbitalInterval6);
    };
  }, []);

  // Glow pulse (sync with CSS pulseGlow: 2.5s period)
  const [glowPulse, setGlowPulse] = React.useState(0);
  React.useEffect(() => {
    const interval = setInterval(() => {
      // Sine wave from 0 to 1, period 2.5s
      setGlowPulse((Math.sin((Date.now() / 2500) * 2 * Math.PI) + 1) / 2);
    }, 16);
    return () => clearInterval(interval);
  }, []);

  // --- AGENT ORBIT RADII (base + pulse) ---
  // H1 (HR): more visible
  const agent1BaseRadiusY = 22; // was 14
  const agent1BaseRadiusX = 18; // was 12
  // L1 (Legal)
  const agent2BaseRadiusY = 18;
  const agent2BaseRadiusX = 14;
  // S1 (Sales)
  const agent3BaseRadiusY = 20;
  const agent3BaseRadiusX = 16;
  // F1 (Finance): more visible
  const agent4BaseRadiusY = 26; // was 20
  const agent4BaseRadiusX = 21; // was 15
  // B1 (Operations)
  const agent5BaseRadiusY = 22;
  const agent5BaseRadiusX = 18;
  // M1 (Marketing): more visible
  const agent6BaseRadiusY = 23; // was 19
  const agent6BaseRadiusX = 17; // was 11

  // Pulse amplitude (how much the radius grows/shrinks with the glow)
  const pulseAmpY = 8;
  const pulseAmpX = 6;

  // --- Combined parallax, floating, and orbital transforms with pulse ---
  const agent1Y = useTransform(parallaxY1, (latest) => latest + floatingOffset1 + Math.sin(orbitalPhase1) * (agent1BaseRadiusY + glowPulse * pulseAmpY));
  const agent1X = useTransform(parallaxY1, (latest) => Math.cos(orbitalPhase1) * (agent1BaseRadiusX + glowPulse * pulseAmpX));
  const agent2Y = useTransform(parallaxY2, (latest) => latest + floatingOffset2 + Math.sin(orbitalPhase2) * (agent2BaseRadiusY + glowPulse * pulseAmpY));
  const agent2X = useTransform(parallaxY2, (latest) => Math.cos(orbitalPhase2) * (agent2BaseRadiusX + glowPulse * pulseAmpX));
  const agent3Y = useTransform(parallaxY3, (latest) => latest + floatingOffset3 + Math.sin(orbitalPhase3) * (agent3BaseRadiusY + glowPulse * pulseAmpY));
  const agent3X = useTransform(parallaxY3, (latest) => Math.cos(orbitalPhase3) * (agent3BaseRadiusX + glowPulse * pulseAmpX));
  const agent4Y = useTransform(parallaxY4, (latest) => latest + floatingOffset4 + Math.sin(orbitalPhase4) * (agent4BaseRadiusY + glowPulse * pulseAmpY));
  const agent4X = useTransform(parallaxY4, (latest) => Math.cos(orbitalPhase4) * (agent4BaseRadiusX + glowPulse * pulseAmpX));
  const agent5Y = useTransform(parallaxY5, (latest) => latest + floatingOffset5 + Math.sin(orbitalPhase5) * (agent5BaseRadiusY + glowPulse * pulseAmpY));
  const agent5X = useTransform(parallaxY5, (latest) => Math.cos(orbitalPhase5) * (agent5BaseRadiusX + glowPulse * pulseAmpX));
  const agent6Y = useTransform(parallaxY6, (latest) => latest + floatingOffset6 + Math.sin(orbitalPhase6) * (agent6BaseRadiusY + glowPulse * pulseAmpY));
  const agent6X = useTransform(parallaxY6, (latest) => Math.cos(orbitalPhase6) * (agent6BaseRadiusX + glowPulse * pulseAmpX));

  // Entrance animation state
  const [showHero, setShowHero] = React.useState(false);
  React.useEffect(() => {
    const timeout = setTimeout(() => setShowHero(true), 100);
    return () => clearTimeout(timeout);
  }, []);

  // Animation variants
  const circleVariants = {
    hidden: { opacity: 0, y: -80, scale: 0.7, rotate: 0 },
    visible: { opacity: 1, y: 0, scale: 1, rotate: 360, transition: { duration: 1 } },
  };
  const agentVariants = {
    hidden: { opacity: 0, scale: 0.7 },
    visible: { opacity: 1, scale: 1 },
  };
  const contentVariants = {
    hidden: { opacity: 0, y: 32 },
    visible: { opacity: 1, y: 0, transition: { delay: 0.5, duration: 0.7 } },
  };
  const videoVariants = {
    hidden: { opacity: 0, y: 32 },
    visible: { opacity: 1, y: 0, transition: { delay: 1.8, duration: 0.7 } },
  };

  return (
    <>
      {/* Hero Top Section: background image, text, buttons */}
      <section
        className="absolute top-0 left-0 right-0 w-screen h-[100vh] flex flex-col items-center justify-center pt-24 relative overflow-hidden z-0"
        style={{ margin: 0, padding: 0, borderRadius: 0, maxWidth: '100%' }}
      >
        <Image
          src="/auth/bg-image1.png"
          alt="Helium background"
          fill
          priority
          className="absolute top-0 left-0 w-full h-full object-cover z-0 !opacity-100 !brightness-100 !blur-0 transition-none"
          style={{ objectPosition: 'center center', borderRadius: 0 }}
        />
        <motion.div 
          className="relative flex flex-col items-center justify-center h-full w-full z-10"
          style={{ y: useTransform(scrollY, [0, 1000], [0, 100]) }}
          initial="hidden"
          animate={showHero ? 'visible' : 'hidden'}
          variants={contentVariants}
        >
          <motion.div
            className="relative flex flex-col items-center justify-center w-full max-w-6xl"
          >
            <motion.div 
              className="relative w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 xl:w-20 xl:h-20 2xl:w-24 2xl:h-24 mb-1 sm:mb-2 md:mb-3 lg:mb-4 xl:mb-5 2xl:mb-6 z-2"
              initial="hidden"
              animate={showHero ? 'visible' : 'hidden'}
              variants={contentVariants}
              transition={{ ease: 'easeOut' }}
            >
              <Image
                src="/helium-agent.png"
                alt="Helium Agent"
                fill
                className="object-contain"
              />
            </motion.div>
            <motion.h1
              className="text-center text-2xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-6xl 2xl:text-[92px] font-extralight text-white leading-tight tracking-tight mb-6 sm:mb-8 z-2 px-4 sm:px-6"
              initial="hidden"
              animate={showHero ? 'visible' : 'hidden'}
              variants={contentVariants}
              transition={{ ease: 'easeOut' }}
            >
              Helium is abundant in <br className="hidden md:block" />the universe, yet <br className="hidden md:block" />strategic on Earth
            </motion.h1>
            <motion.div
              className="flex flex-row gap-2 sm:gap-3 md:gap-4 mt-2 w-auto px-4 sm:px-0 z-2"
              initial="hidden"
              animate={showHero ? 'visible' : 'hidden'}
              variants={contentVariants}
              transition={{ ease: 'easeOut' }}
            >
              <Link
                href="#"
                onClick={e => { e.preventDefault(); setWaitlistOpen(true); }}
                className="px-2 sm:px-6 md:px-4 lg:px-6 py-1.5 sm:py-4 md:py-3 lg:py-4 liquid-glass-btn rounded-full text-white text-xs sm:text-sm md:text-base lg:text-lg font-normal backdrop-blur-lg hover:bg-white/20 transition-all duration-300 flex items-center justify-center gap-1 sm:gap-2"
              >
                <span className="liquid-glass-gradient-border rounded-full"></span>
                <span className="whitespace-nowrap">Join Helium Waitlist</span>
                <Image src="/arrow.svg" alt="arrow" width={30} height={30} className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 xl:w-6 xl:h-6 flex-shrink-0" />
              </Link>
              <Link
                href={user ? '/dashboard' : '/auth'}
                className="px-2 sm:px-6 md:px-4 lg:px-6 py-1.5 sm:py-4 md:py-3 lg:py-4 liquid-glass-btn rounded-full text-white text-xs sm:text-sm md:text-base lg:text-lg font-normal backdrop-blur-lg hover:bg-white/20 transition-all duration-300 flex items-center justify-center gap-1 sm:gap-2"
              >
                <span className="liquid-glass-gradient-border rounded-full"></span>
                <span className="whitespace-nowrap">{user ? 'Get Started' : 'Log In'}</span>
                <Image src="/arrow.svg" alt="arrow" width={30} height={30} className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 xl:w-6 xl:h-6 flex-shrink-0" />
              </Link>
            </motion.div>
            <WaitlistForm isOpen={waitlistOpen} onClose={() => setWaitlistOpen(false)} />
          </motion.div>
        </motion.div>
      </section>
      {/* Hero Video Section (separate) */}
      {/* <section className="w-full flex justify-center mt-8 sm:mt-10 md:mt-12 mb-8 sm:mb-10 md:mb-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          className="w-full flex justify-center"
          initial="hidden"
          animate={showHero ? 'visible' : 'hidden'}
          variants={videoVariants}
          transition={{ ease: 'easeOut' }}
        >
          <video
            src="/videos/helium-demo-video.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="rounded-2xl sm:rounded-3xl md:rounded-[48px] shadow-lg border border-white/10 max-w-4xl w-full h-auto"
          >
            Your browser does not support the video tag.
          </video>
        </motion.div>
     
      </section> */}
    
{/* Input Fields Image Below Hero Section */}
<div className="w-full flex justify-center mt-16 mb-8">
  <Image
    src="/input_fields.png"
    alt="Input Fields Example"
    width={700}
    height={180}
    style={{ maxWidth: '90vw', height: 'auto' }}
  />
</div>
    </>
  );
}
