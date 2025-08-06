'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function LoginFooter() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.6, 
        ease: [0.4, 0, 0.2, 1],
        delay: 1.6
      }}
      className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex flex-row items-center space-x-1 gap-y-2 text-xs text-muted-foreground z-20"
    >
      <Link href="/terms" className="hover:underline flex-shrink-0">Terms of use</Link>
      <span className="mx-1">•</span>
      <Link href="/privacy" className="hover:underline flex-shrink-0">Privacy Policy</Link>
      <span className="mx-1">•</span>
      <Link href="/responsible-ai" className="hover:underline flex-shrink-0">Responsible &amp; Ethical AI</Link>
      <span className="mx-1 flex-shrink-0">•</span>
      <span className='flex-shrink-0'>Copyright 2025. All rights reserved.</span>
      <span className="mx-1 flex-shrink-0">•</span>
      <span className='flex-shrink-0'>Helium, a product by <Link href="https://neuralarc.ai" className="font-bold hover:underline" target="_blank" rel="noopener noreferrer">NeuralArc</Link></span>
    </motion.div>
  );
}
