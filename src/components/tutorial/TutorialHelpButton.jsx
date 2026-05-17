import React from 'react';
import { HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TutorialHelpButton({ onStart }) {
  return (
    <motion.button
      onClick={onStart}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="fixed bottom-6 left-6 z-[9999] w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
      title="הפעל מדריך"
    >
      <HelpCircle className="w-6 h-6" />
    </motion.button>
  );
}