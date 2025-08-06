import React from 'react';
import Image from 'next/image';

export default function NeuralArcSection() {
  return (
    <section className="w-full flex flex-col items-center py-6 px-2 md:px-8">
      {/* Top text block */}
      <div className="max-w-7xl w-full mx-auto mb-10">
        <h2 className="text-black dark:text-white text-2xl md:text-3xl lg:text-4xl font-light mb-4">
          We Built Helium with a brilliant Helio o1 model (God Mode)
        </h2>
        <p className="text-gray-500 dark:text-white/60 text-base md:text-lg mb-4">
          Large Language Models (LLMs) have transformed our ability to generate and reason about information. But on their own, they cannot excel in specialized business environments.<br /><br />
          We need AI that can:
        </p>
        <ul className="list-disc pl-6 text-gray-700 dark:text-white/90 text-base md:text-lg mb-4 space-y-1">
          <li>Understand department-specific contexts and terminology</li>
          <li>Make decisions based on business rules and compliance requirements</li>
          <li>Integrate seamlessly with existing enterprise systems</li>
          <li>Deliver consistent, reliable results at scale</li>
          <li>Know when a task requires human oversight and when it can proceed autonomously</li>
        </ul>
        <p className="text-gray-500 dark:text-white/60 text-base md:text-lg">
          Helium was built to fulfill this vision. To power it, we trained Helios o: a family of specialized, cost-effective models designed to bridge the gap between general AI capabilities and business-specific intelligence, enabling organizations to deploy AI that truly understands their unique operational requirements.
        </p>
      </div>
      {/* Chart images with descriptions */}
      <div className="w-full flex flex-col gap-12 mb-8">
        {/* First image block: Business Domain Performance Comparison */}
        <div className="flex flex-col items-center w-full max-w-6xl mx-auto">
          <Image src="/neuralarc/Helium-graph1.png" alt="Business Domain Performance Chart" width={700} height={400} className="object-contain w-full h-auto" />
          <p className="text-gray-400 dark:text-white/70 text-base md:text-lg lg:text-2xl mt-4 pb-4">
            Business Domain Performance Comparison: Helio o1 consistently outperforms major competitors across all enterprise-critical domains including document processing, knowledge retrieval, workflow automation, financial analysis, and security compliance
          </p>
        </div>
        {/* Second image block: Enterprise Cost Analysis */}
        <div className="flex flex-col items-center w-full max-w-6xl mx-auto">
          <Image src="/neuralarc/Helium-graph2.png" alt="Enterprise Cost Analysis" width={700} height={400} className="object-contain w-full h-auto" />
          <p className="text-gray-400 dark:text-white/70 text-base md:text-lg lg:text-2xl mt-4 pb-4">
            Enterprise Cost Analysis: Helio o1 delivers exceptional value with 76% cost savings versus GPT-4o mini and 96% savings versus Claude 3.5 Haiku while maintaining superior performance, making it ideal for high-volume enterprise deployments
          </p>
        </div>
        {/* Third image block: Enterprise AI Performance vs Cost Analysis */}
        {/* <div className="flex flex-col items-center w-full max-w-6xl mx-auto border-b border-b-[#e5e7eb] dark:border-b-[#FFFFFF26]">
          <Image src="/neuralarc/Helium-1.png" alt="Enterprise AI Performance vs Cost Analysis" width={700} height={400} className="object-contain w-full h-auto" />
          <p className="text-gray-400 dark:text-white/70 text-base md:text-lg lg:text-2xl mt-4 pb-4" >
            Enterprise AI Performance vs Cost Analysis: Helio o1 establishes optimal cost-effectiveness frontier with highest performance at lowest operational cost, delivering superior business value compared to all competing models
          </p>
        </div> */}
        {/* Fourth image block: Helio o1 Business AI Performance Benchmark */}
        <div className="flex flex-col items-center w-full max-w-6xl mx-auto border-b border-b-[#e5e7eb] dark:border-b-[#FFFFFF26]">
          <Image src="/neuralarc/Helium-graph3.png" alt="Helio o1 Business AI Performance Benchmark" width={700} height={400} className="object-contain w-full h-auto" />
          {/* <p className="text-gray-600 dark:text-white/70 text-base md:text-lg lg:text-2xl mt-4 pb-4">
            Helio o1 Business AI Performance Benchmark - Enterprise Model Comparison
          </p> */}
        </div>
      </div>
    </section>
  );
}
