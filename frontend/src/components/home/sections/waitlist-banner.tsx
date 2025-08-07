'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import WaitlistForm from './WaitlistForm';

export default function WaitlistBanner() {
  const [waitlistOpen, setWaitlistOpen] = React.useState(false);

  return (
    <section className="w-full flex justify-center items-center my-10">
      <div className="relative w-full max-w-7xl aspect-[3.5/1] min-h-[220px] sm:min-h-[280px] rounded-[20px] sm:rounded-[48px] overflow-hidden shadow-xl">
        {/* Background image */}
        <Image
          src="/waitlist-background.png"
          alt="Waitlist Banner Background"
          fill
          className="object-cover w-full h-full"
          priority
        />

        {/* Always two-column grid overlay */}
        <div className="absolute inset-0 h-full w-full grid grid-cols-2 items-center px-4 sm:px-6 lg:px-8">
          {/* Left column: empty for spacing */}
          <div></div>
          {/* Right column: centered content */}
          <div className="flex flex-col items-center justify-center text-white text-center drop-shadow-xl h-full w-full">
            <h2 className="text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-light leading-snug mb-2 xs:mb-3 sm:mb-5 px-2">
              {/* Mobile layout (below 450px) */}
              <span className="block max-[449px]:hidden">Experience autonomous</span>
              <span className="block max-[449px]:hidden">intelligence before the world does</span>
              <span className="block max-[449px]:hidden">join Helium's waitlist today.</span>
              
              {/* Small screen layout (below 450px) */}
              <span className="hidden max-[449px]:block">Experience autonomous intelligence before the world does join Helium's waitlist today.</span>
            </h2>
            <Link
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setWaitlistOpen(true);
              }}
              className="w-full max-w-[180px] xs:max-w-[180px] sm:max-w-[180px] md:max-w-[200px] lg:max-w-[240px] xl:max-w-[260px] px-2 py-1 xs:px-3 xs:py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 lg:px-6 lg:py-3.5 liquid-glass-btn rounded-full text-white text-xs xs:text-sm sm:text-base lg:text-lg font-normal backdrop-blur-lg hover:bg-white/20 transition-all duration-300 flex items-center justify-center gap-1 sm:gap-2"
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
