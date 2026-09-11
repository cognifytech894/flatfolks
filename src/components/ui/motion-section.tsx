"use client";

import { motion } from "framer-motion";

export function MotionSection({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className={className}>
      {children}
    </motion.div>
  );
}

export function MotionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className={className}>
      {children}
    </motion.div>
  );
}
