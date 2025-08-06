import React from 'react';
import Image from 'next/image';

export default function PerformanceSection() {
  return (
    <section className="w-full flex flex-col items-center py-6 px-2 md:px-8">
      {/* Top text block */}
      <div className="max-w-7xl w-full mx-auto mb-12">
        <h2 className="text-black dark:text-white text-2xl md:text-3xl lg:text-4xl font-light mb-4">
           Helium: Optimal Performance for Enterprise Deployment
        </h2>
        <p className="text-gray-500 dark:text-white/60 text-base md:text-lg mb-4">
          Helium is designed to be flexible and modular. It is composed of seven independent components:
        </p>
        <p className="text-gray-900 dark:text-white/90 text-base md:text-lg mb-4">
          <span className="font-semibold">Helios o1</span> – <span className="text-gray-500 dark:text-white/60">The foundation model that serves as the primary intelligence engine and can trigger and engage, assign and deliver via the sub models below</span>
        </p>
        <ul className="list-disc pl-6 text-gray-700 dark:text-white/90 text-base md:text-lg space-y-1">
          <li>H1 (HR) – <span className="text-gray-500 dark:text-white/60">Specialized for human resources, recruitment, and workforce analytics</span></li>
          <li>S1 (Sales) – <span className="text-gray-500 dark:text-white/60">Optimized for CRM, lead qualification, and revenue operations</span></li>
          <li>L1 (Legal) – <span className="text-gray-500 dark:text-white/60">Expert in contract analysis, compliance, and legal research</span></li>
          <li>F1 (Finance) – <span className="text-gray-500 dark:text-white/60">Focused on financial analysis, risk assessment, and regulatory reporting</span></li>
          <li>B1 (Operations) – <span className="text-gray-500 dark:text-white/60">Specialized in process optimization and supply chain management</span></li>
          <li>M1 (Marketing) – <span className="text-gray-500 dark:text-white/60">Trained for campaign optimization, customer insights, and market analysis</span></li>
        </ul>
      </div>

      {/* Helium Powered Actions heading */}
      <div className="max-w-7xl w-full mx-auto text-center mb-4 sm:mb-6 md:mb-8">
        <h3 className="text-black dark:text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-light mb-2 sm:mb-3">Built on Cutting-Edge Technology</h3>
        <p className="text-gray-700 dark:text-white/60 text-xs sm:text-sm md:text-base px-2 sm:px-0">
        Helium leverages the most advanced AI and infrastructure technologies to deliver unparalleled performance and reliability.
        </p>
      </div>

      {/* 4-column Feature Grid */}
      {/* <div className="max-w-7xl w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8 md:mb-12 px-3 sm:px-4 md:px-0">
        {[
          {
            title: 'Advanced Neural Networks',
            desc: 'Proprietary transformer architecture optimized for enterprise decision-making',
            tag: 'AI Core',
            icon: '/neuralarc/neural-network.png'
          },
          {
            title: 'Distributed Data Processing',
            desc: 'Scalable data pipeline handling petabytes of enterprise information',
            tag: 'Infrastructure',
            icon: '/neuralarc/data-processing.png'
          },
          {
            title: 'Zero-Trust Security',
            desc: 'End-to-end encryption with continuous threat monitoring',
            tag: 'Security',
            icon: '/neuralarc/security-icon.png'
          },
          {
            title: 'Edge Computing',
            desc: 'Low-latency processing with distributed edge deployment',
            tag: 'Performance',
            icon: '/neuralarc/edge-icon.png'
          },
          {
            title: 'Multi-Cloud Support',
            desc: 'Deploy on AWS, Azure, GCP, or on-premises infrastructure',
            tag: 'Deployment',
            icon: '/neuralarc/cloud-icon.png'
          },
          {
            title: 'Custom Model Training',
            desc: 'Domain-specific model fine-tuning for your business context',
            tag: 'AI Core',
            icon: '/neuralarc/custom-training.png'
          },
          {
            title: 'Real-Time Analytics',
            desc: 'Live performance monitoring and business intelligence',
            tag: 'Insights',
            icon: '/neuralarc/analytics-icon.png'
          },
          {
            title: 'Auto-Scaling',
            desc: 'Dynamic resource allocation based on demand patterns',
            tag: 'Performance',
            icon: '/neuralarc/autoscale-icon.png'
          }
        ].map(({ title, desc, tag, icon }) => (
          <div
            key={title}
            className="bg-white dark:bg-[#1a1a1a] border border-[#e5e7eb] dark:border-[#FFFFFF15] rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 lg:p-7 text-black dark:text-white flex flex-col shadow-lg hover:border-[#cbd5e1] dark:hover:border-[#FFFFFF25] transition-colors duration-200 min-h-[180px] sm:min-h-[200px] md:min-h-[220px] lg:aspect-square"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-auto lg:h-24">
                <Image
                  src={icon}
                  alt={title}
                  width={400}
                  height={400}
                  className="object-contain w-full h-full"
                />
              </div>
              <div className="text-xs flex-shrink-0 bg-gray-100 dark:bg-[#2a2a2a] text-black dark:text-white px-2 sm:px-3 py-1 rounded-full border border-[#FF522A38]">
                {tag}
              </div>
            </div>
            <h4 className="text-black dark:text-white text-base sm:text-lg md:text-xl font-medium mb-2 sm:mb-3">{title}</h4>
            <p className="text-gray-700 dark:text-white/60 text-sm sm:text-base leading-relaxed">{desc}</p>
          </div>
        ))}
      </div> */}
           {/* NEW: 5-column Super-Agent Grid */}
           <div className="max-w-7xl w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8 md:mb-12 px-3 sm:px-4 md:px-0">
        {[
          {
            title: 'SALES SUPER-AGENT',
            image: '/neuralarc/sales-super-agent.png'
          },
          {
            title: 'HUMAN RESOURCE SUPER-AGENT',
            image: '/neuralarc/hr-super-agent.png'
          },
          {
            title: 'OPERATIONS SUPER-AGENT',
            image: '/neuralarc/operations-super-agent.png'
          },
          {
            title: 'LEGAL SUPER-AGENT',
            image: '/neuralarc/legal-super-agent.png'
          },
          {
            title: 'FINANCE SUPER-AGENT',
            image: '/neuralarc/finance-super-agent.png'
          }
        ].map(({ title, image }) => (
          <div
            key={title}
            className="bg-white rounded-2xl shadow-md border border-gray-300 flex flex-col items-center text-center p-3 sm:p-4 md:p-5 lg:p-6 min-h-[220px]"
          >
            <Image
              src={image}
              alt={title}
              width={200}
              height={200}
              className="object-cover w-full h-auto rounded-[33px] mb-2"
              style={{ aspectRatio: '1/1' }}
            />
            <h4 className="text-gray-700 text-xs sm:text-sm font-medium uppercase tracking-wider mt-2 mb-1">{title}</h4>
          </div>
        ))}
      </div>

      {/* Bottom two-column feature block */}
      {/* <div className="max-w-7xl w-full mx-auto flex flex-col md:flex-row gap-0 rounded-3xl overflow-hidden bg-white dark:bg-[#232323] border border-[#e5e7eb] dark:border-[#FFFFFF12] shadow-md">
        
        <div className="flex-1 flex flex-col p-5 sm:p-8 md:p-10">
          <div className="flex items-center mb-3 sm:mb-4">
            <div className="flex items-center justify-center mr-3 sm:mr-4">
              <Image src="/neuralarc/workflow-icon.png" alt="Workflow Icon" width={200} height={200} className="w-16 sm:w-24 md:w-auto h-20 sm:h-30 object-contain" />
            </div>
            <h3 className="text-black dark:text-white text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-3xl font-semibold">
              Intelligent Workflow Automation
            </h3>
          </div>
          <p className="text-gray-600 dark:text-white/80 text-base sm:text-lg md:text-base lg:text-lg xl:text-xl mb-3 sm:mb-4">
            Orchestrate complex multi-agent systems with a single command. Helium intelligently coordinates specialized AI agents to collaborate seamlessly, executing sophisticated workflows in perfect harmony.
          </p>
          <ul className="list-disc pl-5 sm:pl-6 text-gray-700 dark:text-white/80 text-base sm:text-lg md:text-base lg:text-lg xl:text-xl space-y-1">
            <li>Real-time agent coordination</li>
            <li>Adaptive task distribution</li>
            <li>Synchronized execution pipelines</li>
          </ul>
        </div>
  
        <div className="block md:hidden w-full h-px bg-gradient-to-r from-transparent via-[#e5e7eb] dark:via-[#FFFFFF26] to-transparent" />
        <div className="hidden md:block w-px bg-gradient-to-b from-transparent via-[#e5e7eb] dark:via-[#FFFFFF26] to-transparent" />
     
        <div className="flex-1 flex flex-col p-5 sm:p-8 md:p-10">
          <div className="flex items-center mb-3 sm:mb-4">
            <div className="flex items-center justify-center mr-3 sm:mr-4">
              <Image src="/neuralarc/knowledge-icon.png" alt="Knowledge Icon" width={200} height={200} className="w-16 sm:w-24 md:w-auto h-20 sm:h-30 object-contain" />
            </div>
            <h3 className="text-black dark:text-white text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-3xl font-semibold">
              Dynamic Knowledge Integration
            </h3>
          </div>
          <p className="text-gray-600 dark:text-white/80 text-base sm:text-lg md:text-base lg:text-lg xl:text-xl mb-3 sm:mb-4">
            Transform any document or dataset into intelligent context. Upload PDFs, documents, and data files to create a rich knowledge foundation that enhances AI reasoning and delivers precision results.
          </p>
          <ul className="list-disc pl-5 sm:pl-6 text-gray-700 dark:text-white/80 text-base sm:text-lg md:text-base lg:text-lg xl:text-xl space-y-1">
            <li>Multi-format document processing</li>
            <li>Contextual memory enhancement</li>
            <li>Intelligent content synthesis</li>
          </ul>
        </div>
      </div> */}
    </section>
  );
}
