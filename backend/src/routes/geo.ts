import { Router } from 'express';

const router = Router();

// --- Simple in-memory cache & rate limiting for geo proxy ---
type CacheEntry = { expires: number; payload: any };
const geoCache = new Map<string, CacheEntry>();

const CACHE_TTL_MS = Math.max(
  0,
  Number(process.env.GEO_PROXY_CACHE_TTL_MS || 120_000)
);

type RateEntry = { count: number; resetAt: number };
const rateMap = new Map<string, RateEntry>();
const RATE_WINDOW_MS = Math.max(
  1_000,
  Number(process.env.GEO_PROXY_RATE_LIMIT_WINDOW_MS || 60_000)
);
const RATE_MAX = Math.max(
  1,
  Number(process.env.GEO_PROXY_RATE_LIMIT_MAX || 30)
);

// Periodic cleanup for memory maps
const CLEANUP_INTERVAL_MS = Math.max(
  10_000,
  Number(process.env.GEO_PROXY_CLEANUP_INTERVAL_MS || 300_000)
);

// Avoid creating multiple intervals if module gets hot-reloaded
let cleanupTimer: NodeJS.Timeout | null = null;
function startCleanupTimer() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    // Prune expired geo cache
    for (const [k, v] of geoCache.entries()) {
      if (v.expires <= now) geoCache.delete(k);
    }
    // Prune expired rate entries (window passed)
    for (const [k, v] of rateMap.entries()) {
      if (v.resetAt <= now) rateMap.delete(k);
    }
  }, CLEANUP_INTERVAL_MS);
  // Do not keep process alive because of this timer in serverless-like envs
  if (typeof cleanupTimer.unref === 'function') cleanupTimer.unref();
}
startCleanupTimer();

function getClientIp(req: any): string {
  const xf = (req.headers?.['x-forwarded-for'] as string) || '';
  const ip = xf.split(',')[0].trim() || req.ip || req.connection?.remoteAddress || 'unknown';
  return ip;
}

function checkRateLimit(req: any): { allowed: boolean; remaining: number; reset: number } {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || entry.resetAt <= now) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, remaining: RATE_MAX - 1, reset: now + RATE_WINDOW_MS };
  }
  if (entry.count >= RATE_MAX) {
    return { allowed: false, remaining: 0, reset: entry.resetAt };
  }
  entry.count += 1;
  return { allowed: true, remaining: RATE_MAX - entry.count, reset: entry.resetAt };
}

function cacheKey(query: string, limit: string, lang: string): string {
  return `q=${query}|l=${limit}|lang=${lang}`;
}

