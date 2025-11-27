import React, { useState } from 'react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  presetColors?: string[];
}

const DEFAULT_PRESETS = [
  '#4F46E5', // Indigo
  '#D52B1E', // Swiss Red
  '#003D7A', // Swiss Blue
  '#1A1A1A', // Dark Gray
  '#059669', // Green
  '#E11D48', // Rose
  '#7C3AED', // Purple
  '#000000', // Black
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
