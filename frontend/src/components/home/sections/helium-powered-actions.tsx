'use client';

import React from 'react';
import Image from 'next/image';

// const features = [
//   {
//     image: '/strategic-service/image_1.png',
//     title: 'AI-Orchestrated Intelligence',
//     metric: '75% ↑',
//     description:
//       'Advanced reasoning capabilities that understand context, automate complex workflows, and deliver insights across all business functions.',
//     border: 'border-pink-200',
//   },
//   {
//     image: '/strategic-service/image_2.png',
//     title: 'Real-Time Decision Making',
//     metric: '90% accuracy',
//     description:
//       'Instant analysis and response capabilities for dynamic business environments with sub-second processing speeds.',
//     border: 'border-teal-200',
//   },
//   {
//     image: '/strategic-service/image_3.png',
//     title: 'Enterprise Security',
//     metric: '99.9% uptime',
//     description:
//       'Bank-grade security with end-to-end encryption, compliance monitoring, and advanced threat detection.',
//     border: 'border-pink-200',
//   },
//   {
//     image: '/strategic-service/image_4.png',
//     title: 'Global Scale',
//     metric: '60% savings',
//     description:
//       'Seamlessly scales across organizations of any size with distributed processing and intelligent load balancing.',
//     border: 'border-teal-200',
//   },
// ];

const features = [
  {
    image: '/strategic-service/voice-agent.png',
    title: 'VOICE AGENT',
  },
  {
    image: '/strategic-service/helium-brain.png',
    title: 'HELIUM BRAIN',
  },
  {
    image: '/strategic-service/knowledge-based.png',
    title: 'KNOWLEDGE BASE',
  },
  {
    image: '/strategic-service/helio-o1.png',
    title: 'HELIO o1 MODEL',
  },
];

export default function HeliumPoweredActions() {
  return (
    <section className="w-full flex justify-center items-center py-10">
      <div className="w-full max-w-6xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 px-2">
        {features.map((feature, idx) => (
          <div
            key={feature.title}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center p-5 transition-all duration-200 hover:shadow-md"
          >
            <div className="w-full aspect-square rounded-[33px] overflow-hidden mb-4 flex items-center justify-center bg-gray-50">
              <Image
                src={feature.image}
                alt={feature.title}
                width={180}
                height={180}
                className="object-cover w-full h-full rounded-[33px]"
                priority={idx === 0}
              />
            </div>
            <div className="text-center text-gray-800 text-lg font-medium tracking-wide mt-2">
              {feature.title}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
