import React, { useState, useRef, useEffect } from 'react';
import { Settings, Save, RotateCcw, Code, Palette, Move, Lock, Unlock, Maximize2, Sparkles, Upload, Trash2, ChevronUp, ChevronDown, X, Eye, EyeOff } from 'lucide-react';
import { api } from '../../services/api';
import type { User } from '../../contexts/authTypes';

// ============================================
// 🎨 THEME REGISTRY (Sincronizado con Backend)
// ============================================
const THEME_REGISTRY = {
  swiss_minimal: {
    name: "Swiss Minimal",
    key: "swiss_minimal",
    colors: {
      primary: "#000000",
      secondary: "#666666",
      text: { header: "#000000", body: "#333333", muted: "#666666", inverse: "#FFFFFF" },
      background: { header: "#FFFFFF", tableHeader: "#F3F4F6", body: "#FFFFFF", altRow: "#F9FAFB" }
    },
    fonts: {
      heading: "Helvetica-Bold",
      body: "Helvetica",
      sizes: { h1: 24, h2: 16, body: 10, small: 8 }
    },
    layout: {
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
      headerHeight: 120,
      logoHeight: 50,
      logoPosition: "left" as const
    }
  },
  modern_blue: {
    name: "Modern Blue",
    key: "modern_blue",
    colors: {
      primary: "#2563EB",
      secondary: "#60A5FA",
      text: { header: "#1E3A8A", body: "#334155", muted: "#64748B", inverse: "#FFFFFF" },
      background: { header: "#EFF6FF", tableHeader: "#DBEAFE", body: "#FFFFFF", altRow: "#F0F9FF" }
    },
    fonts: {
      heading: "Helvetica-Bold",
      body: "Helvetica",
      sizes: { h1: 26, h2: 17, body: 10, small: 8 }
    },
    layout: {
      margins: { top: 30, bottom: 40, left: 40, right: 40 },
      headerHeight: 140,
      logoHeight: 60,
      logoPosition: "right" as const
    }
  },
  creative_bold: {
    name: "Creative Bold",
    key: "creative_bold",
    colors: {
      primary: "#7C3AED",
      secondary: "#A78BFA",
      text: { header: "#FFFFFF", body: "#1F2937", muted: "#6B7280", inverse: "#FFFFFF" },
      background: { header: "#7C3AED", tableHeader: "#EDE9FE", body: "#FFFFFF", altRow: "#F5F3FF" }
    },
    fonts: {
      heading: "Helvetica-Bold",
      body: "Helvetica",
      sizes: { h1: 30, h2: 18, body: 10, small: 9 }
    },
    layout: {
      margins: { top: 0, bottom: 40, left: 40, right: 40 },
      headerHeight: 160,
      logoHeight: 70,
      logoPosition: "left" as const
    }
  },
  custom: {
    name: "✨ Personnalisé",
    key: "custom",
    colors: {
      primary: "#4F46E5",
      secondary: "#818CF8",
      text: { header: "#000000", body: "#333333", muted: "#666666", inverse: "#FFFFFF" },
      background: { header: "#FFFFFF", tableHeader: "#F3F4F6", body: "#FFFFFF", altRow: "#F9FAFB" }
    },
    fonts: {
      heading: "Helvetica-Bold",
      body: "Helvetica",
      sizes: { h1: 24, h2: 16, body: 10, small: 8 }
    },
    layout: {
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
      headerHeight: 120,
      logoHeight: 50,
      logoPosition: "left" as const
    }
  }
};

// ============================================
// 🧱 ELEMENTOS ARRASTRABLES POR DEFECTO
// ============================================
const DEFAULT_ELEMENTS = [
  { id: 'logo', type: 'logo', label: 'Logo', x: 40, y: 40, width: 120, height: 50, locked: false, resizable: true, visible: true },
  { id: 'company_name', type: 'text', label: 'Nom Entreprise', x: 170, y: 50, width: 200, height: 30, locked: false, fontSize: 18, fontWeight: 'bold', visible: true },
  { id: 'doc_title', type: 'text', label: 'Titre Document', x: 400, y: 40, width: 150, height: 40, locked: false, fontSize: 24, fontWeight: 'bold', align: 'right', visible: true },
  { id: 'doc_number', type: 'text', label: 'Numéro Doc', x: 400, y: 85, width: 150, height: 20, locked: false, fontSize: 12, align: 'right', visible: true },
  { id: 'company_info', type: 'group', label: 'Info Entreprise', x: 40, y: 120, width: 200, height: 110, locked: false, resizable: true, visible: true },
  { id: 'client_info', type: 'group', label: 'Info Client', x: 40, y: 240, width: 200, height: 110, locked: false, resizable: true, visible: true },
  { id: 'table', type: 'table', label: 'Tableau Items', x: 40, y: 360, width: 515, height: 200, locked: false, resizable: true, visible: true },
  { id: 'totals', type: 'totals', label: 'Totaux', x: 350, y: 570, width: 205, height: 100, locked: false, visible: true },
  { id: 'qr_bill_zone', type: 'qr_bill', label: 'Zone QR Bill', x: 40, y: 680, width: 515, height: 140, locked: true, visible: true },
  { id: 'footer', type: 'text', label: 'Pied de page', x: 40, y: 780, width: 515, height: 30, locked: false, fontSize: 8, align: 'center', visible: true }
];

interface PDFThemeEditorProps {
  user: User;
  onUpdate: (updatedUser: User) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onClose?: () => void;
}

