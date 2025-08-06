'use client';

import { NavMenu } from '@/components/home/nav-menu';
import { siteConfig } from '@/lib/home';
import { cn } from '@/lib/utils';
import { motion, useScroll } from 'motion/react';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/components/AuthProvider';

const INITIAL_WIDTH = '100%';
const MAX_WIDTH = '78%';

export function Navbar() {
  const { scrollY } = useScroll();
  const [hasScrolled, setHasScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const sections = siteConfig.nav.links.map((item) =>
        item.href.substring(1),
      );

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 150 && rect.bottom >= 150) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const unsubscribe = scrollY.on('change', (latest) => {
      setHasScrolled(latest > 10);
    });
    return unsubscribe;
  }, [scrollY]);

  return (
    <header
      className={cn(
        'sticky z-50 mx-4 flex justify-center transition-all duration-300 md:mx-0',
        hasScrolled ? 'top-6' : 'top-4 mx-0',
      )}
    >
      <motion.div
        initial={{ opacity: 0, y: -32, scale: 0.98, width: INITIAL_WIDTH }}
        animate={{ opacity: 1, y: 0, scale: 1, width: hasScrolled ? MAX_WIDTH : INITIAL_WIDTH }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div
          className={cn(
            'mx-auto max-w-[1440px] rounded-2xl transition-all duration-300  xl:px-0',
            hasScrolled
              ? 'px-2 border border-border backdrop-blur-xl bg-white/30'
              : 'shadow-none px-7',
          )}
        >
          <div className="flex h-fit items-center justify-between p-4 w-full">
            {/* Left: NeuralArc logo and text */}
            <Link href="/" className="flex items-center gap-2 select-none">
              <Image
                src="/helium-logo.png"
                alt="NeuralArc Logo"
                width={100}
                height={120}
                priority
                className="h-auto mr-1 w-[48px] object-contain"
              />
              <div className="text-2xl font-light text-black">Helium</div>
            </Link>

            {/* Right: Nav menu links */}
            <NavMenu />

            {/* Commented out: Get Started/Dashboard button and ThemeToggle */}
            {/*
            <div className="flex flex-row items-center gap-1 md:gap-3 shrink-0">
              <div className="flex items-center space-x-3">
                {user ? (
                  <Link
                    className="bg-pink h-8 hidden md:flex items-center justify-center text-sm font-normal tracking-wide rounded-full text-primary-foreground dark:text-secondary-foreground w-fit px-4 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] border border-white/[0.12]"
                    href="/dashboard"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <Link
                    className="bg-pink h-8 hidden md:flex items-center justify-center text-sm font-normal tracking-wide rounded-full text-primary-foreground dark:text-secondary-foreground w-fit px-4 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] border border-white/[0.12]"
                    href="/auth"
                  >
                    Get started
                  </Link>
                )}
              </div>
              <ThemeToggle />
            </div>
            */}
          </div>
        </div>
      </motion.div>
    </header>
  );
}
