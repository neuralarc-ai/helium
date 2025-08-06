'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import WaitlistForm from './WaitlistForm';

export default function WaitlistBanner() {
  const [waitlistOpen, setWaitlistOpen] = React.useState(false);

  return (
    <section className="w-full flex justify-center items-center my-10">
      <div className="relative w-full max-w-7xl aspect-[3.5/1] rounded-[48px] overflow-hidden shadow-xl">
        {/* Full background image */}
        <Image
          src="/waitlist-background.png"
          alt="Waitlist Banner Background"
          fill
          className="object-cover w-full h-full"
          priority
        />

        {/* Overlay: Centered vertically, aligned right */}
        <div className="absolute inset-0 flex items-center justify-center px-4 sm:px-8">
          <div className="ml-[25rem] text-white text-center max-w-xl drop-shadow-xl">
            <h2 className="text-xl sm:text-4xl md:text-5xl lg:text-4xl font-light leading-tight mb-8">
              Experience autonomous <br />
              intelligence before the world does <br />
              join Helium’s waitlist today.
            </h2>
            <Link
              href="#"
              onClick={e => {
                e.preventDefault();
                setWaitlistOpen(true);
              }}
              className="mt-2 inline-flex px-10 py-4 rounded-full bg-white/10 backdrop-blur-[6px] border border-white/30 text-white text-lg sm:text-xl font-normal shadow-lg items-center gap-2 hover:bg-white/20 transition-all duration-300"
              style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)' }}
            >
              Join the Waitlist
              <span className="ml-2 text-2xl">→</span>
            </Link>
          </div>
        </div>

        <WaitlistForm isOpen={waitlistOpen} onClose={() => setWaitlistOpen(false)} />
      </div>
    </section>
  );
}
