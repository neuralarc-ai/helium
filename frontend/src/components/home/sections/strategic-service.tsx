import React from 'react';
import Image from 'next/image';

const cards = [
  {
    title: 'Accelerating Sales with AI-Orchestrated Lead Intelligence',
    text: `Helio o1 streamlines sales process by automating lead qualification, CRM enrichment, and presentation generation. The result was a 35% increase in conversions and a 70% boost in daily client meetings.`,
    img: '/strategic-service/strategy-1.png',
    imgPosition: 'bottom-right',
  },
  {
    title: 'Real-Time Financial Foresight at Scale',
    text: `Helio o1 automates cash flow forecasting, risk alerts, and receivables tracking. Which leads to a 90% forecast accuracy and over $2M in annual savings from improved financial operations.`,
    img: null,
  },
  {
    title: 'Scaling Talent Acquisition with Smart Agent Coordination',
    text: `Helium is an enterprise-grade language model built for real-time decision-making across functions like finance, legal, HR, and operations. With deep domain intelligence and seamless system integration, Helium serves as the cognitive core of modern enterprises.`,
    img: null,
  },
  {
    title: 'Contract Intelligence for Global Legal Operations',
    text: `Helio o1 can reduce contract review time from days to hours while achieving real-time compliance monitoring. Risk detection accuracy improved by 40%, enabling faster, safer deal closures.`,
    img: '/strategic-service/strategy-4.png',
    imgPosition: 'bottom-right',
  },
  {
    title: 'Hyper-Personalized Marketing at Scale with AI Orchestration',
    text: `RetailMax transformed campaign performance with real-time segmentation, predictive churn prevention, and automated content creation. They saw a 300% lift in campaign conversion and a 20% drop in churn.`,
    img: '/strategic-service/strategy-5.png',
    imgPosition: 'center-left',
  },
];

