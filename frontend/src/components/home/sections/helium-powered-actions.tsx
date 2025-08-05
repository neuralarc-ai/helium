'use client';

import React from 'react';
import Image from 'next/image';

const features = [
  {
    image: '/strategic-service/image-1.png',
    title: 'AI-Orchestrated Intelligence',
    metric: '75% ↑',
    description:
      'Advanced reasoning capabilities that understand context, automate complex workflows, and deliver insights across all business functions.',
  },
  {
    image: '/strategic-service/image2.png',
    title: 'Real-Time Decision Making',
    metric: '90% accuracy',
    description:
      'Instant analysis and response capabilities for dynamic business environments with sub-second processing speeds.',
  },
  {
    image: '/strategic-service/image3.png',
    title: 'Enterprise Security',
    metric: '99.9% uptime',
    description:
      'Bank-grade security with end-to-end encryption, compliance monitoring, and advanced threat detection.',
  },
  {
    image: '/strategic-service/image4.png',
    title: 'Global Scale',
    metric: '60% savings',
    description:
      'Seamlessly scales across organizations of any size with distributed processing and intelligent load balancing.',
  },
];

export default function HeliumPoweredActions() {
  return (
    <section className="w-full pt-10 px-4 sm:px-6 md:px-8 flex flex-col items-center">
      {/* Heading */}
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-white text-center mb-4">
      Smart Systems. Real Impact.
      </h2>

      {/* Subheading */}
      <p className="text-white/60 text-center w-full mb-10 text-base sm:text-lg">
      Unlock AI-driven intelligence, speed, security, and scalability—built to elevate modern enterprise operations.
      </p>

      {/* Feature Cards Grid */}
      <div className="w-full max-w-7xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => (
          <div
            key={index}
            className="bg-[#5E5E5E]/15 hover:bg-[#5E5E5E]/20 transition-all duration-300 rounded-3xl p-6 flex flex-col justify-start"
          >
            {/* Icon + Metric Badge */}
            <div className="flex items-center justify-between mb-4">
              <Image
                src={feature.image}
                alt={feature.title}
                width={64}
                height={64}
                className="w-20 h-20 object-contain "
              />

              <span
                className="px-4 py-1 rounded-full text-sm font-medium text-white"
                style={{
                  border: '1px solid #FF522A38',
                  borderRadius: '9999px',
                  boxShadow: '0 0 6px rgba(122, 39, 11, 0.25)',
                }}
              >
                {feature.metric}
              </span>
            </div>

            {/* Title + Description */}
            <div className="flex flex-col gap-3">
              <h3 className="text-white text-xl md:text-2xl font-semibold leading-tight h-15 ">
                {feature.title}
              </h3>
              <p className="text-white/70 text-base leading-relaxed">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
