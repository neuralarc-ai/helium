'use client';

import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface HeliumLogoProps {
  size?: number;
  animated?: boolean;
}

export function HeliumLogo({ size = 24, animated = false }: HeliumLogoProps) {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // After mount, we can access the theme
  useEffect(() => {
    setMounted(true);
  }, []);

  const shouldInvert = mounted && (
    theme === 'dark' || (theme === 'system' && systemTheme === 'dark')
  );

  if (animated) {
    return (
      <motion.div
        animate={{
          rotate: [0, 720, 1080, 1440],
        }}
        transition={{
          duration: 3,
          ease: [0.25, 0.1, 0.25, 1],
          times: [0, 0.4, 0.7, 1],
          repeat: Infinity,
          repeatType: "loop",
        }}
      >
        <Image
          src="/helium-symbol.svg"
          alt="Helium AI"
          width={size}
          height={size}
          className={`${shouldInvert ? 'invert' : ''} flex-shrink-0`}
        />
      </motion.div>
    );
  }

  return (
    <Image
      src="/helium-symbol.svg"
      alt="Helium AI"
      width={size}
      height={size}
      className={`${shouldInvert ? 'invert' : ''} flex-shrink-0`}
    />
  );
}