export default function StrategicServiceSection() {
  return (
    <section className="w-full py-8 sm:py-12 md:py-16 lg:py-20 px-2 sm:px-4 md:px-8 flex flex-col items-center">
      <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light text-white text-center mb-3 sm:mb-4 px-2">
        Helium Powered Actions
      </h2>
      <p className="text-white/60 text-center max-w-3xl mb-8 sm:mb-10 md:mb-12 px-2 sm:px-4 text-sm sm:text-base">
        Discover hypothetical scenarios that illustrate how Helium can be applied to solve complex business challenges. These case studies demonstrate the model's potential across a range of tasks, workflows, and decision-making contexts.
      </p>
      <div className="w-full max-w-7xl flex flex-col gap-4 sm:gap-6">
        {/* Row 1: 70% + 30% */}
        <div className="flex flex-col md:flex-row gap-4 sm:gap-6 w-full">
          <div className="relative bg-[#5E5E5E]/15 rounded-2xl sm:rounded-3xl min-h-[220px] sm:min-h-[260px] md:min-h-[328px] overflow-hidden w-full md:basis-[60%] md:max-w-[60%] group flex flex-col md:flex-row">
            {/* Left: Text */}
            <div className="flex flex-col justify-between h-full flex-1 p-4 sm:p-6 md:pl-8 md:pb-8 md:pt-8">
              <h3 className="text-white text-lg sm:text-xl md:text-2xl lg:text-[32px] mb-2 sm:mb-3 leading-tight">
                {cards[0].title}
              </h3>
              <p className="text-white/70 text-sm sm:text-base md:text-lg font-normal mb-4 leading-relaxed">
                {cards[0].text}
              </p>
            </div>
            {/* Right: Image */}
            {cards[0].img && (
              <div className="relative flex-shrink-0 flex items-end justify-end w-full md:w-[40%] h-32 md:h-full p-0 md:pr-4">
                <div className="absolute bottom-0 right-0 h-auto w-full md:w-auto transition-transform duration-300 ease-out translate-y-2 md:translate-y-4 group-hover:translate-y-1">
                  <Image 
                    src={cards[0].img} 
                    alt="card1" 
                    width={400} 
                    height={400} 
                    className="object-cover md:object-contain h-32 md:h-auto w-full md:w-auto rounded-b-2xl md:rounded-none" 
                  />
                </div>
              </div>
            )}
          </div>
          <div className="bg-[#5E5E5E]/15 rounded-2xl sm:rounded-3xl min-h-[120px] flex flex-col justify-between p-4 sm:p-6 md:p-8 w-full md:basis-[40%] md:max-w-[40%]">
            <h3 className="text-white text-lg sm:text-xl md:text-2xl lg:text-[32px] mb-1 sm:mb-2 md:mb-3 leading-tight">
              {cards[1].title}
            </h3>
            <p className="text-white/70 text-sm sm:text-base md:text-lg font-normal leading-relaxed">
              {cards[1].text}
            </p>
          </div>
        </div>
        {/* Row 2: 30% + 70% */}
        <div className="flex flex-col md:flex-row gap-4 sm:gap-6 w-full">
          <div className="bg-[#5E5E5E]/15 rounded-2xl sm:rounded-3xl min-h-[120px] flex flex-col justify-between p-4 sm:p-6 md:p-8 w-full md:basis-[40%] md:max-w-[40%]">
            <h3 className="text-white text-lg sm:text-xl md:text-2xl lg:text-[32px] mb-1 sm:mb-2 md:mb-3 leading-tight">
              {cards[2].title}
            </h3>
            <p className="text-white/70 text-sm sm:text-base md:text-lg font-normal leading-relaxed">
              {cards[2].text}
            </p>
          </div>
          <div className="relative bg-[#5E5E5E]/15 gap-4 sm:gap-6 rounded-2xl sm:rounded-3xl min-h-[220px] sm:min-h-[260px] md:min-h-[328px] overflow-hidden w-full md:basis-[60%] md:max-w-[60%] group flex flex-col md:flex-row">
            {/* Left: Text */}
            <div className="flex flex-col justify-between h-full flex-1 p-4 sm:p-6 md:pl-8 md:pb-8 md:pt-8">
              <h3 className="text-white text-lg sm:text-xl md:text-2xl lg:text-[32px] mb-2 sm:mb-3 leading-tight">
                {cards[3].title}
              </h3>
              <p className="text-white/70 text-sm sm:text-base md:text-lg font-normal mb-4 leading-relaxed">
                {cards[3].text}
              </p>
            </div>
            {/* Right: Image */}
            {cards[3].img && (
              <div className="relative flex-shrink-0 flex items-end justify-end w-full md:w-[40%] h-32 md:h-full p-0 md:pr-4">
                <div className="absolute bottom-0 right-0 h-auto w-full md:w-auto transition-transform duration-300 ease-out translate-y-2 md:translate-y-4 group-hover:translate-y-1">
                  <Image 
                    src={cards[3].img} 
                    alt="card4" 
                    width={400} 
                    height={400} 
                    className="object-cover md:object-contain h-32 md:h-auto w-full md:w-auto rounded-b-2xl md:rounded-none" 
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Row 3: full width (optional, can be enabled if needed) */}
        {/* <div className="bg-[#5E5E5E]/15 rounded-2xl sm:rounded-3xl min-h-[220px] sm:min-h-[260px] md:min-h-[328px] flex flex-col md:flex-row items-center justify-center p-4 sm:p-6 md:p-8 gap-4 sm:gap-6 w-full group">
          <div className="flex-shrink-0 flex items-center justify-center w-full md:w-[447px] h-[120px] sm:h-[200px] md:h-[248px] transition-transform duration-300 ease-out group-hover:scale-105">
            <Image src={cards[4].img} alt="card5" width={400} height={400} className="object-cover md:object-contain w-full md:w-[447px] h-[120px] sm:h-[200px] md:h-[248px] rounded-2xl md:rounded-none" />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <h3 className="text-white text-lg sm:text-xl md:text-2xl lg:text-[32px] mb-2 sm:mb-3 leading-tight">{cards[4].title}</h3>
            <p className="text-white/70 text-sm sm:text-base md:text-lg font-normal mb-4 leading-relaxed">{cards[4].text}</p>
            <button className="mt-4 mb-2 ml-2 px-4 sm:px-6 py-2 rounded-full bg-[#232323] text-white text-sm sm:text-base font-semibold flex items-center gap-2 shadow-lg hover:bg-[#333] transition-all">
              <svg width="16" height="16" sm:width="20" sm:height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="10" fill="#fff" fillOpacity="0.18"/><path d="M8 7L14 10L8 13V7Z" fill="white"/></svg>
              Replay Live Runs
            </button>
          </div>
        </div> */}
      </div>
    </section>
  );
}