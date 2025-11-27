import React, { useState, useEffect } from 'react';
import { X, Check, ArrowRight, ArrowLeft, Building2, Image, CreditCard, Users, Package, FileText } from 'lucide-react';
import { onboardingApi, OnboardingStatus, OnboardingStep } from '../../services/onboardingApi';
import CompanyInfoStep from './steps/CompanyInfoStep';
import LogoStep from './steps/LogoStep';
import FinancialStep from './steps/FinancialStep';
import ClientStep from './steps/ClientStep';
import ProductStep from './steps/ProductStep';
import InvoiceStep from './steps/InvoiceStep';

interface OnboardingWizardProps {
  onComplete?: () => void;
  onClose?: () => void;
}

const steps = [
  { id: 'company_info', title: 'Informations de l\'entreprise', icon: Building2, skippable: false },
  { id: 'logo', title: 'Logo', icon: Image, skippable: true },
  { id: 'financial', title: 'Informations financières', icon: CreditCard, skippable: false },
  { id: 'client', title: 'Premier client', icon: Users, skippable: false },
  { id: 'product', title: 'Premier produit', icon: Package, skippable: false },
  { id: 'invoice', title: 'Première facture', icon: FileText, skippable: false },
];

export default function OnboardingWizard({ onComplete, onClose }: OnboardingWizardProps) {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const data = await onboardingApi.getStatus();
      setStatus(data);
      
      // Find current step index
      const stepIndex = steps.findIndex(s => s.id === data.currentStep);
      setCurrentStepIndex(stepIndex >= 0 ? stepIndex : 0);
    } catch (err) {
      console.error('Error loading onboarding status:', err);
      setError('Impossible de charger le statut d\'onboarding');
    } finally {
      setLoading(false);
    }
  };

  const handleStepComplete = async () => {
    if (!status) return;

    try {
      const currentStep = steps[currentStepIndex];
      const updatedStatus = await onboardingApi.completeStep(currentStep.id as OnboardingStep);
      setStatus(updatedStatus);

      if (updatedStatus.isCompleted) {
        onComplete?.();
      } else {
        // Move to next step
        const nextStepIndex = currentStepIndex + 1;
        if (nextStepIndex < steps.length) {
          setCurrentStepIndex(nextStepIndex);
        }
      }
    } catch (err) {
      console.error('Error completing step:', err);
      setError('Erreur lors de la validation de l\'étape');
    }
  };

  const handleSkipStep = async () => {
    if (!status) return;

    try {
      const currentStep = steps[currentStepIndex];
      const updatedStatus = await onboardingApi.skipStep(currentStep.id as OnboardingStep);
      setStatus(updatedStatus);

      // Move to next step
      const nextStepIndex = currentStepIndex + 1;
      if (nextStepIndex < steps.length) {
        setCurrentStepIndex(nextStepIndex);
      }
    } catch (err) {
      console.error('Error skipping step:', err);
      setError('Erreur lors du saut de l\'étape');
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const renderStepContent = () => {
    const currentStep = steps[currentStepIndex];

    switch (currentStep.id) {
      case 'company_info':
        return <CompanyInfoStep onComplete={handleStepComplete} />;
      case 'logo':
        return <LogoStep onComplete={handleStepComplete} onSkip={handleSkipStep} />;
      case 'financial':
        return <FinancialStep onComplete={handleStepComplete} />;
      case 'client':
        return <ClientStep onComplete={handleStepComplete} />;
      case 'product':
        return <ProductStep onComplete={handleStepComplete} />;
      case 'invoice':
        return <InvoiceStep onComplete={handleStepComplete} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  const currentStep = steps[currentStepIndex];
  const StepIcon = currentStep.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold">Bienvenue sur SimpliFaq! 🎉</h2>
              <p className="text-indigo-100 mt-1">Configurons votre compte en quelques étapes</p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-white hover:text-indigo-100 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-indigo-100">Progression</span>
              <span className="text-sm font-semibold">{status.progress}%</span>
            </div>
            <div className="w-full bg-indigo-400 bg-opacity-30 rounded-full h-2">
              <div
                className="bg-white rounded-full h-2 transition-all duration-500"
                style={{ width: `${status.progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Steps indicator */}
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index < currentStepIndex || 
                (step.id === 'company_info' && status.companyInfoCompleted) ||
                (step.id === 'logo' && status.logoUploaded) ||
                (step.id === 'financial' && status.financialInfoCompleted) ||
                (step.id === 'client' && status.firstClientCreated) ||
                (step.id === 'product' && status.firstProductCreated) ||
                (step.id === 'invoice' && status.firstInvoiceCreated);
              const isCurrent = index === currentStepIndex;
              const isSkipped = status.skippedSteps.includes(step.id);

              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : isCurrent
                          ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                          : isSkipped
                          ? 'bg-gray-300 text-gray-500'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <span
                      className={`text-xs mt-1 text-center max-w-[80px] ${
                        isCurrent ? 'text-indigo-600 font-semibold' : 'text-gray-500'
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <StepIcon className="h-6 w-6 text-indigo-600" />
              <h3 className="text-xl font-semibold text-gray-900">{currentStep.title}</h3>
            </div>
          </div>

          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={currentStepIndex === 0}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Précédent
          </button>

          <div className="flex gap-2">
            {currentStep.skippable && (
              <button
                onClick={handleSkipStep}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                Passer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
