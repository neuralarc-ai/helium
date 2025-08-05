'use client';

import React from 'react';
import Image from 'next/image';

const integrationIcons = [
  '/neuralarc/int-01.png',
  '/neuralarc/int-02.png',
  '/neuralarc/int-03.png',
  '/neuralarc/int-04.png',
  '/neuralarc/int-05.png',
  '/neuralarc/int-06.png',
  '/neuralarc/int-07.png',
  '/neuralarc/int-08.png',
  '/neuralarc/int-09.png',
  '/neuralarc/int-10.png',
  '/neuralarc/int-11.png',
];

export const Integrations: React.FC = () => {
  const row1 = integrationIcons.slice(0, 4);
  const row2 = integrationIcons.slice(4, 8);
  const row3 = integrationIcons.slice(8);

  return (
    <section className="w-[calc(100%-2rem)] sm:w-[calc(100%-3rem)] md:w-[calc(100%-4rem)] lg:w-[calc(100%-5rem)] xl:w-[calc(100%-6rem)] max-w-7xl mx-auto rounded-2xl sm:rounded-3xl liquid-glass-btn flex flex-col md:flex-row items-center md:items-start justify-between px-4 sm:px-6 md:px-8 lg:px-10 py-6 sm:py-8 md:py-10 lg:py-12 md:gap-x-[5rem]">
      <span className="liquid-glass-gradient-border rounded-2xl sm:rounded-3xl"></span>

      {/* Left Section */}
      <div className="flex flex-col justify-center w-full md:w-[60%] max-w-[700px] z-10 gap-3 sm:gap-5 md:gap-6 lg:gap-10 mb-6 md:mb-0 xl:max-w-[780px] xl:w-[80%]">
        <h2 className="text-lg sm:text-xl md:text-2xl lg:text-4xl text-white/80 font-medium leading-snug sm:leading-snug md:leading-tight">
          Effortless App Integrations
        </h2>
        <p className="text-sm sm:text-base md:text-base lg:text-lg text-muted-foreground leading-[1.6]">
          Connect and collaborate like never before. Helium seamlessly integrates with thousands of your favorite applications, transforming your scattered tools into one intelligent, unified workspace. Experience smoother workflows, smarter decisions, and increased productivity — all in one place.
        </p>
      </div>

      {/* Right Section - Icons Grid */}
      <div className="flex justify-center items-center z-10 w-full md:max-w-[270px] lg:max-w-[320px]">
        <div className="bg-transparent p-2 sm:p-4 md:p-6 rounded-2xl w-full">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="grid grid-cols-4 gap-2 sm:gap-3 md:gap-4">
              {row1.map((src, idx) => (
                <Image
                  key={src}
                  src={src}
                  alt={`Integration ${idx + 1}`}
                  width={32}
                  height={32}
                  className="w-6 h-6 sm:w-7 sm:h-7 md:w-7 md:h-7 lg:w-8 lg:h-8 xl:w-9 xl:h-9 object-contain"
                />
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2 sm:gap-3 md:gap-4">
              {row2.map((src, idx) => (
                <Image
                  key={src}
                  src={src}
                  alt={`Integration ${idx + 5}`}
                  width={32}
                  height={32}
                  className="w-6 h-6 sm:w-7 sm:h-7 md:w-7 md:h-7 lg:w-8 lg:h-8 xl:w-9 xl:h-9 object-contain"
                />
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2 sm:gap-3 md:gap-4 items-center">
              {row3.map((src, idx) => (
                <Image
                  key={src}
                  src={src}
                  alt={`Integration ${idx + 9}`}
                  width={32}
                  height={32}
                  className="w-6 h-6 sm:w-7 sm:h-7 md:w-7 md:h-7 lg:w-8 lg:h-8 xl:w-9 xl:h-9 object-contain"
                />
              ))}
              {Array.from({ length: 3 - row3.length }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              <span className="text-xs sm:text-sm text-muted-foreground text-left flex items-center justify-start md:hidden">
                More to come...
              </span>
            </div>
            <span className="hidden md:block text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2 text-left">
              More to come...
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
