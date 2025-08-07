import React from 'react';
import Image from 'next/image';

const cards = [
  {
    title: 'Management Dashboards & Real-Time Decision Making',
    description: 'Create a comprehensive executive dashboard that shows:',
    list: [
      'Revenue trends and profit margin analysis over time',
      'Customer acquisition vs churn patterns',
      'Employee productivity and growth metrics',
      'Market positioning relative to competitors',
      'Key performance indicators with predictive insights',
    ],
    img: '/strategic-service/strategy-2.png',
    imgPosition: 'right',
    button: 'over-image',
    buttonText: 'Replay Live Runs'
  },
  {
    title: (
      <>
        Real-Time<br/> Financial <br /> Foresight at Scale
      </>
    ),
    description: 'GreenTech Manufacturing leveraged Helios o1 to automate cash flow forecasting, risk alerts, and receivables tracking. This led to a 90% forecast accuracy and over $2M in annual savings from improved financial operations.',
    img: null,
    button: 'top-right',
    buttonText: 'Replay Live Runs'
  },
  {
    title: 'Scaling Talent Acquisition with Smart Agent',
    description: 'Helium is an enterprise-grade language model built for real-time decision-making across functions like finance, legal, HR, and operations. With deep domain intelligence and seamless system integration, Helium serves as the cognitive core of modern enterprises.',
    img: null,
    button: 'left',
    buttonText: 'Replay Live Runs'
  },
  {
    title: 'Contract Intelligence for Legal Operations',
    description: 'GlobalTech used Helios o1 to reduce contract review time from days to hours while achieving real-time compliance monitoring. Risk detection accuracy improved by 40%, enabling faster, safer deal closures.',
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
        <div className="flex flex-col md:flex-row gap-6 w-full">
          {/* Card 1: Text left, image right, button over image */}
          <div className="relative bg-white rounded-2xl border border-gray-200 shadow-md min-h-[220px] flex flex-col md:flex-row w-full md:basis-[60%] md:max-w-[60%] overflow-hidden">
            <div className="flex flex-col justify-between h-full flex-1 p-6 text-left">
              <h3 className="text-gray-900 text-2xl font-semibold mb-2 leading-tight">
                {cards[0].title}
              </h3>
              <p className="text-gray-700 text-base font-normal mb-2 leading-relaxed">
                {cards[0].description}
              </p>
              <ol className="text-gray-700 text-base font-normal mb-4 leading-relaxed list-decimal list-inside pl-2">
                {cards[0].list.map((item, i) => (
                  <li key={i} className="mb-1">{item}</li>
                ))}
              </ol>
            </div>
            {cards[0].img && (
              <div className="relative w-full md:w-[40%] h-48 md:h-auto">
                <Image
                  src={cards[0].img}
                  alt="card1"
                  fill
                  className="object-cover"
                />
                {/* Button over image */}
                {cards[0].button === 'over-image' && (
                  <button className="absolute bottom-4 right-6 bg-white border border-gray-300 text-gray-700 text-sm px-6 py-2 rounded-full shadow-md hover:bg-gray-100 transition-colors flex items-center gap-2">
                    {cards[0].buttonText}
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="10" fill="#fff" fillOpacity="0.18"/><path d="M8 7L14 10L8 13V7Z" fill="#6B7280"/></svg>
                  </button>
                )}
              </div>
            )}
          </div>
          {/* Card 2: Text only, button top-right, heading with line breaks */}
          <div className="relative bg-white rounded-2xl border border-gray-200 shadow-md min-h-[220px] flex flex-col justify-between p-6 w-full md:basis-[40%] md:max-w-[40%] text-left">
            {cards[1].button === 'top-right' && (
              <div className="absolute top-4 right-4">
                <button className="bg-white border border-gray-300 text-gray-700 text-sm px-6 py-2 rounded-full shadow-md hover:bg-gray-100 transition-colors flex items-center gap-2">
                  {cards[1].buttonText}
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="10" fill="#fff" fillOpacity="0.18"/><path d="M8 7L14 10L8 13V7Z" fill="#6B7280"/></svg>
                </button>
              </div>
            )}
            <h3 className="text-gray-900 text-2xl font-semibold mb-2 leading-tight">
              {cards[1].title}
            </h3>
            <p className="text-gray-700 text-base font-normal leading-relaxed">
              {cards[1].description}
            </p>
          </div>
        </div>
        {/* Row 2 */}
        <div className="flex flex-col md:flex-row gap-6 w-full">
          {/* Card 3: Text only, button left-aligned below text */}
          <div className="relative bg-white rounded-2xl border border-gray-200 shadow-md min-h-[220px] flex flex-col justify-between p-6 w-full md:basis-[40%] md:max-w-[40%] text-left">
            <h3 className="text-gray-900 text-2xl font-semibold mb-2 leading-tight">
              {cards[2].title}
            </h3>
            <p className="text-gray-700 text-base font-normal leading-relaxed mb-4">
              {cards[2].description}
            </p>
            {cards[2].button === 'left' && (
              <div className="flex justify-start w-full mt-2">
                <button className="bg-white border border-gray-300 text-gray-700 text-sm px-6 py-2 rounded-full shadow-md hover:bg-gray-100 transition-colors flex items-center gap-2">
                  {cards[2].buttonText}
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="10" fill="#fff" fillOpacity="0.18"/><path d="M8 7L14 10L8 13V7Z" fill="#6B7280"/></svg>
                </button>
              </div>
            )}
          </div>
          {/* Card 4: Text left, image right, button left-aligned below text */}
          <div className="relative bg-white rounded-2xl border border-gray-200 shadow-md min-h-[220px] flex flex-col md:flex-row w-full md:basis-[60%] md:max-w-[60%] overflow-hidden">
            <div className="flex flex-col justify-between h-full flex-1 p-6 text-left">
              <h3 className="text-gray-900 text-2xl font-semibold mb-2 leading-tight">
                {cards[3].title}
              </h3>
              <p className="text-gray-700 text-base font-normal mb-4 leading-relaxed">
                {cards[3].description}
              </p>
              {cards[3].button === 'left' && (
                <div className="flex justify-start w-full mt-2">
                  <button className="bg-white border border-gray-300 text-gray-700 text-sm px-6 py-2 rounded-full shadow-md hover:bg-gray-100 transition-colors flex items-center gap-2">
                    {cards[3].buttonText}
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="10" fill="#fff" fillOpacity="0.18"/><path d="M8 7L14 10L8 13V7Z" fill="#6B7280"/></svg>
                  </button>
                </div>
              )}
            </div>
            {cards[3].img && (
              <div className="relative w-full md:w-[40%] h-48 md:h-auto">
                <Image
                  src={cards[3].img}
                  alt="card4"
                  fill
                  className="object-cover"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}