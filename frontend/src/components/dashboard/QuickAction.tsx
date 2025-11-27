import React from 'react';

interface QuickActionProps {
  icon: string;
  label: string;
  onClick: () => void;
  className?: string;
}

export function QuickAction({ icon, label, onClick, className = '' }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg transition-colors ${className}`}
    >
      <span className="text-2xl mb-2">{icon}</span>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </button>
  );
}
