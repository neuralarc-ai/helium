import React from 'react';
import Image from 'next/image';

const cards = [
  {
    title: 'Executive Performance Dashboard for Strategic Decision-Making',
    // description: 'Create a comprehensive executive dashboard that shows:',
    list: [
      'Visualizes revenue trends and profit margin fluctuations over time for financial clarity.',     
      'Analyzes customer acquisition vs. churn to assess retention strategies and market effectiveness.',
      'Tracks employee productivity, headcount growth, and operational efficiency metrics.',
      'Benchmarks company performance against competitors to evaluate market positioning.',
    ],
    img: '/strategic-service/strategy-2.png',
    imgPosition: 'right',
    button: 'over-image',
    buttonText: 'Replay Live Runs'
  },
  {
    title:'Optimal Team Allocation & Strategic Resource Planning',
    // description: 'GreenTech Manufacturing leveraged Helios o1 to automate cash flow forecasting, risk alerts, and receivables tracking. This led to a 90% forecast accuracy and over $2M in annual savings from improved financial operations.',
    list: [
      'Aligns team members to projects by matching skills, experience, and availability for maximum efficiency.',     
      'Identifies organizational skill gaps and recommends targeted training programs.',
      'Balances utilization rates to boost productivity while minimizing burnout risk.',
      'Designs adaptive roster schedules that respond to shifting project priorities in real time.',
    ],
    img: null,
    button: 'top-right',
    buttonText: 'Replay Live Runs'
  },
  {
    title: 'Contract Risk Assessment & Legal Compliance Optimization',
    // description: 'Helium is an enterprise-grade language model built for real-time decision-making across functions like finance, legal, HR, and operations. With deep domain intelligence and seamless system integration, Helium serves as the cognitive core of modern enterprises.',
    list: [
      'Evaluates all contracts for compliance gaps, risk exposure, and renewal timelines.',     
      'Flags high-risk contracts and those nearing expiration for immediate legal review.',
      'Recommends standardized contract language and structure to minimize legal inconsistencies.',
      'Analyzes the sample legal agreement to detect conflicting clauses, ambiguities, and potential dispute triggers.',
    ],
    img: null,
    button: 'left',
    buttonText: 'Replay Live Runs'
  },
  {
    title: 'Revenue Forecasting & Risk Assessment for Strategic Growth',
    // description: 'GlobalTech used Helios o1 to reduce contract review time from days to hours while achieving real-time compliance monitoring. Risk detection accuracy improved by 40%, enabling faster, safer deal closures.',
    list: [
      'Analyzes quarterly revenue trends across all accounts to uncover growth patterns and seasonal shifts.',     
      'Assesses renewal probabilities and highlights revenue at risk to prioritize retention efforts.',
      'Detects high-risk accounts requiring urgent intervention through performance decline signals.',
      'Delivers industry-specific forecasts and evaluates associated tax implications for informed planning.',
    ],
    img: '/strategic-service/strategy-3.png',
    imgPosition: 'right',
    button: 'left',
    buttonText: 'Replay Live Runs'
  },
];

