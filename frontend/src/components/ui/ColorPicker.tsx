import React, { useState } from 'react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  presetColors?: string[];
}

const DEFAULT_PRESETS = [
  // Swiss & Standard
  '#FFFFFF', '#D52B1E', '#003D7A', '#000000', '#1F2937',
  // Blues & Indigos
  '#1E3A8A', '#1E40AF', '#2563EB', '#3B82F6',
  '#312E81', '#4338CA', '#4F46E5', '#6366F1',
  // Teals & Greens
  '#134E4A', '#0F766E', '#0D9488', '#14B8A6',
  '#064E3B', '#065F46', '#059669', '#10B981',
  // Warm & Earth
  '#7F1D1D', '#991B1B', '#B91C1C', '#EF4444',
  '#7C2D12', '#9A3412', '#C2410C', '#F97316',
  // Purple & Pink
  '#581C87', '#6D28D9', '#7C3AED', '#8B5CF6',
  '#831843', '#9D174D', '#DB2777', '#EC4899',
  // Grays
  '#374151', '#4B5563', '#6B7280', '#9CA3AF',
];

export const ColorPicker: React.FC<ColorPickerProps> = ({
  label,
  value,
  onChange,
  presetColors = DEFAULT_PRESETS,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [customColor, setCustomColor] = useState(value);

  const handlePresetClick = (color: string) => {
    onChange(color);
    setCustomColor(color);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setCustomColor(newColor);
    onChange(newColor);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      
      <div className="flex items-center gap-3">
        {/* Color preview */}
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="w-10 h-10 rounded border-2 border-slate-300 shadow-sm hover:shadow transition-shadow"
          style={{ backgroundColor: value }}
          title="Choisir une couleur"
        />
        
        {/* Current color value */}
        <span className="text-sm text-slate-600 font-mono">
          {value.toUpperCase()}
        </span>
      </div>

      {/* Color presets */}
      {showPicker && (
        <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="text-xs font-medium text-slate-700 mb-2">
            Couleurs prédéfinies
          </div>
          <div className="grid grid-cols-8 gap-2 mb-3">
            {presetColors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handlePresetClick(color)}
                className={`w-8 h-8 rounded border-2 transition-all hover:scale-110 ${
                  value === color ? 'border-slate-900 ring-2 ring-slate-900' : 'border-slate-300'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>

          {/* Custom color input */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-700">
              Couleur personnalisée
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customColor}
                onChange={handleCustomChange}
                className="h-8 w-16 rounded border border-slate-300 cursor-pointer"
              />
              <input
                type="text"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value);
                  if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                    onChange(e.target.value);
                  }
                }}
                placeholder="#4F46E5"
                className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                maxLength={7}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
