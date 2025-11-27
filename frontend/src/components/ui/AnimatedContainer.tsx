import React from 'react';
import { motion } from 'framer-motion';
import { useMotion } from '../../hooks/useMotion';

interface AnimatedContainerProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'fadeInUp' | 'stagger';
  delay?: number;
  duration?: number;
}

export function AnimatedContainer({ 
  children, 
  className = '', 
  variant = 'fadeInUp',
  delay = 0,
  duration = 0.5 
}: AnimatedContainerProps) {
  const { variants: motionVariants } = useMotion();

  const variants = {
    fadeInUp: {
      hidden: {
        opacity: 0,
        y: 20,
      },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration,
          delay,
          ease: 'easeOut',
        },
      },
    },
    stagger: motionVariants.staggerContainer,
  } as const;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants[variant]}
      className={className}
    >
      {children}
    </motion.div>
  );
}