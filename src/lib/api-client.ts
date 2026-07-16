import { createRequire } from 'node:module';
import { GlassnodeAPI } from 'glassnode-api';
import { log } from './logger.js';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json') as { version: string };

export const USER_AGENT = `glassnode-terminal-${version}`;

let clientInstance: GlassnodeAPI | null = null;
let x402Enabled = false;
let x402FetchStore: typeof globalThis.fetch | null = null;
let x402BaseUrl = 'https://x402.glassnode.com';

/** True when the client is in x402 pay-per-call mode (set by initClient). */
export function isX402Enabled(): boolean {
  return x402Enabled;
}

/**
 * Fetch the current "advanced" (x402-reachable) metric paths live via x402.
 * This is one paid metadata call — used only when refreshing the bundled catalog.
 */
export async function fetchX402AdvancedPaths(): Promise<string[]> {
  if (!x402FetchStore) throw new Error('fetchX402AdvancedPaths is only available in x402 mode.');
  const filter = encodeURIComponent('metadata.products.exists(product,product=="advanced")');
  const res = await x402FetchStore(`${x402BaseUrl}/v1/metadata/metrics?metadata_filter=${filter}`);
  if (!res.ok) throw new Error(`Failed to fetch advanced metric list: ${res.status}`);
  return (await res.json()) as string[];
}

/**
 * Redact secrets before anything reaches the log view. The client logs request
 * URLs; in metered mode those carry the API key as an `api_key` query param.
 * (glassnode-api ≥0.8 also masks it itself — this is belt-and-suspenders.)
 */
function redactSecrets(text: string): string {
  return text.replace(/((?:api_key|apiKey|token)=)[^&\s]+/gi, '$1***');
}

const logger = (...parts: unknown[]) =>
  log(
    'info',
    redactSecrets(
      parts
        .map((p) => {
          if (typeof p === 'string') return p;
          try {
            return JSON.stringify(p);
          } catch {
            return String(p); // guard against circular refs
          }
        })
        .join(' '),
    ),
  );

/**
 * Base fetch that tags every request with our User-Agent, preserving all other
 * headers. Normalizing through `new Request(input, init)` keeps headers from a
 * Request input intact — important for x402, which retries with a Request that
 * carries the `X-Payment` header; rebuilding headers from only `init` would drop it.
 */
const userAgentFetch: typeof globalThis.fetch = (input, init) => {
  const req = new Request(input as RequestInfo, init);
  req.headers.set('User-Agent', USER_AGENT);
  return globalThis.fetch(req);
};

/**
 * Initialize the shared GlassnodeAPI client. Must be awaited once at startup,
 * before any createClient() call. Credentials are chosen from the environment:
 *
 *  - x402 pay-per-call: set X402_PRIVATE_KEY to a funded Base wallet key.
 *    Requests hit x402.glassnode.com and settle in USDC per call. X402_MAX_PAYMENT
 *    caps spend per request (USDC, default '0.06'); X402_API_URL overrides the host.
 *  - free/metered: set GLASSNODE_API_KEY.
 *
 * GLASSNODE_MODE ('api' | 'x402') explicitly picks the mode; otherwise x402 is
 * used when a wallet key is present.
 */
export async function initClient(): Promise<GlassnodeAPI> {
  if (clientInstance) return clientInstance;

  const x402Key = process.env['X402_PRIVATE_KEY']?.trim();
  const apiKey = process.env['GLASSNODE_API_KEY'];

  // Explicit toggle wins; otherwise default to x402 when a wallet key is present.
  const mode = process.env['GLASSNODE_MODE']?.trim().toLowerCase();
  if (mode && mode !== 'api' && mode !== 'x402') {
    throw new Error(`Invalid GLASSNODE_MODE "${mode}" — expected "api" or "x402".`);
  }
  const wantX402 = mode === 'x402' || (mode !== 'api' && !!x402Key);

  if (wantX402) {
    if (!x402Key) {
      throw new Error('x402 mode selected but X402_PRIVATE_KEY is not set.');
    }
    // Optional peer deps, loaded only when x402 is actually used.
    const { createX402Fetch } = await import('glassnode-api/x402');
    const { privateKeyToAccount } = await import('viem/accounts');

    const pk = (x402Key.startsWith('0x') ? x402Key : `0x${x402Key}`) as `0x${string}`;
    const account = privateKeyToAccount(pk);
    const maxPerCall = process.env['X402_MAX_PAYMENT']?.trim() || '0.06';
    const apiUrl = process.env['X402_API_URL']?.trim() || undefined; // e.g. testnet; defaults to x402.glassnode.com

    const x402Fetch = await createX402Fetch({
      account,
      maxPaymentPerCall: maxPerCall,
      fetch: userAgentFetch,
    });

    clientInstance = new GlassnodeAPI({ x402: true, apiUrl, fetch: x402Fetch, logger });
    x402Enabled = true;
    // Stash the paid fetch + base URL for the optional live catalog refresh.
    x402FetchStore = x402Fetch;
    x402BaseUrl = apiUrl || 'https://x402.glassnode.com';
    log('info', `x402 enabled — wallet ${account.address}, max ${maxPerCall} USDC/call${apiUrl ? ` @ ${apiUrl}` : ''}`);
    return clientInstance;
  }

  if (!apiKey) {
    throw new Error(
      mode === 'api'
        ? 'API mode selected but GLASSNODE_API_KEY is not set.'
        : 'No Glassnode credentials found.\n' +
          'Set GLASSNODE_API_KEY (free/metered), or\n' +
          'X402_PRIVATE_KEY (a funded Base wallet key) for x402 pay-per-call.',
    );
  }

  clientInstance = new GlassnodeAPI({ apiKey, fetch: userAgentFetch, logger });
  log('info', 'API-key mode enabled');
  return clientInstance;
}

/**
 * Return the initialized GlassnodeAPI client.
 * Throws if initClient() has not completed — call it once at startup.
 */
export function createClient(): GlassnodeAPI {
  if (!clientInstance) {
    throw new Error('GlassnodeAPI client not initialized — call initClient() at startup.');
  }
  return clientInstance;
}
