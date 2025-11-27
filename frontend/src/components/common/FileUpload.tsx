import { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Button } from '../ui/Button';
import { Loader2, Upload } from 'lucide-react';

interface FileUploadProps {
  accept?: string;
  maxSizeMB?: number;
  onFileUpload: (file: File) => Promise<void>;
  previewUrl?: string | null;
  label?: string;
  className?: string;
}

export function FileUpload({
  accept = 'image/*',
  maxSizeMB = 2,
  onFileUpload,
  previewUrl,
  label = 'Télécharger un fichier',
  className = '',
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamaño
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Le fichier ne doit pas dépasser ${maxSizeMB}MB`);
      return;
    }

    // Validar tipo
    if (accept !== '*/*' && accept !== 'image/*') {
      const acceptedTypes = accept.split(',').map(type => type.trim());
      if (!acceptedTypes.includes(file.type)) {
        setError('Type de fichier non autorisé');
        return;
      }
    }

    setError(null);
    setIsUploading(true);

    try {
      await onFileUpload(file);
    } catch (err) {
      console.error('Erreur lors du téléchargement du fichier:', err);
      setError('Erreur lors du téléchargement. Veuillez réessayer.');
    } finally {
      setIsUploading(false);
      // Resetear el input para permitir subir el mismo archivo otra vez
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        className="hidden"
        disabled={isUploading}
      />
      
      <div className="flex items-center gap-4">
        <Button
          type="button"
          onClick={triggerFileInput}
          disabled={isUploading}
          variant="outline"
          className="flex items-center gap-2"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Téléchargement...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              {label}
            </>
          )}
        </Button>
        
        {previewUrl && (
          <div className="relative h-16 w-16 overflow-hidden rounded-md border">
            <img 
              src={previewUrl} 
              alt="Logo de l'entreprise"
              className="h-full w-full object-contain p-1"
            />
          </div>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground">
        Formats acceptés: PNG, JPG, SVG. Taille maximale: {maxSizeMB}MB
      </p>
      
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