export const PDFThemeEditor: React.FC<PDFThemeEditorProps> = ({ user, onUpdate, onShowToast, onClose }) => {
  // Backend URL para cargar imágenes
  const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  
  // Normalizar el template key para que coincida con THEME_REGISTRY
  const normalizeTemplateKey = (template?: string): keyof typeof THEME_REGISTRY => {
    if (!template) return 'swiss_minimal';
    
    // Mapeo de templates legacy a nuevos
    const templateMap: Record<string, keyof typeof THEME_REGISTRY> = {
      'swiss_classic': 'swiss_minimal',
      'minimal_modern': 'swiss_minimal',
      'european_minimal': 'modern_blue',
      'swiss_blue': 'modern_blue',
      'german_formal': 'creative_bold'
    };
    
    const normalized = templateMap[template] || template;
    
    // Verificar que existe en THEME_REGISTRY
    if (normalized in THEME_REGISTRY) {
      return normalized as keyof typeof THEME_REGISTRY;
    }
    
    return 'swiss_minimal'; // fallback
  };

  // Detectar si el usuario tiene configuración personalizada
  const hasAdvancedConfig = user.pdfAdvancedConfig && user.pdfAdvancedConfig !== '';
  const initialThemeKey = hasAdvancedConfig || user.pdfTemplate === 'custom' ? 'custom' : normalizeTemplateKey(user.pdfTemplate);
  const [selectedTheme, setSelectedTheme] = useState(initialThemeKey);
  const [theme, setTheme] = useState(THEME_REGISTRY[initialThemeKey]);
  const [elements, setElements] = useState(DEFAULT_ELEMENTS);
  const [backgroundImages, setBackgroundImages] = useState<any[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [dragging, setDragging] = useState<any>(null);
  const [resizing, setResizing] = useState<any>(null);
  const [zoom, setZoom] = useState(1.0);
  const [showGrid, setShowGrid] = useState(true);
  const [showCode, setShowCode] = useState(false);
  const [editableCode, setEditableCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [totalsStyle, setTotalsStyle] = useState<'filled' | 'outlined' | 'minimal'>('filled');
  const [tableStyle, setTableStyle] = useState<'classic' | 'modern' | 'bordered' | 'minimal' | 'bold'>('classic');
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const A4_WIDTH = 595;
  const A4_HEIGHT = 842;

  // Cargar configuración avanzada si existe
  useEffect(() => {
    if (hasAdvancedConfig) {
      try {
        const parsedConfig = typeof user.pdfAdvancedConfig === 'string' 
          ? JSON.parse(user.pdfAdvancedConfig) 
          : user.pdfAdvancedConfig;
        
        console.log('[PDFThemeEditor] Loading advanced config:', parsedConfig);
        
        // Restaurar elementos
        if (parsedConfig.elements && Array.isArray(parsedConfig.elements)) {
          const loadedElements = parsedConfig.elements.map((el: any) => ({
            id: el.id,
            type: el.type,
            label: DEFAULT_ELEMENTS.find(d => d.id === el.id)?.label || el.id,
            x: el.position.x,
            y: el.position.y,
            width: el.size.width,
            height: el.size.height,
            locked: el.locked || false,
            visible: el.visible !== false,
            resizable: el.resizable || false,
            fontSize: el.fontSize,
            fontWeight: el.fontWeight,
            align: el.align
          }));
          setElements(loadedElements);
        }
        
        // Restaurar imágenes de fondo
        if (parsedConfig.backgroundImages && Array.isArray(parsedConfig.backgroundImages)) {
          console.log('[PDFThemeEditor] Loading background images:', parsedConfig.backgroundImages);
          const loadedImages = parsedConfig.backgroundImages.map((img: any, index: number) => ({
            id: img.id || `bg_restored_${index}`,
            type: 'background_image', // CRITICAL: type is required for rendering
            label: `Image ${index + 1}`,
            x: img.position?.x ?? 0,
            y: img.position?.y ?? 0,
            width: img.size?.width ?? 200,
            height: img.size?.height ?? 200,
            opacity: img.opacity ?? 1,
            visible: img.visible !== false,
            locked: false,
            resizable: true,
            src: img.src || ''
          }));
          console.log('[PDFThemeEditor] Restored images:', loadedImages);
          setBackgroundImages(loadedImages);
        }
        
        // Restaurar colores del tema
        if (parsedConfig.colors) {
          setTheme(prev => ({
            ...prev,
            colors: {
              ...prev.colors,
              primary: parsedConfig.colors.primary || prev.colors.primary,
              background: {
                ...prev.colors.background,
                tableHeader: parsedConfig.colors.tableHeader || prev.colors.background.tableHeader,
                header: parsedConfig.colors.headerBg || prev.colors.background.header
              },
              text: {
                ...prev.colors.text,
                header: parsedConfig.colors.textHeader || prev.colors.text.header,
                body: parsedConfig.colors.textBody || prev.colors.text.body
              }
            }
          }));
        }
        
        // Restaurar estilo de totales
        if (parsedConfig.totalsStyle) {
          setTotalsStyle(parsedConfig.totalsStyle);
        }
        
        // Restaurar estilo de tabla
        if (parsedConfig.tableStyle) {
          setTableStyle(parsedConfig.tableStyle);
        }
      } catch (error) {
        console.error('[PDFThemeEditor] Error loading advanced config:', error);
      }
    }
  }, []); // Solo ejecutar una vez al montar

  useEffect(() => {
    const normalizedKey = normalizeTemplateKey(selectedTheme);
    setTheme(THEME_REGISTRY[normalizedKey]);
  }, [selectedTheme]);

  // Sync editable code when showCode changes
  useEffect(() => {
    if (showCode) {
      const config = exportConfig();
      setEditableCode(JSON.stringify(config, null, 2));
    }
  }, [showCode]);

  // ============================================
  // 🖼️ IMAGE HANDLERS
  // ============================================
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamaño (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      onShowToast('❌ L\'image ne doit pas dépasser 10 MB', 'error');
      return;
    }

    // Validar tipo
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      onShowToast('❌ Format non supporté. Utilisez PNG, JPG ou SVG', 'error');
      return;
    }

    try {
      // Subir imagen al servidor
      const formData = new FormData();
      formData.append('file', file);

      // NO especificar Content-Type manualmente, el navegador lo genera automáticamente con boundary
      const response = await api.post('/upload/pdf-background', formData);

      console.log('📥 Réponse upload image:', response);
      
      // Extraer URL correctamente según la estructura de respuesta
      const resp = response as any;
      let imageUrl = '';
      if (resp?.data?.data?.url) {
        imageUrl = resp.data.data.url;
      } else if (resp?.data?.url) {
        imageUrl = resp.data.url;
      } else if (resp?.url) {
        imageUrl = resp.url;
      }
      
      console.log('🖼️ Image URL:', imageUrl);
      
      // Construir URL completa apuntando al backend
      const fullImageUrl = imageUrl.startsWith('http') 
        ? imageUrl 
        : `${BACKEND_URL}/${imageUrl}`;
      
      console.log('🌐 URL complète de l\'image:', fullImageUrl);

      // Cargar imagen para obtener dimensiones
      const img = new Image();
      img.onload = () => {
        console.log('✅ Image chargée:', img.width, 'x', img.height);
        const newImage = {
          id: `bg_${Date.now()}`,
          type: 'background_image',
          label: 'Image de fond',
          x: 100,
          y: 100,
          width: 200,
          height: Math.round((200 * img.height) / img.width),
          locked: false,
          resizable: true,
          opacity: 0.3,
          visible: true,
          src: imageUrl // Guardar URL relativa para guardar en BD
        };
        setBackgroundImages(prev => [...prev, newImage]);
        setSelectedElement(newImage.id);
        onShowToast('✅ Image ajoutée avec succès!', 'success');
      };
      img.onerror = () => {
        console.error('❌ Erreur de chargement image:', fullImageUrl);
        onShowToast('❌ Erreur lors du chargement de l\'image', 'error');
      };
      img.src = fullImageUrl;
    } catch (error) {
      console.error('Error uploading PDF background image:', error);
      onShowToast('❌ Erreur lors du téléchargement de l\'image', 'error');
    }
  };

  const updateImageOpacity = (id: string, opacity: number) => {
    setBackgroundImages(prev => prev.map(img => 
      img.id === id ? { ...img, opacity: parseFloat(opacity.toString()) } : img
    ));
  };

  const deleteImage = (id: string) => {
    setBackgroundImages(prev => prev.filter(img => img.id !== id));
    if (selectedElement === id) setSelectedElement(null);
  };

  const moveImageLayer = (id: string, direction: 'up' | 'down') => {
    setBackgroundImages(prev => {
      const index = prev.findIndex(img => img.id === id);
      if (index === -1) return prev;
      
      const newArray = [...prev];
      if (direction === 'up' && index < prev.length - 1) {
        [newArray[index], newArray[index + 1]] = [newArray[index + 1], newArray[index]];
      } else if (direction === 'down' && index > 0) {
        [newArray[index], newArray[index - 1]] = [newArray[index - 1], newArray[index]];
      }
      return newArray;
    });
  };

  // ============================================
  // 🖱️ DRAG & RESIZE
  // ============================================
  const handleMouseDown = (e: React.MouseEvent, element: any) => {
    if (element.locked) return;
    e.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragging({
      id: element.id,
      isImage: element.type === 'background_image',
      offsetX: (e.clientX - rect.left) / zoom - element.x,
      offsetY: (e.clientY - rect.top) / zoom - element.y
    });
    setSelectedElement(element.id);
  };

  const handleResizeStart = (e: React.MouseEvent, element: any) => {
    if (element.locked || !element.resizable) return;
    e.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setResizing({
      id: element.id,
      isImage: element.type === 'background_image',
      startX: (e.clientX - rect.left) / zoom,
      startY: (e.clientY - rect.top) / zoom,
      startWidth: element.width,
      startHeight: element.height
    });
    setSelectedElement(element.id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (dragging) {
      const x = Math.max(0, Math.min(A4_WIDTH - 50, (e.clientX - rect.left) / zoom - dragging.offsetX));
      const y = Math.max(0, Math.min(A4_HEIGHT - 50, (e.clientY - rect.top) / zoom - dragging.offsetY));
      
      if (dragging.isImage) {
        setBackgroundImages(prev => prev.map(img => 
          img.id === dragging.id ? { ...img, x: Math.round(x), y: Math.round(y) } : img
        ));
      } else {
        setElements(prev => prev.map(el => 
          el.id === dragging.id ? { ...el, x: Math.round(x), y: Math.round(y) } : el
        ));
      }
    }

    if (resizing) {
      const currentX = (e.clientX - rect.left) / zoom;
      const currentY = (e.clientY - rect.top) / zoom;
      const deltaX = currentX - resizing.startX;
      const deltaY = currentY - resizing.startY;
      
      const newWidth = Math.max(50, Math.min(A4_WIDTH - 40, resizing.startWidth + deltaX));
      const newHeight = Math.max(30, Math.min(A4_HEIGHT - 100, resizing.startHeight + deltaY));
      
      if (resizing.isImage) {
        setBackgroundImages(prev => prev.map(img => 
          img.id === resizing.id ? { ...img, width: Math.round(newWidth), height: Math.round(newHeight) } : img
        ));
      } else {
        setElements(prev => prev.map(el => 
          el.id === resizing.id ? { ...el, width: Math.round(newWidth), height: Math.round(newHeight) } : el
        ));
      }
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
    setResizing(null);
  };

  // ============================================
  // 🎨 THEME UPDATES
  // ============================================
  const updateColor = (path: string, value: string) => {
    setTheme(prev => {
      const newTheme = { ...prev };
      const keys = path.split('.');
      let current: any = newTheme;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newTheme;
    });
  };

  const toggleLock = (id: string, isImage = false) => {
    if (isImage) {
      setBackgroundImages(prev => prev.map(img => 
        img.id === id ? { ...img, locked: !img.locked } : img
      ));
    } else {
      setElements(prev => prev.map(el => 
        el.id === id ? { ...el, locked: !el.locked } : el
      ));
    }
  };

  const toggleVisibility = (id: string, isImage = false) => {
    if (isImage) {
      setBackgroundImages(prev => prev.map(img => 
        img.id === id ? { ...img, visible: !img.visible } : img
      ));
    } else {
      setElements(prev => prev.map(el => 
        el.id === id ? { ...el, visible: el.visible === false ? true : false } : el
      ));
    }
  };

  // ============================================
  // 💾 SAVE & EXPORT
  // ============================================
  const saveConfiguration = async () => {
    setSaving(true);
    try {
      console.log('🔄 Début de l\'enregistrement de la configuration PDF...');
      
      // Configuración avanzada guardada en un solo campo JSON
      const advancedConfig = {
        elements: elements.map(el => ({
          id: el.id,
          type: el.type,
          position: { x: el.x, y: el.y },
          size: { width: el.width, height: el.height },
          locked: el.locked,
          visible: el.visible !== false,
          ...(el.fontSize && { fontSize: el.fontSize }),
          ...(el.align && { align: el.align }),
          ...(el.resizable && { resizable: el.resizable })
        })),
        backgroundImages: backgroundImages.map(img => ({
          id: img.id,
          position: { x: img.x, y: img.y },
          size: { width: img.width, height: img.height },
          opacity: img.opacity,
          visible: img.visible !== false,
          src: img.src
        })),
        colors: {
          primary: theme.colors.primary,
          tableHeader: theme.colors.background.tableHeader,
          headerBg: theme.colors.background.header,
          textHeader: theme.colors.text.header,
          textBody: theme.colors.text.body
        },
        theme: {
          ...theme,
          key: selectedTheme
        },
        totalsStyle: totalsStyle,
        tableStyle: tableStyle
      };

      // Detectar si hay personalizaciones reales
      const hasCustomizations = 
        selectedTheme === 'custom' || // Usuario explícitamente seleccionó custom
        backgroundImages.length > 0 || // Tiene imágenes de fondo personalizadas
        elements.some(el => el.visible === false) || // Tiene elementos ocultos
        elements.some(el => el.locked); // Tiene elementos bloqueados
      
      // Si es un tema estándar sin personalizaciones, limpiar advancedConfig
      const config = {
        pdfTemplate: hasCustomizations ? 'custom' : selectedTheme,
        pdfPrimaryColor: theme.colors.primary,
        pdfAdvancedConfig: hasCustomizations ? advancedConfig : null // Limpiar si es tema estándar
      };

      console.log('📤 Envoi de la configuration au serveur:', config);
      const result = await api.put('/auth/me', config);
      console.log('📥 Réponse du serveur:', result);
      
      // Extract user from response - api.put retorna { data: ApiResponse }
      let updatedUser = null;
      const resp = result as any;
      
      if (resp?.data?.data?.user) {
        updatedUser = resp.data.data.user as User;
      } else if (resp?.data?.user) {
        updatedUser = resp.data.user as User;
      } else if (resp?.user) {
        updatedUser = resp.user as User;
      }

      console.log('👤 Usuario extraído:', updatedUser ? '✅ Encontrado' : '❌ No encontrado');

      if (updatedUser) {
        console.log('✅ Configuration enregistrée avec succès!');
        onShowToast('✅ Configuration enregistrée avec succès!', 'success');
        onUpdate(updatedUser);
        
        // Fermer l'éditeur après 1 seconde
        setTimeout(() => {
          if (onClose) onClose();
        }, 1000);
      } else {
        console.warn('⚠️ Pas d\'utilisateur retourné dans la réponse');
        console.warn('Structure de la réponse:', JSON.stringify(result, null, 2));
        onShowToast('⚠️ Configuration enregistrée mais impossible de mettre à jour l\'UI', 'info');
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'enregistrement de la configuration PDF:', error);
      onShowToast('❌ Erreur lors de l\'enregistrement', 'error');
    } finally {
      setSaving(false);
    }
  };

  const exportConfig = () => {
    const advancedConfig = {
      elements: elements.map(el => ({
        id: el.id,
        type: el.type,
        position: { x: el.x, y: el.y },
        size: { width: el.width, height: el.height },
        locked: el.locked,
        visible: el.visible !== false,
        ...(el.fontSize && { fontSize: el.fontSize }),
        ...(el.align && { align: el.align }),
        ...(el.resizable && { resizable: el.resizable })
      })),
      backgroundImages: backgroundImages.map(img => ({
        id: img.id,
        position: { x: img.x, y: img.y },
        size: { width: img.width, height: img.height },
        opacity: img.opacity,
        visible: img.visible !== false,
        src: img.src
      })),
      colors: {
        primary: theme.colors.primary,
        tableHeader: theme.colors.background.tableHeader,
        headerBg: theme.colors.background.header,
        textHeader: theme.colors.text.header,
        textBody: theme.colors.text.body
      },
      theme: {
        ...theme,
        key: selectedTheme,
        name: theme.name
      },
      totalsStyle: totalsStyle,
      tableStyle: tableStyle
    };
    
    const config = {
      pdfTemplate: selectedTheme,
      pdfPrimaryColor: theme.colors.primary,
      pdfAdvancedConfig: advancedConfig
    };
    
    console.log('📋 Configuration exportée:', config);
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    onShowToast('✅ Configuration copiée dans le presse-papier!', 'info');
    return config;
  };

  // ============================================
  // 🛠️ HELPER FUNCTIONS
  // ============================================
  const getImageUrl = (src: string): string => {
    if (!src) return '';
    if (src.startsWith('http') || src.startsWith('data:')) return src;
    return `${BACKEND_URL}/${src}`;
  };

  // ============================================
  // 🎨 RENDER ELEMENT
  // ============================================
  const renderElement = (element: any) => {
    const isSelected = selectedElement === element.id;
    const isImage = element.type === 'background_image';
    
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: element.x,
      top: element.y,
      width: element.width,
      height: element.height,
      border: isSelected ? '2px solid #3B82F6' : '1px solid #E5E7EB',
      cursor: element.locked ? 'not-allowed' : 'move',
      opacity: element.locked ? 0.6 : 1,
      backgroundColor: element.type === 'logo' ? '#F3F4F6' : 'transparent',
      boxShadow: isSelected ? '0 0 0 4px rgba(59, 130, 246, 0.1)' : 'none',
      transition: 'box-shadow 0.2s'
    };

    if (isImage) {
      return (
        <div
          key={element.id}
          style={baseStyle}
          onMouseDown={(e) => handleMouseDown(e, element)}
          className="group"
        >
          <img 
            src={getImageUrl(element.src)} 
            alt="Background" 
            className="w-full h-full object-cover pointer-events-none"
            style={{ opacity: element.opacity }}
          />
          
          {isSelected && (
            <div className="absolute -top-7 left-0 bg-gradient-to-r from-purple-500 to-pink-600 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap shadow-lg">
              🖼️ {element.label} • ({element.x}, {element.y}) • {Math.round(element.opacity * 100)}%
            </div>
          )}

          {!element.locked && (
            <div
              onMouseDown={(e) => handleResizeStart(e, element)}
              className="absolute bottom-0 right-0 w-4 h-4 bg-purple-500 rounded-tl cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <Maximize2 className="w-2.5 h-2.5 text-white" />
            </div>
          )}
        </div>
      );
    }

    // Renderizar contenido con datos reales del usuario
    const renderContentData = () => {
      // Título de empresa
      if (element.id === 'company_name' || element.label === 'Nom Entreprise') {
        return user.companyName || 'Nom Entreprise';
      }
      
      // Información de empresa
      if (element.id === 'company_info' || element.label === 'Info Entreprise') {
        return (
          <div className="text-[8px] space-y-0.5" style={{ color: theme.colors.text.muted }}>
            {user.street && <div>{user.street}</div>}
            {(user.postalCode || user.city) && (
              <div>{user.postalCode} {user.city}</div>
            )}
            {user.email && <div>{user.email}</div>}
            {user.phone && <div>Tél: {user.phone}</div>}
            {user.vatNumber && <div>TVA: {user.vatNumber}</div>}
          </div>
        );
      }
      
      // Título del documento
      if (element.id === 'doc_title' || element.label === 'Titre Document') {
        return 'FACTURE';
      }
      
      // Número de documento
      if (element.id === 'doc_number' || element.label === 'Numéro Doc') {
        const prefix = user.invoicePrefix || 'FAC';
        const number = user.nextInvoiceNumber || 1;
        const padding = user.invoicePadding || 3;
        return `${prefix}-${String(number).padStart(padding, '0')}`;
      }
      
      return element.label;
    };

    const content: Record<string, React.JSX.Element> = {
      logo: (
        <div className="flex items-center justify-center h-full text-xs text-gray-500 bg-white/50 rounded">
          {user.logoUrl ? (
            <img 
              src={getImageUrl(user.logoUrl)} 
              alt="Logo" 
              className="max-w-full max-h-full object-contain p-1" 
            />
          ) : (
            <div className="text-center">
              <div className="text-2xl mb-1">🏢</div>
              <div className="font-medium">LOGO</div>
            </div>
          )}
        </div>
      ),
      text: (
        <div className="p-2 h-full flex items-center" style={{ 
          fontSize: element.fontSize ? `${element.fontSize}px` : '12px',
          textAlign: (element.align || 'left') as any,
          fontWeight: element.fontWeight || 'normal',
          color: (element.id === 'company_name' || element.id === 'doc_title') 
            ? theme.colors.primary 
            : theme.colors.text.body,
          whiteSpace: element.id === 'company_name' ? 'nowrap' : 'normal',
          overflow: element.id === 'company_name' ? 'hidden' : 'visible',
          textOverflow: element.id === 'company_name' ? 'ellipsis' : 'clip'
        }}>
          {renderContentData()}
        </div>
      ),
      group: (
        <div className="p-2 h-full overflow-hidden bg-gradient-to-br from-gray-50 to-transparent">
          <div className="text-xs font-semibold mb-1" style={{ color: theme.colors.text.header }}>
            {element.id === 'company_info' ? (user.companyName || 'Info Entreprise') : element.label}
          </div>
          {element.id === 'company_info' ? renderContentData() : (
            <div className="text-[8px] space-y-0.5" style={{ color: theme.colors.text.muted }}>
              <div>Rue de l'Exemple 1</div>
              <div>1000 Lausanne</div>
              <div>info@client.ch</div>
            </div>
          )}
        </div>
      ),
      table: (() => {
        // Classic: Zebra striping with alternating row colors
        if (tableStyle === 'classic') {
          return (
            <div className="h-full overflow-hidden rounded border border-gray-200">
              <div className="h-8 flex items-center px-3 text-[9px] font-semibold" 
                   style={{ backgroundColor: theme.colors.background.tableHeader, color: theme.colors.text.header }}>
                <div className="flex-1">Description</div>
                <div className="w-20 text-right">Quantité</div>
                <div className="w-24 text-right">Prix Unit.</div>
                <div className="w-24 text-right">Total</div>
              </div>
              <div className="text-[8px]" style={{ color: theme.colors.text.body }}>
                <div className="flex px-3 py-2 border-b border-gray-100">
                  <div className="flex-1">Consultation stratégique</div>
                  <div className="w-20 text-right">1</div>
                  <div className="w-24 text-right">150.00</div>
                  <div className="w-24 text-right font-medium">150.00</div>
                </div>
                <div className="flex px-3 py-2 border-b border-gray-100" style={{ backgroundColor: theme.colors.background.altRow }}>
                  <div className="flex-1">Développement web</div>
                  <div className="w-20 text-right">2</div>
                  <div className="w-24 text-right">200.00</div>
                  <div className="w-24 text-right font-medium">400.00</div>
                </div>
                <div className="flex px-3 py-2">
                  <div className="flex-1">Formation équipe</div>
                  <div className="w-20 text-right">3</div>
                  <div className="w-24 text-right">80.00</div>
                  <div className="w-24 text-right font-medium">240.00</div>
                </div>
              </div>
            </div>
          );
        }
        
        // Modern: Clean design with subtle borders, no alternating colors
        if (tableStyle === 'modern') {
          return (
            <div className="h-full overflow-hidden rounded">
              <div className="h-8 flex items-center px-3 text-[9px] font-semibold border-b-2" 
                   style={{ borderColor: theme.colors.primary, color: theme.colors.text.header }}>
                <div className="flex-1">Description</div>
                <div className="w-20 text-right">Quantité</div>
                <div className="w-24 text-right">Prix Unit.</div>
                <div className="w-24 text-right">Total</div>
              </div>
              <div className="text-[8px]" style={{ color: theme.colors.text.body }}>
                <div className="flex px-3 py-2 border-b border-gray-200">
                  <div className="flex-1">Consultation stratégique</div>
                  <div className="w-20 text-right">1</div>
                  <div className="w-24 text-right">150.00</div>
                  <div className="w-24 text-right font-medium">150.00</div>
                </div>
                <div className="flex px-3 py-2 border-b border-gray-200">
                  <div className="flex-1">Développement web</div>
                  <div className="w-20 text-right">2</div>
                  <div className="w-24 text-right">200.00</div>
                  <div className="w-24 text-right font-medium">400.00</div>
                </div>
                <div className="flex px-3 py-2">
                  <div className="flex-1">Formation équipe</div>
                  <div className="w-20 text-right">3</div>
                  <div className="w-24 text-right">80.00</div>
                  <div className="w-24 text-right font-medium">240.00</div>
                </div>
              </div>
            </div>
          );
        }
        
        // Bordered: Full grid with borders on all cells
        if (tableStyle === 'bordered') {
          return (
            <div className="h-full overflow-hidden border-2" style={{ borderColor: theme.colors.primary }}>
              <div className="h-8 flex items-center text-[9px] font-semibold border-b-2" 
                   style={{ backgroundColor: theme.colors.background.tableHeader, color: theme.colors.text.header, borderColor: theme.colors.primary }}>
                <div className="flex-1 px-3 border-r" style={{ borderColor: theme.colors.primary }}>Description</div>
                <div className="w-20 text-right px-3 border-r" style={{ borderColor: theme.colors.primary }}>Quantité</div>
                <div className="w-24 text-right px-3 border-r" style={{ borderColor: theme.colors.primary }}>Prix Unit.</div>
                <div className="w-24 text-right px-3">Total</div>
              </div>
              <div className="text-[8px]" style={{ color: theme.colors.text.body }}>
                <div className="flex py-2 border-b" style={{ borderColor: theme.colors.primary }}>
                  <div className="flex-1 px-3 border-r" style={{ borderColor: theme.colors.primary }}>Consultation stratégique</div>
                  <div className="w-20 text-right px-3 border-r" style={{ borderColor: theme.colors.primary }}>1</div>
                  <div className="w-24 text-right px-3 border-r" style={{ borderColor: theme.colors.primary }}>150.00</div>
                  <div className="w-24 text-right px-3 font-medium">150.00</div>
                </div>
                <div className="flex py-2 border-b" style={{ borderColor: theme.colors.primary }}>
                  <div className="flex-1 px-3 border-r" style={{ borderColor: theme.colors.primary }}>Développement web</div>
                  <div className="w-20 text-right px-3 border-r" style={{ borderColor: theme.colors.primary }}>2</div>
                  <div className="w-24 text-right px-3 border-r" style={{ borderColor: theme.colors.primary }}>200.00</div>
                  <div className="w-24 text-right px-3 font-medium">400.00</div>
                </div>
                <div className="flex py-2">
                  <div className="flex-1 px-3 border-r" style={{ borderColor: theme.colors.primary }}>Formation équipe</div>
                  <div className="w-20 text-right px-3 border-r" style={{ borderColor: theme.colors.primary }}>3</div>
                  <div className="w-24 text-right px-3 border-r" style={{ borderColor: theme.colors.primary }}>80.00</div>
                  <div className="w-24 text-right px-3 font-medium">240.00</div>
                </div>
              </div>
            </div>
          );
        }
        
        // Minimal: No borders, only subtle separators
        if (tableStyle === 'minimal') {
          return (
            <div className="h-full overflow-hidden">
              <div className="h-8 flex items-center px-3 text-[9px] font-semibold" 
                   style={{ color: theme.colors.primary }}>
                <div className="flex-1">Description</div>
                <div className="w-20 text-right">Quantité</div>
                <div className="w-24 text-right">Prix Unit.</div>
                <div className="w-24 text-right">Total</div>
              </div>
              <div className="text-[8px]" style={{ color: theme.colors.text.body }}>
                <div className="flex px-3 py-2 border-b border-gray-100">
                  <div className="flex-1">Consultation stratégique</div>
                  <div className="w-20 text-right">1</div>
                  <div className="w-24 text-right">150.00</div>
                  <div className="w-24 text-right font-medium">150.00</div>
                </div>
                <div className="flex px-3 py-2 border-b border-gray-100">
                  <div className="flex-1">Développement web</div>
                  <div className="w-20 text-right">2</div>
                  <div className="w-24 text-right">200.00</div>
                  <div className="w-24 text-right font-medium">400.00</div>
                </div>
                <div className="flex px-3 py-2">
                  <div className="flex-1">Formation équipe</div>
                  <div className="w-20 text-right">3</div>
                  <div className="w-24 text-right">80.00</div>
                  <div className="w-24 text-right font-medium">240.00</div>
                </div>
              </div>
            </div>
          );
        }
        
        // Bold: Strong header with heavy borders
        return (
          <div className="h-full overflow-hidden border-2 border-gray-300 rounded">
            <div className="h-9 flex items-center px-3 text-[10px] font-bold border-b-4" 
                 style={{ backgroundColor: theme.colors.primary, color: 'white', borderColor: theme.colors.primary }}>
              <div className="flex-1">Description</div>
              <div className="w-20 text-right">Quantité</div>
              <div className="w-24 text-right">Prix Unit.</div>
              <div className="w-24 text-right">Total</div>
            </div>
            <div className="text-[8px]" style={{ color: theme.colors.text.body }}>
              <div className="flex px-3 py-2.5 border-b-2 border-gray-300">
                <div className="flex-1 font-medium">Consultation stratégique</div>
                <div className="w-20 text-right">1</div>
                <div className="w-24 text-right">150.00</div>
                <div className="w-24 text-right font-bold">150.00</div>
              </div>
              <div className="flex px-3 py-2.5 border-b-2 border-gray-300">
                <div className="flex-1 font-medium">Développement web</div>
                <div className="w-20 text-right">2</div>
                <div className="w-24 text-right">200.00</div>
                <div className="w-24 text-right font-bold">400.00</div>
              </div>
              <div className="flex px-3 py-2.5">
                <div className="flex-1 font-medium">Formation équipe</div>
                <div className="w-20 text-right">3</div>
                <div className="w-24 text-right">80.00</div>
                <div className="w-24 text-right font-bold">240.00</div>
              </div>
            </div>
          </div>
        );
      })(),
      totals: (() => {
        const baseStyle = 'h-full p-4 rounded-lg';
        
        // Filled style: background color with white text
        if (totalsStyle === 'filled') {
          return (
            <div className={`${baseStyle} shadow-sm`} style={{ backgroundColor: theme.colors.primary, color: theme.colors.text.inverse }}>
              <div className="flex justify-between text-xs mb-2 opacity-90">
                <span>Sous-total:</span>
                <span className="font-medium">CHF 630.00</span>
              </div>
              <div className="flex justify-between text-xs mb-3 opacity-90">
                <span>TVA (7.7%):</span>
                <span className="font-medium">CHF 48.51</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t pt-2" style={{ borderColor: 'rgba(255,255,255,0.3)' }}>
                <span>TOTAL:</span>
                <span>CHF 678.51</span>
              </div>
            </div>
          );
        }
        
        // Outlined style: border with colored text
        if (totalsStyle === 'outlined') {
          return (
            <div className={`${baseStyle}`} style={{ 
              border: `2px solid ${theme.colors.primary}`, 
              backgroundColor: 'transparent',
              color: theme.colors.text.body
            }}>
              <div className="flex justify-between text-xs mb-2">
                <span>Sous-total:</span>
                <span className="font-medium">CHF 630.00</span>
              </div>
              <div className="flex justify-between text-xs mb-3">
                <span>TVA (7.7%):</span>
                <span className="font-medium">CHF 48.51</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t pt-2" style={{ 
                borderColor: theme.colors.primary,
                color: theme.colors.primary
              }}>
                <span>TOTAL:</span>
                <span>CHF 678.51</span>
              </div>
            </div>
          );
        }
        
        // Minimal style: no background, colored text only
        return (
          <div className={`${baseStyle}`} style={{ 
            backgroundColor: 'transparent',
            color: theme.colors.text.body
          }}>
            <div className="flex justify-between text-xs mb-2">
              <span>Sous-total:</span>
              <span className="font-medium">CHF 630.00</span>
            </div>
            <div className="flex justify-between text-xs mb-3">
              <span>TVA (7.7%):</span>
              <span className="font-medium">CHF 48.51</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t pt-2" style={{ 
              borderColor: theme.colors.primary,
              color: theme.colors.primary
            }}>
              <span>TOTAL:</span>
              <span>CHF 678.51</span>
            </div>
          </div>
        );
      })(),
      qr_bill: (
        <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-dashed border-blue-300 rounded-lg">
          <div className="text-center">
            <div className="text-4xl mb-2">📱</div>
            <div className="text-sm font-semibold text-blue-900">Zone QR Bill</div>
            <div className="text-xs text-blue-700 mt-1">Réservée pour les factures</div>
            <div className="text-xs text-blue-600 mt-2 bg-white/50 px-3 py-1 rounded">105mm × 210mm</div>
          </div>
        </div>
      )
    };

    return (
      <div
        key={element.id}
        style={baseStyle}
        onMouseDown={(e) => handleMouseDown(e, element)}
        className="group"
      >
        {content[element.type]}
        
        {isSelected && (
          <div className="absolute -top-7 left-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap shadow-lg">
            {element.label} • ({element.x}, {element.y}) • {element.width}×{element.height}
          </div>
        )}

        {element.resizable && !element.locked && isSelected && (
          <div
            onMouseDown={(e) => handleResizeStart(e, element)}
            className="absolute bottom-0 right-0 w-5 h-5 bg-blue-500 hover:bg-blue-600 rounded-tl cursor-nwse-resize flex items-center justify-center shadow-lg border-2 border-white"
          >
            <Maximize2 className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
    );
  };

  const selectedEl = elements.find(el => el.id === selectedElement) || 
                     backgroundImages.find(img => img.id === selectedElement);

  // Protección: Si no hay theme válido, no renderizar
  if (!theme) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Erreur de chargement du thème</h2>
          <p className="text-gray-600 mb-4">Impossible de charger le thème PDF.</p>
          {onClose && (
            <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Retour
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      {/* SIDEBAR */}
      <div className="w-80 bg-white/80 backdrop-blur-xl border-r border-gray-200/50 overflow-y-auto shadow-2xl">
        <div className="p-5 border-b border-gray-200/50 bg-gradient-to-br from-white to-gray-50/50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Éditeur PDF</h2>
                <p className="text-xs text-gray-500">Configuration dynamique</p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Fermer l'éditeur"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            )}
          </div>

          {/* TEMA */}
          <div className="mb-5">
            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Thème de Base</label>
            <select 
              value={selectedTheme}
              onChange={(e) => setSelectedTheme(normalizeTemplateKey(e.target.value))}
              className="w-full p-3 border-2 border-gray-200 rounded-xl bg-white hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none font-medium text-sm"
            >
              {Object.entries(THEME_REGISTRY).map(([key, t]) => (
                <option key={key} value={key}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* COLORES */}
          <div className="space-y-4">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <Palette className="w-3.5 h-3.5" />
              Palette de couleurs
            </label>
            
            {[
              { label: 'Couleur Principale', path: 'colors.primary' },
              { label: 'En-tête Tableau', path: 'colors.background.tableHeader' },
              { label: 'Fond En-tête', path: 'colors.background.header' }
            ].map(({ label, path }) => {
              const keys = path.split('.');
              let value: any = theme;
              
              // Validación defensiva: asegurar que theme existe
              if (!value) return null;
              
              try {
                for (const k of keys) {
                  value = value[k];
                  if (value === undefined) {
                    console.warn(`Missing theme property: ${path}`);
                    value = '#000000'; // fallback color
                    break;
                  }
                }
              } catch (error) {
                console.error(`Error accessing theme path: ${path}`, error);
                value = '#000000'; // fallback color
              }
              
              return (
                <div key={path} className="bg-gradient-to-br from-gray-50 to-white p-3 rounded-xl border border-gray-200/50">
                  <label className="block text-xs font-medium text-gray-600 mb-2">{label}</label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      value={value}
                      onChange={(e) => updateColor(path, e.target.value)}
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-200 hover:border-blue-400 transition-all"
                    />
                    <input 
                      type="text" 
                      value={value}
                      onChange={(e) => updateColor(path, e.target.value)}
                      className="flex-1 p-3 border-2 border-gray-200 rounded-lg text-sm font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ZOOM */}
          <div className="mt-5 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200/50">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-blue-900 uppercase tracking-wide">Zoom</label>
              <span className="text-sm font-bold text-blue-600">{Math.round(zoom * 100)}%</span>
            </div>
            <input 
              type="range" 
              min="0.3" 
              max="1.2" 
              step="0.05" 
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full h-2 bg-blue-200 rounded-full appearance-none cursor-pointer"
            />
          </div>

          {/* GRID */}
          <div className="mt-4">
            <label className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl cursor-pointer transition-all">
              <input 
                type="checkbox" 
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                className="w-5 h-5 rounded border-2 border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">Afficher la grille</span>
            </label>
          </div>

          {/* CARGAR IMAGEN */}
          <div className="mt-5">
            <input 
              type="file" 
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all shadow-lg"
            >
              <Upload className="w-4 h-4" />
              Ajouter Image de Fond
            </button>
          </div>
        </div>

        {/* IMAGENES DE FONDO */}
        {backgroundImages.length > 0 && (
          <div className="p-5 border-b border-gray-200/50 bg-gradient-to-br from-purple-50 to-pink-50">
            <h3 className="text-xs font-bold text-purple-900 mb-3 uppercase tracking-wide">
              🖼️ Images de Fond ({backgroundImages.length})
            </h3>
            <div className="space-y-2">
              {backgroundImages.map((img, index) => (
                <div 
                  key={img.id}
                  onClick={() => setSelectedElement(img.id)}
                  className={`p-3 rounded-xl text-sm cursor-pointer transition-all ${
                    selectedElement === img.id 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg' 
                      : 'bg-white border border-purple-200 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium ${img.visible === false ? 'opacity-50 line-through' : ''}`}>
                      🖼️ Image {index + 1}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); moveImageLayer(img.id, 'up'); }}
                        disabled={index === backgroundImages.length - 1}
                        className="p-1 rounded hover:bg-white/20 disabled:opacity-30"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveImageLayer(img.id, 'down'); }}
                        disabled={index === 0}
                        className="p-1 rounded hover:bg-white/20 disabled:opacity-30"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleVisibility(img.id, true); }}
                        className="p-1 rounded hover:bg-white/20"
                        title={img.visible === false ? 'Afficher' : 'Masquer'}
                      >
                        {img.visible === false ? 
                          <EyeOff className="w-3 h-3 opacity-50" /> : 
                          <Eye className="w-3 h-3" />
                        }
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleLock(img.id, true); }}
                        className="p-1 rounded hover:bg-white/20"
                      >
                        {img.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteImage(img.id); }}
                        className="p-1 rounded hover:bg-red-100"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">Transparence</span>
                      <span className="text-xs font-bold">{Math.round(img.opacity * 100)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.05" 
                      value={img.opacity}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateImageOpacity(img.id, parseFloat(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/30"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ELEMENTOS */}
        <div className="p-5 border-b border-gray-200/50">
          <h3 className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide flex items-center gap-2">
            <Move className="w-4 h-4" />
            Éléments ({elements.length})
          </h3>
          <div className="space-y-2">
            {elements.map(el => (
              <div 
                key={el.id}
                onClick={() => setSelectedElement(el.id)}
                className={`p-3 rounded-xl text-sm cursor-pointer flex items-center justify-between transition-all ${
                  selectedElement === el.id 
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg' 
                    : 'bg-white hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-base">
                    {el.type === 'logo' ? '🏢' : el.type === 'table' ? '📊' : el.type === 'totals' ? '💰' : el.type === 'qr_bill' ? '📱' : '📝'}
                  </span>
                  <span className={`font-medium ${el.visible === false ? 'opacity-50 line-through' : ''}`}>{el.label}</span>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleVisibility(el.id); }}
                    className={`p-1.5 rounded-lg transition-all ${
                      selectedElement === el.id ? 'hover:bg-white/20' : 'hover:bg-gray-100'
                    }`}
                    title={el.visible === false ? 'Afficher' : 'Masquer'}
                  >
                    {el.visible === false ? 
                      <EyeOff className="w-3.5 h-3.5 opacity-50" /> : 
                      <Eye className="w-3.5 h-3.5" />
                    }
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleLock(el.id); }}
                    className={`p-1.5 rounded-lg transition-all ${
                      selectedElement === el.id ? 'hover:bg-white/20' : 'hover:bg-gray-100'
                    }`}
                    title={el.locked ? 'Déverrouiller' : 'Verrouiller'}
                  >
                    {el.locked ? <Lock className="w-3.5 h-3.5 text-red-500" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PROPIEDADES */}
        {selectedEl && (
          <div className="p-5 border-b border-gray-200/50 bg-gradient-to-br from-indigo-50 to-purple-50">
            <h3 className="text-xs font-bold text-indigo-900 mb-3 uppercase tracking-wide">Propriétés</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center p-2 bg-white rounded-lg">
                <span className="text-gray-600">Position:</span>
                <span className="font-mono font-semibold text-indigo-600">({selectedEl.x}, {selectedEl.y})</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white rounded-lg">
                <span className="text-gray-600">Taille:</span>
                <span className="font-mono font-semibold text-indigo-600">{selectedEl.width} × {selectedEl.height}</span>
              </div>
              {selectedEl.id === 'table' && (
                <div className="p-3 bg-white rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-semibold">Style de Tableau:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setTableStyle('classic')}
                      className={`p-2.5 rounded-lg text-xs font-medium transition-all ${
                        tableStyle === 'classic'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      🦓 Classique
                    </button>
                    <button
                      onClick={() => setTableStyle('modern')}
                      className={`p-2.5 rounded-lg text-xs font-medium transition-all ${
                        tableStyle === 'modern'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      ✨ Moderne
                    </button>
                    <button
                      onClick={() => setTableStyle('bordered')}
                      className={`p-2.5 rounded-lg text-xs font-medium transition-all ${
                        tableStyle === 'bordered'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      📋 Bordé
                    </button>
                    <button
                      onClick={() => setTableStyle('minimal')}
                      className={`p-2.5 rounded-lg text-xs font-medium transition-all ${
                        tableStyle === 'minimal'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      🌿 Minimal
                    </button>
                    <button
                      onClick={() => setTableStyle('bold')}
                      className={`p-2.5 rounded-lg text-xs font-medium transition-all col-span-2 ${
                        tableStyle === 'bold'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      💪 Audacieux
                    </button>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-2 bg-gray-50 p-2 rounded">
                    {tableStyle === 'classic' && '🦓 Lignes alternées (zebra striping)'}
                    {tableStyle === 'modern' && '✨ Design épuré avec bordure accentuée'}
                    {tableStyle === 'bordered' && '📋 Grille complète avec bordures sur toutes les cellules'}
                    {tableStyle === 'minimal' && '🌿 Sans bordures, séparateurs subtils'}
                    {tableStyle === 'bold' && '💪 En-tête puissant avec bordures épaisses'}
                  </div>
                </div>
              )}
              {selectedEl.id === 'totals' && (
                <div className="p-3 bg-white rounded-lg space-y-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600 font-semibold">Style:</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setTotalsStyle('filled')}
                      className={`p-2 rounded-lg text-xs font-medium transition-all ${
                        totalsStyle === 'filled'
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      Rempli
                    </button>
                    <button
                      onClick={() => setTotalsStyle('outlined')}
                      className={`p-2 rounded-lg text-xs font-medium transition-all ${
                        totalsStyle === 'outlined'
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      Contour
                    </button>
                    <button
                      onClick={() => setTotalsStyle('minimal')}
                      className={`p-2 rounded-lg text-xs font-medium transition-all ${
                        totalsStyle === 'minimal'
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      Minimal
                    </button>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-2">
                    {totalsStyle === 'filled' && '🎨 Fond coloré avec texte blanc'}
                    {totalsStyle === 'outlined' && '🖼️ Bordure colorée avec texte de couleur'}
                    {totalsStyle === 'minimal' && '✨ Sans fond, texte de couleur'}
                  </div>
                </div>
              )}
              {selectedEl.type === 'background_image' && (
                <>
                  <div className="p-3 bg-white rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-semibold">Opacité:</span>
                      <span className="font-mono font-semibold text-purple-600">{Math.round(selectedEl.opacity * 100)}%</span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={selectedEl.opacity}
                      onChange={(e) => updateImageOpacity(selectedEl.id, parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const imgEl = backgroundImages.find(img => img.id === selectedEl.id);
                      if (imgEl) {
                        setElements(prev => prev.filter(el => el.id !== selectedEl.id));
                        setBackgroundImages(prev => prev.filter(img => img.id !== selectedEl.id));
                        setSelectedElement(null);
                        onShowToast('🗑️ Image supprimée', 'info');
                      }
                    }}
                    className="w-full p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold transition-colors"
                  >
                    🗑️ Supprimer l'image
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ACCIONES */}
        <div className="p-5 space-y-2">
          <button 
            onClick={() => setShowCode(!showCode)}
            className="w-full p-3 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-gray-700 transition-all"
          >
            <Code className="w-4 h-4" />
            {showCode ? 'Masquer' : 'Voir'} le Code
          </button>
          <button 
            onClick={saveConfiguration}
            disabled={saving}
            className={`w-full p-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all shadow-lg ${
              saving 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
            } text-white`}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Enregistrement en cours...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Enregistrer
              </>
            )}
          </button>
          <button 
            onClick={() => { setElements(DEFAULT_ELEMENTS); setBackgroundImages([]); }}
            className="w-full p-3 bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 text-red-700 border-2 border-red-200 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Réinitialiser
          </button>
        </div>
      </div>

      {/* CANVAS */}
      <div className="flex-1 overflow-auto p-8 flex items-center justify-center">
        <div 
          ref={canvasRef}
          style={{
            width: A4_WIDTH * zoom,
            height: A4_HEIGHT * zoom,
            position: 'relative'
          }}
          className="bg-white shadow-2xl rounded-lg overflow-hidden"
        >
          {showGrid && (
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage: 'linear-gradient(to right, rgba(203, 213, 225, 0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(203, 213, 225, 0.3) 1px, transparent 1px)',
              backgroundSize: `${20 * zoom}px ${20 * zoom}px` 
            }} />
          )}

          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: theme.layout.headerHeight * zoom,
              backgroundColor: theme.colors.background.header
            }}
          />

          <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: A4_WIDTH, height: A4_HEIGHT }}>
            {backgroundImages.filter(img => img.visible !== false).map(renderElement)}
            {elements.filter(el => el.visible !== false).map(renderElement)}
          </div>
        </div>
      </div>

      {/* CODIGO */}
      {showCode && (
        <div className="w-96 bg-gradient-to-br from-gray-900 to-slate-800 text-white overflow-y-auto shadow-2xl flex flex-col">
          <div className="p-5 border-b border-gray-700/50">
            <h3 className="text-sm font-bold mb-1 flex items-center gap-2">
              <Code className="w-4 h-4 text-blue-400" />
              Code JSON
            </h3>
            <p className="text-xs text-gray-400">Configuration pour le backend (éditable)</p>
          </div>
          <div className="p-5 flex-1 flex flex-col">
            <textarea
              value={editableCode}
              onChange={(e) => setEditableCode(e.target.value)}
              className="flex-1 text-xs font-mono bg-black/30 p-4 rounded-lg border border-gray-700 text-white resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              spellCheck={false}
              placeholder="{}"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  try {
                    JSON.parse(editableCode);
                    navigator.clipboard.writeText(editableCode);
                    onShowToast('✅ Code copié dans le presse-papier!', 'success');
                  } catch (e) {
                    onShowToast('❌ JSON invalide!', 'error');
                  }
                }}
                className="flex-1 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all"
              >
                📋 Copier
              </button>
              <button
                onClick={() => {
                  const config = exportConfig();
                  setEditableCode(JSON.stringify(config, null, 2));
                  onShowToast('🔄 Code réinitialisé', 'info');
                }}
                className="flex-1 p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-semibold transition-all"
              >
                🔄 Réinitialiser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
