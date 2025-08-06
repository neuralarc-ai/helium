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
        {/* Background image */}
        <Image
          src="/waitlist-background.png"
          alt="Waitlist Banner Background"
          fill
          className="object-cover w-full h-full"
          priority
        />

        {/* Overlay: Vertically centered, aligned right */}
        <div className="absolute inset-0 flex items-center justify-center px-4 sm:px-8">
          <div className="ml-[25rem] flex flex-col items-center text-white text-center max-w-xl drop-shadow-xl">
            <h2 className="text-xl sm:text-4xl md:text-5xl lg:text-4xl font-light leading-tight mb-8">
              Experience autonomous <br />
              intelligence before the world does <br />
              join Helium’s waitlist today.
            </h2>
            <Link
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setWaitlistOpen(true);
              }}
              className="max-w-[260px] w-full px-6 py-3 liquid-glass-btn rounded-full text-white text-base font-normal backdrop-blur-lg hover:bg-white/20 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <span className="liquid-glass-gradient-border rounded-full"></span>
              <span className="whitespace-nowrap">Join the Waitlist</span>
              <Image
                src="/arrow.svg"
                alt="arrow"
                width={20}
                height={20}
                className="w-4 h-4 flex-shrink-0"
              />
            </Link>
          </div>
        </div>

        <WaitlistForm
          isOpen={waitlistOpen}
          onClose={() => setWaitlistOpen(false)}
        />
      </div>
    </section>
  );
}
