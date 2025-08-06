import React, { useState } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
export const legalContent = {
  terms: {
    title: "Terms of Use",
    content: (
      <div className="space-y-4">
        <p>
          Welcome to Helium AI. By accessing or using
          https:/he2.ai (the "Platform"), you agree to be bound
          by these Terms of Use. If you do not agree, please do not use the
          Platform.
        </p>
        <div>
          <h3 className="font-semibold">Use of Platform</h3>
          <p>
            The Platform is provided for informational and experimental
            purposes only. You agree to use it in compliance with all
            applicable laws and regulations.
          </p>
        </div>
        <div>
          <h3 className="font-semibold">User Content</h3>
          <p>
            You are responsible for any content you input or generate using the
            Platform. Do not submit unlawful, harmful, or infringing content.
          </p>
        </div>
        <div>
          <h3 className="font-semibold">Intellectual Property</h3>
          <p>
            All content, trademarks, and intellectual property on the Platform
            are owned by NeuralArc Inc. its licensors. You may not copy,
            reproduce, or distribute any part of the Platform without
            permission.
          </p>
        </div>
        <div>
          <h3 className="font-semibold">Disclaimer of Warranties</h3>
          <p>
            The Platform is provided "as is" without warranties of any kind. We
            do not guarantee the accuracy, completeness, or reliability of any
            content or output.
          </p>
        </div>
        <div>
          <h3 className="font-semibold">Limitation of Liability</h3>
          <p>
            We are not liable for any damages arising from your use of the
            Platform, including direct, indirect, incidental, or consequential
            damages.
          </p>
        </div>
        <div>
          <h3 className="font-semibold">Changes to Terms</h3>
          <p>
            We may update these Terms of Use at any time. Continued use of the
            Platform constitutes acceptance of the revised terms.
          </p>
        </div>
        <div>
          <h3 className="font-semibold">Contact</h3>
          <p>
            For questions, contact us at: {" "}
            <a
              href="mailto:support@neuralarc.ai"
              className="text-blue-600 hover:underline"
            >
              support@neuralarc.ai
            </a>
          </p>
        </div>
        <p className="text-sm text-gray-500 pt-4 border-t border-gray-200">
          Last updated: May, 2025
        </p>
      </div>
    ),
  },
  disclaimer: {
    title: "Disclaimer",
    content: (
      <div className="space-y-4">
        <p>
          Please read this Disclaimer carefully before using the Platform.
        </p>
        <p>
          The tools and content available at https://he2.ai are
          provided "as is" and are intended for informational and experimental
          purposes only. By using the Platform, you acknowledge and agree to
          the following:
        </p>
        <div>
          <h3 className="font-semibold text-lg">No Professional Advice</h3>
          <p>
            The AI-generated outputs are not a substitute for professional
            advice in:
          </p>
          <ul className="list-disc list-inside pl-4 mt-2">
            <li>Legal</li>
            <li>Medical</li>
            <li>Financial</li>
            <li>Psychological</li>
            <li>or any other regulated domain.</li>
          </ul>
          <p className="mt-2">Always consult a licensed professional.</p>
        </div>
        <div>
          <h3 className="font-semibold text-lg">Limitation of Liability</h3>
          <p>We shall not be held liable for:</p>
          <ul className="list-disc list-inside pl-4 mt-2">
            <li>
              Any direct or indirect loss or damage arising from reliance on AI
              outputs.
            </li>
            <li>Errors, inaccuracies, or omissions in the AI-generated content.</li>
            <li>Unintended consequences or misuse of AI tools.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-lg">User Responsibility</h3>
          <p>You are solely responsible for:</p>
          <ul className="list-disc list-inside pl-4 mt-2">
            <li>The content you input into the system.</li>
            <li>How you use and interpret the output.</li>
            <li>
              Ensuring your use complies with applicable laws and ethical
              norms.
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-lg">AI Limitations</h3>
          <p>Our AI tools may:</p>
          <ul className="list-disc list-inside pl-4 mt-2">
            <li>Generate incorrect or misleading results.</li>
            <li>Fail to understand context or nuance.</li>
            <li>Produce biased or inappropriate content.</li>
          </ul>
          <p className="mt-2">
            Use discretion and critical judgment when using the Platform.
          </p>
        </div>
        <p className="text-sm text-gray-500 pt-4 border-t border-gray-200">
          Last updated: May, 2025
        </p>
      </div>
    ),
  },
  "responsible-ai": {
    title: "Responsible & Ethical AI Policies",
    content: (
      <div className="space-y-4">
        <h3 className="font-semibold text-xl">Responsible AI & Disclaimer</h3>
        <p>
          We are committed to developing and deploying AI responsibly. AI
          technologies hosted on https://he2.ai are designed to
          augment human decision-making, not replace it.
        </p>
        <div>
          <h4 className="font-semibold text-lg">Our Principles</h4>
          <div className="pl-4 mt-2 space-y-3">
            <div>
              <h5 className="font-semibold">Transparency</h5>
              <ul className="list-disc list-inside pl-4">
                <li>Clear communication when users are interacting with AI.</li>
                <li>
                  Explanation of how results are generated wherever feasible.
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold">Human Oversight</h5>
              <ul className="list-disc list-inside pl-4">
                <li>
                  AI suggestions or outputs should be reviewed by a qualified
                  human.
                </li>
                <li>
                  Critical or sensitive decisions (e.g., legal or health
                  matters) must not be made solely based on AI output.
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold">Robustness and Safety</h5>
              <ul className="list-disc list-inside pl-4">
                <li>
                  We test AI systems to identify and minimize errors and
                  unintended consequences.
                </li>
                <li>
                  Feedback mechanisms are built to report inappropriate or
                  harmful behavior.
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold">Privacy-Aware Design</h5>
              <ul className="list-disc list-inside pl-4">
                <li>Minimal collection of personal data.</li>
                <li>Short-term retention of user inputs (only if necessary).</li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold">Purpose Limitation</h5>
              <p>
                AI tools are deployed only for clearly defined, ethical, and
                socially beneficial use cases.
              </p>
            </div>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-lg">Ethical AI Guidelines</h4>
          <p>
            We believe AI should benefit all users and be governed by
            principles that uphold fairness, accountability, and human dignity.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-lg">Key Values</h4>
          <div className="pl-4 mt-2 space-y-3">
            <div>
              <h5 className="font-semibold">Fairness & Non-Discrimination</h5>
              <ul className="list-disc list-inside pl-4">
                <li>
                  Our AI models are evaluated to reduce bias and promote
                  inclusive use.
                </li>
                <li>
                  Discriminatory or harmful content generation is actively
                  monitored and filtered.
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold">Accountability</h5>
              <ul className="list-disc list-inside pl-4">
                <li>
                  We accept responsibility for the behavior and consequences of
                  our AI systems.
                </li>
                <li>
                  We encourage users to report concerns via {" "}
                  <a
                    href="mailto:support@neuralarc.ai"
                    className="text-blue-600 hover:underline"
                  >
                    support@neuralarc.ai
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold">Autonomy</h5>
              <ul className="list-disc list-inside pl-4">
                <li>
                  Users are empowered to understand and control their
                  interaction with AI.
                </li>
                <li>AI should never manipulate, coerce, or deceive.</li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold">Do No Harm</h5>
              <ul className="list-disc list-inside pl-4">
                <li>
                  We design AI tools with safeguards to prevent misuse, harm, or
                  exploitation.
                </li>
                <li>Malicious use of AI tools is prohibited.</li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold">Accessibility</h5>
              <p>
                We strive to make the Platform accessible and usable by people
                of all backgrounds and abilities.
              </p>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-500 pt-4 border-t border-gray-200">
          Last updated: May, 2025
        </p>
      </div>
    ),
  },
        
  privacy: {
    title: "Privacy Policy",
    content: (
      <div className="space-y-4">
        <p>
          Helium AI ("Platform," "we," "us," or "our") is committed to
          protecting your privacy. This Privacy Policy outlines how we
          collect, use, disclose, and safeguard your information when you
          visit our Platform, including any AI-based tools or services we
          provide.
        </p>
        <div>
          <h3 className="font-semibold text-lg">
            1. Information We Collect
          </h3>
          <p>We may collect the following types of information:</p>
          <div className="pl-4 mt-2 space-y-2">
            <div>
              <h4 className="font-semibold">a. Personal Information</h4>
              <p>Information you voluntarily provide, such as:</p>
              <ul className="list-disc list-inside pl-4">
                <li>Name</li>
                <li>Email address</li>
                <li>Any additional contact details</li>
                <li>
                  Content or inputs provided to AI tools (if associated with a
                  user identity)
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">b. Usage Data</h4>
              <p>Automatically collected information such as:</p>
              <ul className="list-disc list-inside pl-4">
                <li>IP address</li>
                <li>Browser type and version</li>
                <li>Operating system</li>
                <li>Date and time of your visit</li>
                <li>Pages viewed and time spent</li>
                <li>Referring/exit pages</li>
                <li>Clickstream data</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">
                c. Cookies and Tracking Technologies
              </h4>
              <p>
                We use cookies, pixels, and similar technologies for analytics
                and functionality. You can disable cookies through your browser
                settings.
              </p>
            </div>
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-lg">
            2. How We Use Your Information
          </h3>
          <p>We use collected information for the following purposes:</p>
          <ul className="list-disc list-inside pl-4 mt-2">
            <li>To operate, manage, and maintain the Platform.</li>
            <li>To improve the performance and accuracy of AI systems.</li>
            <li>To personalize your experience.</li>
            <li>To respond to queries or support requests.</li>
            <li>For data analysis and system monitoring.</li>
            <li>To comply with legal obligations.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-lg">3. Sharing and Disclosure</h3>
          <p>
            We do not sell your data. However, we may share your data in the
            following situations:
          </p>
          <ul className="list-disc list-inside pl-4 mt-2">
            <li>
              With service providers who support our infrastructure, under
              strict data protection agreements.
            </li>
            <li>
              With law enforcement or government agencies when required by law.
            </li>
            <li>
              In case of business transitions, such as mergers or acquisitions.
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-lg">
            4. Data Storage and Security
          </h3>
          <p>We employ industry-standard security practices including:</p>
          <ul className="list-disc list-inside pl-4 mt-2">
            <li>SSL encryption</li>
            <li>Access control protocols</li>
            <li>Regular vulnerability scans</li>
          </ul>
          <p className="mt-2">
            Despite our efforts, no digital transmission or storage system is
            completely secure. Use at your own discretion.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-lg">5. Your Rights</h3>
          <p>
            Depending on your jurisdiction, you may have the following rights:
          </p>
          <ul className="list-disc list-inside pl-4 mt-2">
            <li>Access to your data</li>
            <li>Correction of inaccurate data</li>
            <li>Deletion or restriction of processing</li>
            <li>Data portability</li>
            <li>Withdrawal of consent</li>
            <li>Lodging a complaint with a regulatory authority</li>
          </ul>
          <p className="mt-2">
            For inquiries, contact us at:{" "}
            <a
              href="mailto:support@neuralarc.ai"
              className="text-blue-600 hover:underline"
            >
              support@neuralarc.ai
            </a>
          </p>
        </div>
        <p className="text-sm text-gray-500 pt-4 border-t border-gray-200">
          Last updated: May, 2025
        </p>
      </div>
    ),
  }

};

