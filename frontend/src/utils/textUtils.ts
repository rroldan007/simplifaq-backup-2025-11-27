/**
 * Normalizes a string by removing accents, diacritics, and special characters.
 * Converts to lowercase and collapses whitespace.
 * Useful for fuzzy search and comparison.
 */
export const normalizeString = (s: string): string => {
    try {
        return s
            // Normalize compatibility to expand ligatures
            .normalize('NFKD')
            // Convert common ligatures explicitly
            .replace(/[œŒ]/g, 'oe')
            .replace(/[æÆ]/g, 'ae')
            .replace(/ß/g, 'ss')
            // Standardize diverse apostrophes/quotes/dashes to spaces
            .replace(/[’‘`´']/g, ' ')
            .replace(/[–—]/g, '-')
            // Remove combining diacritics after expansions
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            // Keep alnum, percent, spaces and hyphen
            .replace(/[^a-z0-9%\s-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    } catch {
        // Fallback when String.prototype.normalize is not supported
        return s.toLowerCase();
    }
};
