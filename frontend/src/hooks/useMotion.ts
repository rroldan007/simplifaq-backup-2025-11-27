import { useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';

// Animation variants for common patterns
export const fadeInVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const slideUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const slideDownVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

export const slideLeftVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export const slideRightVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

export const scaleVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

// Custom hook for motion preferences
export const useMotion = () => {
  const shouldReduceMotion = useReducedMotion();

  const transition = useMemo(() => ({
    duration: shouldReduceMotion ? 0.01 : 0.3,
    ease: "easeOut" as const,
  }), [shouldReduceMotion]);

  const fastTransition = useMemo(() => ({
    duration: shouldReduceMotion ? 0.01 : 0.15,
    ease: "easeOut" as const,
  }), [shouldReduceMotion]);

  const slowTransition = useMemo(() => ({
    duration: shouldReduceMotion ? 0.01 : 0.5,
    ease: "easeOut" as const,
  }), [shouldReduceMotion]);

  const springTransition = useMemo(() => ({
    type: shouldReduceMotion ? 'tween' : 'spring',
    stiffness: 300,
    damping: 30,
    duration: shouldReduceMotion ? 0.01 : undefined,
  }), [shouldReduceMotion]);

  return {
    shouldReduceMotion,
    transition,
    fastTransition,
    slowTransition,
    springTransition,
    variants: {
      fadeIn: fadeInVariants,
      slideUp: slideUpVariants,
      slideDown: slideDownVariants,
      slideLeft: slideLeftVariants,
      slideRight: slideRightVariants,
      scale: scaleVariants,
      staggerContainer,
      staggerItem,
    },
  };
};

// Page transition variants
export const pageVariants = {
  initial: { opacity: 0, x: -20 },
  in: { opacity: 1, x: 0 },
  out: { opacity: 0, x: 20 },
};

export const pageTransition = {
  type: 'tween' as const,
  ease: "anticipate" as const,
  duration: 0.4,
};

// Modal variants
export const modalVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut" as const,
    },
  },
  exit: { 
    opacity: 0, 
    scale: 0.8,
    transition: {
      duration: 0.2,
      ease: "easeIn" as const,
    },
  },
};

export const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

// Card hover animations
export const cardHoverVariants = {
  rest: { scale: 1, y: 0 },
  hover: { 
    scale: 1.02, 
    y: -4,
    transition: {
      duration: 0.2,
      ease: "easeOut" as const,
    },
  },
  tap: { scale: 0.98 },
};

// Button animations
export const buttonVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
};

// Loading spinner animation
export const spinnerVariants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear' as const,
    },
  },
};

export default useMotion;