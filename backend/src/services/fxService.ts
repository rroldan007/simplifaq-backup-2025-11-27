type FxMap = Record<string, number>; // currency -> rate vs EUR (1 EUR = rate * CCY)

const cache = new Map<string, FxMap>(); // key: YYYY-MM-DD

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function fetchEcbRates(date: Date): Promise<FxMap> {
  // Pragmatic: use latest rates endpoint (historical can be added later)
  const url = 'https://api.exchangerate.host/latest?base=EUR&symbols=CHF,USD,EUR';
  const res = await (globalThis as any).fetch(url);
  if (!res.ok) throw new Error('FX fetch failed');
  const data = await res.json();
  const rates: FxMap = data?.rates || {};
  // Ensure EUR=1
  rates['EUR'] = 1;
  return rates;
}

export async function getRates(date: Date): Promise<FxMap> {
  const key = fmtDate(date);
  if (cache.has(key)) return cache.get(key)!;
  const rates = await fetchEcbRates(date);
  cache.set(key, rates);
  return rates;
}

export async function convert(amount: number, from: string, to: string, date: Date): Promise<number> {
  if (!amount || from === to) return amount;
  const rates = await getRates(date);
  const rFrom = rates[from];
  const rTo = rates[to];
  if (!rFrom || !rTo) throw new Error(`Missing FX rate for ${from} or ${to}`);
  // amounts are in 'from' currency. Convert to EUR then to 'to'
  const amountInEur = amount / rFrom; // because 1 EUR = rFrom * FROM
  return amountInEur * rTo;
}
