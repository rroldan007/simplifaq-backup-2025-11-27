import React from 'react';
import { motion } from 'framer-motion';
import { Check, FileText, Info, Package } from 'lucide-react';
import { cn } from '../../utils/cn';

interface Step {
  number: number;
  label: string;
  icon: React.ReactNode;
  description?: string;
}

interface WizardProgressProps {
  currentStep: number;
  steps: Step[];
  animated?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

export function WizardProgress({
  currentStep,
  steps,
  animated = true,
  variant = 'default'
}: WizardProgressProps) {
  const progress = Math.max(0, Math.min(100, Math.round(((currentStep - 1) / (steps.length - 1)) * 100)));

  if (variant === 'compact') {
    return (
      <div className="bg-[var(--color-bg-primary)] rounded-lg p-3 border border-[var(--color-border-primary)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            Étape {currentStep} sur {steps.length}
          </span>
          <span className="text-xs text-[var(--color-text-tertiary)]">{progress}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-[var(--color-bg-secondary)]">
          <motion.div
            className="h-2 rounded-full bg-[var(--color-primary-600)]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: animated ? 0.3 : 0, ease: 'easeOut' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] shadow-sm p-5">
      {/* Steps */}
      <div className="flex items-start justify-between gap-2 mb-4">
        {steps.map((step, idx) => {
          const isActive = currentStep === step.number;
          const isCompleted = currentStep > step.number;
          const isPending = currentStep < step.number;

          return (
            <React.Fragment key={step.number}>
              <div className="flex flex-col items-center flex-1 relative">
                {/* Step Circle with Icon */}
                <motion.div
                  initial={false}
                  animate={{
                    scale: isActive ? 1.05 : 1,
                  }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center border-2 relative z-10',
                    'transition-all duration-300',
                    isCompleted && 'bg-[var(--color-success-600)] border-[var(--color-success-600)] shadow-md',
                    isActive && 'bg-[var(--color-primary-600)] border-[var(--color-primary-600)] shadow-lg ring-4 ring-[var(--color-primary-600)]/20',
                    isPending && 'bg-[var(--color-bg-secondary)] border-[var(--color-border-primary)]'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-6 h-6 text-white" strokeWidth={3} />
                  ) : (
                    <div
                      className={cn(
                        'transition-colors duration-300',
                        isActive && 'text-white',
                        isPending && 'text-[var(--color-text-tertiary)]'
                      )}
                    >
                      {step.icon}
                    </div>
                  )}
                  
                  {/* Pulse effect for active step */}
                  {isActive && animated && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-[var(--color-primary-600)]"
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 1.4, opacity: 0 }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: 'easeOut'
                      }}
                    />
                  )}
                </motion.div>

                {/* Step Label */}
                <motion.div
                  initial={false}
                  animate={{
                    y: isActive ? 2 : 0,
                  }}
                  className={cn(
                    'mt-3 text-center transition-colors duration-300',
                    isActive && 'font-semibold text-[var(--color-text-primary)]',
                    isCompleted && 'font-medium text-[var(--color-text-secondary)]',
                    isPending && 'text-[var(--color-text-tertiary)]'
                  )}
                >
                  <div className="text-sm whitespace-nowrap">{step.label}</div>
                  {variant === 'detailed' && step.description && (
                    <div className="text-xs mt-1 text-[var(--color-text-tertiary)] max-w-[120px]">
                      {step.description}
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Connector Line */}
              {idx < steps.length - 1 && (
                <div className="flex-1 mt-6 relative">
                  <div className="h-0.5 w-full bg-[var(--color-border-primary)]">
                    <motion.div
                      className="h-full bg-[var(--color-success-600)]"
                      initial={{ width: 0 }}
                      animate={{
                        width: currentStep > step.number ? '100%' : '0%'
                      }}
                      transition={{ duration: animated ? 0.4 : 0, ease: 'easeInOut' }}
                    />
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="h-2 w-full rounded-full bg-[var(--color-bg-secondary)] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[var(--color-primary-600)] to-[var(--color-success-600)]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: animated ? 0.5 : 0, ease: 'easeOut' }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-label={`Progression: ${progress}%`}
          >
            {/* Shimmer effect */}
            {animated && progress > 0 && progress < 100 && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{
                  x: ['-100%', '200%']
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'linear'
                }}
              />
            )}
          </motion.div>
        </div>
        
        {/* Progress percentage */}
        <div className="flex items-center justify-between mt-2 text-xs">
          <span className="text-[var(--color-text-secondary)] font-medium">
            {steps.find(s => s.number === currentStep)?.label}
          </span>
          <span className="text-[var(--color-text-tertiary)]">{progress}% complété</span>
        </div>
      </div>
    </div>
  );
}

// Default icons for common steps
export const defaultStepIcons = {
  client: <FileText className="w-6 h-6" />,
  items: <Package className="w-6 h-6" />,
  details: <Info className="w-6 h-6" />,
  summary: <Check className="w-6 h-6" />
};
