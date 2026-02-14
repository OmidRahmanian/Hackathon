'use client';

import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ open, onClose, children }: Props) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="glass w-full max-w-lg rounded-sm border border-white/15 p-5"
            onClick={(event) => event.stopPropagation()}
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
