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
      <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-2xl p-4 border border-slate-200/60">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-slate-700">
            Étape {currentStep} sur {steps.length}
          </span>
          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">{progress}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-200/60 overflow-hidden">
          <motion.div
            className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: animated ? 0.3 : 0, ease: 'easeOut' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
      {/* Modern minimal stepper */}
      <div className="px-6 py-5">
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => {
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;
            const isPending = currentStep < step.number;

            return (
              <React.Fragment key={step.number}>
                {/* Step */}
                <div className="flex items-center gap-3">
                  <motion.div
                    initial={false}
                    animate={{ scale: isActive ? 1 : 1 }}
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300',
                      isCompleted && 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25',
                      isActive && 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30',
                      isPending && 'bg-slate-100 text-slate-400'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" strokeWidth={2.5} />
                    ) : (
                      <span className="text-sm font-semibold">{step.number}</span>
                    )}
                  </motion.div>
                  
                  <div className="hidden sm:block">
                    <div className={cn(
                      'text-sm font-medium transition-colors',
                      isActive && 'text-slate-900',
                      isCompleted && 'text-slate-600',
                      isPending && 'text-slate-400'
                    )}>
                      {step.label}
                    </div>
                    {variant === 'detailed' && step.description && (
                      <div className="text-xs text-slate-400 mt-0.5 max-w-[140px]">
                        {step.description}
                      </div>
                    )}
                  </div>
                </div>

                {/* Connector */}
                {idx < steps.length - 1 && (
                  <div className="flex-1 mx-4 h-0.5 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                      initial={{ width: 0 }}
                      animate={{ width: currentStep > step.number ? '100%' : '0%' }}
                      transition={{ duration: animated ? 0.4 : 0, ease: 'easeOut' }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Progress bar footer */}
      <div className="px-6 py-3 bg-gradient-to-r from-slate-50 to-blue-50/30 border-t border-slate-100">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">
            {steps.find(s => s.number === currentStep)?.label}
          </span>
          <span className="font-medium text-blue-600">{progress}% complété</span>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200/60 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: animated ? 0.5 : 0, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
}

// Default icons for common steps
// eslint-disable-next-line react-refresh/only-export-components
export const defaultStepIcons = {
  client: <FileText className="w-6 h-6" />,
  items: <Package className="w-6 h-6" />,
  details: <Info className="w-6 h-6" />,
  summary: <Check className="w-6 h-6" />
};
