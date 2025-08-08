import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedShinyText } from '@/components/ui/animated-shiny-text';

const items = [
  { id: 1, content: "Connecting to Helium Core..." },
  { id: 2, content: "o1 is decoding user intent..." },
  { id: 3, content: "Routing task through Helium’s neural grid..." },
  { id: 4, content: "Helium Core is evaluating optimal strategy..." },
  { id: 5, content: "o1 is scanning cognitive modules..." },
  { id: 6, content: "Establishing link with artifact systems..." },
  { id: 7, content: "Deploying agent protocols from Core memory..." },
  { id: 8, content: "Synchronizing with LLM orchestration layer..." },
  { id: 9, content: "Helium Core initiating agent collaboration..." },
  { id: 10, content: "o1 is constructing semantic scaffold..." },
  { id: 11, content: "Query embedded into Core's reasoning matrix..." },
  { id: 12, content: "Helium Core is aligning response parameters..." },
  { id: 13, content: "Engaging recursive agent feedback loop..." },
  { id: 14, content: "o1 consolidating knowledge streams..." },
  { id: 15, content: "Finalizing insight with Helium Core precision..." },
  { id: 16, content: "Response encrypted and released by o1..." }
  ];

export const AgentLoader = () => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setIndex((state) => {
        if (state >= items.length - 1) return 0;
        return state + 1;
      });
    }, 1500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex py-2 items-center w-full">
            <AnimatePresence>
            <motion.div
                key={items[index].id}
                initial={{ y: 20, opacity: 0, filter: "blur(8px)" }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                exit={{ y: -20, opacity: 0, filter: "blur(8px)" }}
                transition={{ ease: "easeInOut" }}
                style={{ position: "absolute" }}
                className='ml-7'
            >
                <AnimatedShinyText>{items[index].content}</AnimatedShinyText>
            </motion.div>
            </AnimatePresence>
        </div>
  );
};