type LegalTopic = keyof typeof legalContent;
export const Footer: React.FC = () => {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [activeTopic, setActiveTopic] = useState<LegalTopic | null>(null);

  const openDialog = (topic: LegalTopic) => {
    setActiveTopic(topic);
    setDialogOpen(true);
  };

  const LinkButton = ({ topic, children }: { topic: LegalTopic; children: React.ReactNode }) => (
    <button
      onClick={() => openDialog(topic)}
      className="underline underline-offset-2 transition-colors hover:text-white focus-visible:text-white cursor-pointer"
    >
      {children}
    </button>
  );

  return (
    <footer
      className="w-[calc(100%-2rem)] sm:w-[calc(100%-3rem)] md:w-[calc(100%-4rem)] lg:w-[calc(100%-5rem)] xl:w-[calc(100%-6rem)] max-w-7xl mx-auto min-h-[200px] sm:min-h-[240px] md:min-h-[276px] rounded-2xl sm:rounded-3xl px-4 sm:px-6 md:px-8 lg:px-10 py-6 sm:py-8 my-4 sm:my-6 flex flex-col justify-between bg-cover bg-center relative"
      style={{ backgroundImage: "url('/neuralarc/footer.png')" }}
    >
      {/* Top: Logo and name */}
      <div className="flex items-center gap-4 mb-8 mt-2">
        <Image
          src="/Helium_logo.png"
          alt="Helium Orb"
          width={40}
          height={40}
          className="w-auto h-10 rounded-full object-cover"
        />
        {/* <span className="text-xl sm:text-2xl md:text-3xl font-light text-white/90 tracking-wide">Helium</span> */}
      </div>
      {/* Bottom: Links and copyright */}
      <div className="flex flex-col sm:flex-col md:flex-col lg:flex-col xl:flex-row items-center sm:items-center md:items-center lg:items-center xl:items-end justify-center sm:justify-center md:justify-center lg:justify-center xl:justify-between w-full flex-1 gap-6 sm:gap-4 md:gap-4 lg:gap-4 xl:gap-6 2xl:gap-8">
        {/* Legal links */}
        <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-1 md:gap-2 text-xs sm:text-xs md:text-sm lg:text-base text-white/80 text-center sm:text-center md:text-center lg:text-center xl:text-left whitespace-nowrap">
          <LinkButton topic="terms">Terms of use</LinkButton>
          <span className="hidden sm:inline mx-1">•</span>
          <LinkButton topic="privacy">Privacy Policy</LinkButton>
          <span className="hidden sm:inline mx-1">•</span>
          <LinkButton topic="disclaimer">Disclaimer</LinkButton>
          <span className="hidden sm:inline mx-1">•</span>
          <LinkButton topic="responsible-ai">Responsible &amp; Ethical AI</LinkButton>
        </div>
        {/* Copyright and logo */}
        <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-2 md:gap-3 text-xs sm:text-xs md:text-sm lg:text-base text-white/80 text-center sm:text-center md:text-center lg:text-center xl:text-left flex-shrink-0">
          <span className="whitespace-nowrap">Copyright 2025. All rights reserved.</span>
          <div className="flex items-center gap-1 sm:gap-1 md:gap-2">
            <span className="whitespace-nowrap">A Thing By</span>
            <Image src="/neuralarc.svg" alt="NeuralArc Logo" width={100} height={100} className="object-contain h-4 w-16 sm:h-4 sm:w-16 md:h-5 md:w-20 lg:h-6 lg:w-24 xl:h-7 xl:w-28 flex-shrink-0" />
          </div>
        </div>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-[#202020] text-white">
          {activeTopic && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-white">
                  {legalContent[activeTopic].title}
                </DialogTitle>
              </DialogHeader>
              <div className="py-4 text-white max-h-[70vh] overflow-y-auto pr-2">
                {legalContent[activeTopic].content}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </footer>
  );
}; 