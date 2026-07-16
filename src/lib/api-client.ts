import { createRequire } from 'node:module';
import { GlassnodeAPI } from 'glassnode-api';
import { log } from './logger.js';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json') as { version: string };

export const USER_AGENT = `glassnode-terminal-${version}`;

let clientInstance: GlassnodeAPI | null = null;

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

/** Base fetch that tags every request with our User-Agent. */
const userAgentFetch: typeof globalThis.fetch = (input, init) => {
  const headers = new Headers(init?.headers);
  headers.set('User-Agent', USER_AGENT);
  return globalThis.fetch(input, { ...init, headers });
};

/**
 * Initialize the shared GlassnodeAPI client. Must be awaited once at startup,
 * before any createClient() call. Credentials are chosen from the environment:
 *
 *  - x402 pay-per-call: set GLASSNODE_X402_PRIVATE_KEY to a funded Base-mainnet
 *    wallet key. Requests hit x402.glassnode.com and settle in USDC per call.
 *    GLASSNODE_X402_MAX_PER_CALL caps spend per request (USDC, default '0.06').
 *  - free/metered: set GLASSNODE_API_KEY.
 *
 * x402 takes precedence when both are present.
 */
export async function initClient(): Promise<GlassnodeAPI> {
  if (clientInstance) return clientInstance;

  const x402Key = process.env['GLASSNODE_X402_PRIVATE_KEY']?.trim();
  if (x402Key) {
    // Optional peer deps, loaded only when x402 is actually used.
    const { createX402Fetch } = await import('glassnode-api/x402');
    const { privateKeyToAccount } = await import('viem/accounts');

    const pk = (x402Key.startsWith('0x') ? x402Key : `0x${x402Key}`) as `0x${string}`;
    const account = privateKeyToAccount(pk);
    const maxPerCall = process.env['GLASSNODE_X402_MAX_PER_CALL']?.trim() || '0.06';

    const x402Fetch = await createX402Fetch({
      account,
      maxPaymentPerCall: maxPerCall,
      fetch: userAgentFetch,
    });

    clientInstance = new GlassnodeAPI({ x402: true, fetch: x402Fetch, logger });
    log('info', `x402 enabled — wallet ${account.address}, max ${maxPerCall} USDC/call`);
    return clientInstance;
  }

  const apiKey = process.env['GLASSNODE_API_KEY'];
  if (!apiKey) {
    throw new Error(
      'No Glassnode credentials found.\n' +
        'Set GLASSNODE_API_KEY (free/metered), or\n' +
        'GLASSNODE_X402_PRIVATE_KEY (a funded Base wallet key) for x402 pay-per-call.',
    );
  }

  clientInstance = new GlassnodeAPI({ apiKey, fetch: userAgentFetch, logger });
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
