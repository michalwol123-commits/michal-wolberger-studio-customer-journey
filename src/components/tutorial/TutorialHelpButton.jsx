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
      className="fixed bottom-16 left-4 z-[9999] w-9 h-9 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
      title="הפעל מדריך"
    >
      <HelpCircle className="w-5 h-5" />
    </motion.button>
  );
}