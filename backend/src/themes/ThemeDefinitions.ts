export interface ThemeColors {
  primary: string;    // Main accent color (headers, totals)
  secondary: string;  // Secondary accents (borders, highlights)
  text: {
    header: string;   // Color for header text
    body: string;     // Main body text
    muted: string;    // Secondary/metadata text
    inverse: string;  // Text on primary background
  };
  background: {
    header: string;   // Header background color
    tableHeader: string; // Table header background
    body: string;     // Main background
    altRow: string;   // Alternating row color
  };
}

export interface ThemeFonts {
  heading: string;
  body: string;
  sizes: {
    h1: number;
    h2: number;
    body: number;
    small: number;
  };
}

export interface ThemeLayout {
  margins: { top: number; bottom: number; left: number; right: number };
  headerHeight: number;
  logoHeight: number;
  logoPosition: 'left' | 'right' | 'center';
}

export interface ThemeConfig {
  name: string;
  key: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
  layout: ThemeLayout;
}

// Default Swiss Minimal Theme
export const SwissMinimalTheme: ThemeConfig = {
  name: 'Swiss Minimal',
  key: 'swiss_minimal',
  colors: {
    primary: '#000000',
    secondary: '#E5E5E5',
    text: {
      header: '#000000',
      body: '#111111',
      muted: '#666666',
      inverse: '#FFFFFF'
    },
    background: {
      header: '#FFFFFF',
      tableHeader: '#FAFAFA',
      body: '#FFFFFF',
      altRow: '#FFFFFF' // Clean look, no stripes
    }
  },
  fonts: {
    heading: 'Helvetica-Bold',
    body: 'Helvetica',
    sizes: { h1: 24, h2: 14, body: 9, small: 8 }
  },
  layout: {
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
    headerHeight: 120,
    logoHeight: 40,
    logoPosition: 'left'
  }
};

// Modern Blue Corporate Theme
export const ModernBlueTheme: ThemeConfig = {
  name: 'Modern Blue',
  key: 'modern_blue',
  colors: {
    primary: '#2563EB', // Blue 600
    secondary: '#BFDBFE', // Blue 200
    text: {
      header: '#1E3A8A', // Blue 900
      body: '#334155', // Slate 700
      muted: '#64748B', // Slate 500
      inverse: '#FFFFFF'
    },
    background: {
      header: '#EFF6FF', // Blue 50
      tableHeader: '#EFF6FF',
      body: '#FFFFFF',
      altRow: '#F8FAFC' // Slate 50
    }
  },
  fonts: {
    heading: 'Helvetica-Bold',
    body: 'Helvetica',
    sizes: { h1: 26, h2: 16, body: 10, small: 8 }
  },
  layout: {
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
    headerHeight: 140,
    logoHeight: 50,
    logoPosition: 'right'
  }
};

// Creative Bold Theme
export const CreativeBoldTheme: ThemeConfig = {
  name: 'Creative Bold',
  key: 'creative_bold',
  colors: {
    primary: '#7C3AED', // Violet 600
    secondary: '#DDD6FE', // Violet 200
    text: {
      header: '#FFFFFF', // White on purple
      body: '#1F2937', // Gray 800
      muted: '#9CA3AF', // Gray 400
      inverse: '#FFFFFF'
    },
    background: {
      header: '#7C3AED', // Full color header
      tableHeader: '#7C3AED',
      body: '#FFFFFF',
      altRow: '#F5F3FF' // Violet 50
    }
  },
  fonts: {
    heading: 'Helvetica-Bold',
    body: 'Helvetica',
    sizes: { h1: 30, h2: 18, body: 10, small: 9 }
  },
  layout: {
    margins: { top: 0, bottom: 40, left: 40, right: 40 }, // Full bleed header
    headerHeight: 160,
    logoHeight: 60,
    logoPosition: 'left'
  }
};

export const ThemeRegistry: Record<string, ThemeConfig> = {
  'swiss_minimal': SwissMinimalTheme,
  'minimal_modern': SwissMinimalTheme, // Alias for backward compatibility
  'european_minimal': SwissMinimalTheme, // Alias
  'modern_blue': ModernBlueTheme,
  'swiss_blue': ModernBlueTheme, // Alias
  'professional': ModernBlueTheme, // Alias
  'creative_bold': CreativeBoldTheme,
  'bold_statement': CreativeBoldTheme, // Alias
  'creative_premium': CreativeBoldTheme, // Alias
};

export const getThemeConfig = (key: string | undefined, customPrimaryColor?: string): ThemeConfig => {
  const baseTheme = ThemeRegistry[key || 'swiss_minimal'] || SwissMinimalTheme;
  
  // Deep copy to avoid mutating the singleton
  const theme = JSON.parse(JSON.stringify(baseTheme));

  // Store original primary color for elements that should NOT use custom color (like totals)
  (theme as any).colors.primaryOriginal = theme.colors.primary;

  // Apply custom primary color overrides if provided
  if (customPrimaryColor && customPrimaryColor !== '#000000') {
    // For Swiss Minimal: Keep black/white aesthetic - only use custom color for minimal accents
    if (theme.key === 'swiss_minimal' || theme.key === 'minimal_modern' || theme.key === 'european_minimal') {
      // Swiss Minimal stays minimal - custom color only for very subtle accents (borders, totals)
      theme.colors.primary = customPrimaryColor;
      // DO NOT change header or tableHeader backgrounds - keep white
    } else {
      // Other themes: Apply custom color more prominently
      theme.colors.primary = customPrimaryColor;
      
      // Intelligent overrides based on theme type
      if (theme.key === 'creative_bold') {
        // Creative Bold: Apply custom color to header and table backgrounds
        theme.colors.background.header = customPrimaryColor;
        theme.colors.background.tableHeader = customPrimaryColor;
      } else if (theme.key === 'modern_blue') {
         // Modern Blue: Apply custom color to header and table backgrounds (same as creative bold)
         theme.colors.background.header = customPrimaryColor;
         theme.colors.background.tableHeader = customPrimaryColor;
      }
    }
  }

  return theme;
};