export default function StrategicServiceSection() {
  return (
    <section className="w-full py-12 px-2 sm:px-4 md:px-8 flex flex-col items-center bg-white">
      <h2 className="text-gray-900 text-3xl sm:text-4xl md:text-5xl font-light text-center mb-3 sm:mb-4 px-2">
        Helium Powered Actions
      </h2>
      <p className="text-gray-600 text-center max-w-3xl mb-8 sm:mb-10 md:mb-12 px-2 sm:px-4 text-base">
        Discover hypothetical scenarios that illustrate how Helium can be applied to solve complex business challenges. These case studies demonstrate the model's potential across a range of tasks, workflows, and decision-making contexts.
      </p>
      <div className="w-full max-w-7xl flex flex-col gap-6">
        {/* Row 1 */}
        <div className="flex flex-col lg:flex-row gap-6 w-full">
          {/* Card 1: Text left, image right, button over image */}
          <div className="relative bg-white rounded-2xl border border-gray-200 shadow-md min-h-[220px] flex flex-col lg:flex-row w-full mx-auto sm:max-w-[560px] md:max-w-[700px] lg:max-w-[60%] lg:basis-[60%] overflow-hidden">
            <div className="order-2 lg:order-1 flex flex-col justify-between h-full flex-1 p-6 text-left">
              <h3 className="text-gray-700 text-2xl font-semibold mb-2 leading-tight text-center lg:text-left">
                {cards[0].title}
              </h3>
              <ol className="text-gray-500 text-base font-normal mb-4 leading-relaxed list-decimal list-outside space-y-2 pl-5">
                {cards[0].list.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ol>
            </div>
            {cards[0].img && (
              <div className="order-1 lg:order-2 relative w-full lg:w-[40%] h-48 md:h-60 lg:h-auto">
                <Image
                  src={cards[0].img}
                  alt="card1"
                  fill
                  className="object-cover"
                />
                {/* Button over image */}
                {cards[0].button === 'over-image' && (
                  <div className="absolute bottom-4 right-7">
                    <button className="liquid-glass-btn bg-gradient-to-r from-pink-400 to-blue-500 rounded-full text-black text-sm px-4 py-1.5 flex items-center gap-1.5 backdrop-blur-lg transition-all duration-300 strategic-card-btn cursor-pointer">
                      <span className="liquid-glass-gradient-border rounded-full"></span>
                      {cards[0].buttonText}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 6V18L18 12L8 6Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Card 2: Text only, button top-right on large screens, under text on small screens */}
          <div className="relative bg-white rounded-2xl border border-gray-200 shadow-md min-h-[220px] flex flex-col justify-between p-6 w-full mx-auto sm:max-w-[560px] md:max-w-[700px] lg:max-w-[40%] lg:basis-[40%] text-left">
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-start">
                <h3 className="text-gray-700 text-2xl font-semibold mb-2 leading-tight flex-1 text-center lg:text-left">
                  {cards[1].title}
                </h3>
                {cards[1].button === 'top-right' && (
                  <div className="hidden xl:block ml-4">
                    <button className="liquid-glass-btn bg-gradient-to-r from-pink-400 to-blue-500 rounded-full text-black text-sm px-4 py-1.5 flex items-center gap-1.5 backdrop-blur-lg transition-all duration-300 strategic-card-btn cursor-pointer">
                      <span className="strategic-service-btn rounded-full"></span>
                      {cards[1].buttonText}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 6V18L18 12L8 6Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              <ol className="text-gray-500 text-base font-normal leading-relaxed list-decimal list-outside space-y-2 pl-5 mb-4">
                {cards[1].list.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ol>
              {cards[1].button === 'top-right' && (
                <div className="xl:hidden mt-4 w-fit self-end">
                  <button className="liquid-glass-btn bg-gradient-to-r from-pink-400 to-blue-500 rounded-full text-black text-sm px-4 py-1.5 flex items-center gap-1.5 backdrop-blur-lg transition-all duration-300 whitespace-nowrap strategic-card-btn cursor-pointer">
                    <span className="strategic-service-btn rounded-full"></span>
                    {cards[1].buttonText}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 6V18L18 12L8 6Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Row 2 */}
        <div className="flex flex-col lg:flex-row gap-6 w-full">
          {/* Card 3: Text only, button left-aligned below text */}
          <div className="relative bg-white rounded-2xl border border-gray-200 shadow-md min-h-[220px] flex flex-col justify-between p-6 w-full mx-auto sm:max-w-[560px] md:max-w-[700px] lg:max-w-[40%] lg:basis-[40%] text-left">
            <h3 className="text-gray-700 text-2xl font-semibold mb-2 leading-tight text-center lg:text-left">
              {cards[2].title}
            </h3>
            <ol className="text-gray-500 text-base font-normal leading-relaxed list-decimal list-outside space-y-2 pl-5 mb-4">
              {cards[2].list.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ol>
            {cards[2].button === 'left' && (
              <div className="flex justify-end lg:justify-start w-full mt-2">
                <button className="liquid-glass-btn  rounded-full text-black text-sm px-4 py-1.5 flex items-center gap-1.5 backdrop-blur-lg transition-all duration-300 strategic-card-btn cursor-pointer">
                  <span className="strategic-service-btn rounded-full"></span>
                  {cards[2].buttonText}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 6V18L18 12L8 6Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
          {/* Card 4: Text left, image right, button left-aligned below text */}
          <div className="relative bg-white rounded-2xl border border-gray-200 shadow-md min-h-[220px] flex flex-col lg:flex-row w-full mx-auto sm:max-w-[560px] md:max-w-[700px] lg:max-w-[60%] lg:basis-[60%] overflow-hidden">
            <div className="order-2 lg:order-1 flex flex-col justify-between h-full flex-1 p-6 text-left">
              <h3 className="text-gray-700 text-2xl font-semibold mb-2 leading-tight text-center lg:text-left">
                {cards[3].title}
              </h3>
              <ol className="text-gray-500 text-base font-normal mb-4 leading-relaxed list-decimal list-outside space-y-2 pl-5">
                {cards[3].list.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ol>
            </div>
            {/* Image on right with button overlay */}
            {cards[3].img && (
              <div className="order-1 lg:order-2 w-full lg:w-[45%] h-48 md:h-60 lg:h-auto relative">
                <Image
                  src={cards[3].img}
                  alt="card4"
                  fill
                  className="object-cover"
                />
                {cards[3].button === 'left' && (
                  <div className="absolute bottom-4 right-10">
                    <button className="liquid-glass-btn bg-gradient-to-r from-pink-400 to-blue-500 rounded-full text-black text-sm px-4 py-1.5 flex items-center gap-1.5 backdrop-blur-lg transition-all duration-300 whitespace-nowrap strategic-card-btn cursor-pointer">
                      <span className="liquid-glass-gradient-border rounded-full"></span>
                      {cards[3].buttonText}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 6V18L18 12L8 6Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}