// GET /api/geo/search?query=...&limit=8&lang=fr
router.get('/search', async (req, res) => {
  const query = (req.query.query as string || '').trim();
  const limit = String(req.query.limit || '8');
  const lang = String(req.query.lang || 'fr');

  if (!query || query.length < 3) {
    return res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Paramètre query requis (>= 3 caractères)' },
      timestamp: new Date().toISOString(),
    });
  }

  // Per-IP rate limit (fixed window)
  const rate = checkRateLimit(req);
  res.setHeader('X-RateLimit-Limit', String(RATE_MAX));
  res.setHeader('X-RateLimit-Remaining', String(rate.remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(rate.reset / 1000)));
  if (!rate.allowed) {
    return res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Trop de requêtes. Veuillez réessayer plus tard.' },
      timestamp: new Date().toISOString(),
    });
  }

  // Cache lookup
  const key = cacheKey(query, limit, lang);
  const now = Date.now();
  const cached = geoCache.get(key);
  if (cached && cached.expires > now) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached.payload);
  }

  try {
    const CANTON_MAP: Record<string, string> = {
      'ag': 'AG', 'aargau': 'AG', 'argovie': 'AG',
      'ai': 'AI', 'appenzell innerrhoden': 'AI', 'appenzell rhodes-intérieures': 'AI',
      'ar': 'AR', 'appenzell ausserrhoden': 'AR', 'appenzell rhodes-extérieures': 'AR',
      'be': 'BE', 'bern': 'BE', 'berne': 'BE',
      'bl': 'BL', 'basel-landschaft': 'BL', 'bâle-campagne': 'BL',
      'bs': 'BS', 'basel-stadt': 'BS', 'bâle-ville': 'BS',
      'fr': 'FR', 'fribourg': 'FR', 'freiburg': 'FR',
      'ge': 'GE', 'geneva': 'GE', 'genève': 'GE',
      'gl': 'GL', 'glarus': 'GL', 'glaris': 'GL',
      'gr': 'GR', 'graubünden': 'GR', 'grisons': 'GR',
      'ju': 'JU', 'jura': 'JU',
      'lu': 'LU', 'lucerne': 'LU', 'lucerne fr': 'LU', 'luzern': 'LU',
      'ne': 'NE', 'neuchâtel': 'NE', 'neuchatel': 'NE',
      'nw': 'NW', 'nidwalden': 'NW', 'nidwald': 'NW',
      'ow': 'OW', 'obwalden': 'OW', 'obwald': 'OW',
      'sg': 'SG', 'st. gallen': 'SG', 'saint-gall': 'SG', 'st gallen': 'SG',
      'sh': 'SH', 'schaffhausen': 'SH', 'schaffhouse': 'SH',
      'so': 'SO', 'solothurn': 'SO', 'soleure': 'SO',
      'sz': 'SZ', 'schwyz': 'SZ',
      'tg': 'TG', 'thurgau': 'TG', 'thurgovie': 'TG',
      'ti': 'TI', 'ticino': 'TI', 'tessin': 'TI',
      'ur': 'UR', 'uri': 'UR',
      'vd': 'VD', 'vaud': 'VD',
      'vs': 'VS', 'valais': 'VS', 'wallis': 'VS',
      'zg': 'ZG', 'zug': 'ZG', 'zoug': 'ZG',
      'zh': 'ZH', 'zürich': 'ZH', 'zurich': 'ZH'
    };
    const normalizeCanton = (v: any): string => {
      if (!v) return '';
      const s = String(v).trim();
      if (s.length === 2 && CANTON_MAP[s.toLowerCase()]) return CANTON_MAP[s.toLowerCase()];
      const m = CANTON_MAP[s.toLowerCase()];
      return m || '';
    };
    
    // Strip HTML tags from string
    const stripHtml = (str: string): string => {
      if (!str) return '';
      return String(str).replace(/<[^>]*>/g, '').trim();
    };
    
    // Parse geo.admin.ch label format: "Rue Name Number, ZIP City"
    const parseGeoAdminLabel = (label: string) => {
      const clean = stripHtml(label);
      // Format: "Avenue KRIEG 7, 1208 Genève" or "Avenue KRIEG 7 1208 Genève"
      const commaMatch = clean.match(/^(.+?),\s*(\d{4})\s+(.+)$/);
      if (commaMatch) {
        return {
          streetWithNumber: commaMatch[1].trim(),
          zip: commaMatch[2],
          city: commaMatch[3].trim()
        };
      }
      // Try without comma: "Avenue KRIEG 7 1208 Genève"
      const spaceMatch = clean.match(/^(.+?)\s+(\d{4})\s+(.+)$/);
      if (spaceMatch) {
        return {
          streetWithNumber: spaceMatch[1].trim(),
          zip: spaceMatch[2],
          city: spaceMatch[3].trim()
        };
      }
      return { streetWithNumber: clean, zip: '', city: '' };
    };
    
    const normalizeGeoAdmin = (r: any) => {
      const a = (r && (r.attrs || r.attributes || r.properties)) || {};
      
      // Try to get structured data first
      let street = stripHtml(a.street || a.strname || '');
      let number = stripHtml(a.number || a.housenumber || a.house_no || '');
      let zip = stripHtml(a.zip || a.postcode || a.zipcode || '');
      let city = stripHtml(a.city || a.municipality || a.commune || a.locality || '');
      const cantonRaw = a.canton || a.state || a.district || a.cantoncode || '';
      const canton = normalizeCanton(cantonRaw);
      
      // If we don't have structured data, parse the label
      if (!street && (a.label || r.label)) {
        const parsed = parseGeoAdminLabel(a.label || r.label);
        street = parsed.streetWithNumber;
        if (!zip) zip = parsed.zip;
        if (!city) city = parsed.city;
      }
      
      // Extract number from street if combined (e.g., "Avenue KRIEG 7")
      if (street && !number) {
        const streetMatch = street.match(/^(.+?)\s+(\d+[a-zA-Z]?)$/);
        if (streetMatch) {
          street = streetMatch[1].trim();
          number = streetMatch[2];
        }
      }
      
      return { attrs: { street, number, zip, city, canton } };
    };
    const dedupe = (list: any[]) => {
      const map = new Map<string, any>();
      for (const item of list) {
        const at = item?.attrs || {};
        const key = [at.street || '', at.number || '', at.zip || '', at.city || '', at.canton || '']
          .map((s: string) => String(s).trim().toLowerCase())
          .join('|');
        if (!map.has(key)) map.set(key, item);
      }
      return Array.from(map.values());
    };
    // Primary: geo.admin.ch
    const url = new URL('https://api3.geo.admin.ch/rest/services/api/SearchServer');
    url.searchParams.set('type', 'locations');
    url.searchParams.set('searchText', query);
    url.searchParams.set('origins', 'address');
    url.searchParams.set('lang', lang);
    url.searchParams.set('limit', limit);

    const gres = await fetch(url.toString());
    if (gres.ok) {
      const gdata = (await gres.json()) as { results?: any[] } | undefined;
      const raw = Array.isArray(gdata?.results) ? gdata!.results! : [];
      const mapped = raw.map(normalizeGeoAdmin).filter((x: any) => x?.attrs?.street);
      // If geo.admin returned results, respond immediately (after dedupe); otherwise try fallback
      if (mapped.length > 0) {
        const deduped = dedupe(mapped);
        const payload = { success: true, results: deduped };
        if (CACHE_TTL_MS > 0) {
          geoCache.set(key, { payload, expires: now + CACHE_TTL_MS });
        }
        res.setHeader('X-Cache', 'MISS');
        return res.json(payload);
      }
    }

    // Fallback: Nominatim (CH only)
    const nurl = new URL('https://nominatim.openstreetmap.org/search');
    nurl.searchParams.set('q', query);
    nurl.searchParams.set('countrycodes', 'ch');
    nurl.searchParams.set('format', 'json');
    nurl.searchParams.set('addressdetails', '1');
    nurl.searchParams.set('limit', limit);

    const nres = await fetch(nurl.toString(), {
      headers: {
        'Accept': 'application/json',
        // Nominatim requires a valid User-Agent
        'User-Agent': 'SimplitestDev/1.0 (contact: dev@example.com)'
      }
    });

    if (nres.ok) {
      const ndata = (await nres.json()) as unknown as any[];
      const mapped = Array.isArray(ndata)
        ? ndata.map((r: any) => ({
            attrs: {
              street: r.address?.road || r.address?.pedestrian || r.address?.path || r.display_name,
              number: r.address?.house_number,
              zip: r.address?.postcode,
              city: r.address?.city || r.address?.town || r.address?.village || r.address?.hamlet,
              canton: normalizeCanton(r.address?.state || r.address?.county),
            },
          }))
        : [];
      const deduped = dedupe(mapped);
      const payload = { success: true, results: deduped, source: 'nominatim' };
      if (CACHE_TTL_MS > 0) {
        geoCache.set(key, { payload, expires: now + CACHE_TTL_MS });
      }
      res.setHeader('X-Cache', 'MISS');
      return res.json(payload);
    }

    return res.status(502).json({
      success: false,
      error: { code: 'UPSTREAM_ERROR', message: 'Services de géocodage indisponibles' },
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: e?.message || 'Erreur serveur' },
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
