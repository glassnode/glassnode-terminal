import { useState, useEffect, useRef } from 'react';
import WebSocket from 'ws';
import { log } from '../lib/logger.js';
import { USER_AGENT } from '../lib/api-client.js';

function getWsUrl(): string {
  const key = process.env['GLASSNODE_API_KEY'] ?? '';
  return `wss://api.glassnode.com/v1/pulses/ws?api_key=${key}`;
}
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;

const STABLECOINS = new Set([
  'USDT', 'USDC', 'USDS', 'DAI', 'USDD', 'TUSD', 'PYUSD', 'RLUSD',
  'GHO', 'USDE', 'SUSDS', 'USDY', 'USDF', 'USDG-1', 'SYRUPUSDC',
  'BFUSD', 'USD1', 'USYC', 'EUTBL', 'CC', 'WBT', 'LEO',
]);

export interface PulsePrice {
  price: number;
  direction: 'up' | 'down' | 'neutral';
}

export type PriceMap = Map<string, PulsePrice>;

function safeClose(ws: WebSocket) {
  ws.removeAllListeners();
  if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CLOSING) {
    ws.close();
  } else {
    ws.on('open', () => ws.close());
    ws.on('error', () => {});
  }
}

function buildSubscription(assetSymbols: string[], highlightedAsset: string | null): string[] {
  const top5 = assetSymbols
    .filter((s) => !STABLECOINS.has(s.toUpperCase()))
    .slice(0, 5)
    .map((s) => s.toUpperCase());

  if (highlightedAsset) {
    const sel = highlightedAsset.toUpperCase();
    if (!top5.includes(sel)) top5.push(sel);
  }
  return top5;
}

export function usePulses(
  assetSymbols: string[],
  highlightedAsset: string | null,
): PriceMap {
  const [prices, setPrices] = useState<PriceMap>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subscribedRef = useRef<string[]>([]);
  const destroyedRef = useRef(false);
  const desiredRef = useRef<string[]>([]);
  const readyRef = useRef(false);

  const desired = buildSubscription(assetSymbols, highlightedAsset);
  desiredRef.current = desired;
  const desiredKey = desired.join(',');

  // Connect once on mount
  useEffect(() => {
    destroyedRef.current = false;
    readyRef.current = false;

    function connect() {
      if (destroyedRef.current) return;

      const url = getWsUrl();
      log('ws', 'Connecting to wss://api.glassnode.com/v1/pulses/ws');
      const ws = new WebSocket(url, { headers: { 'User-Agent': USER_AGENT } });
      wsRef.current = ws;

      ws.on('open', () => {
        retryRef.current = 0;
        readyRef.current = true;
        // Subscribe to whatever is desired right now
        const assets = desiredRef.current;
        if (assets.length > 0) {
          subscribedRef.current = assets;
          log('ws', `Connected. Subscribing to ${assets.length} assets: ${assets.join(', ')}`);
          ws.send(JSON.stringify({ action: 'subscribe', assets }));
        } else {
          log('ws', 'Connected. No assets yet, waiting for startup data.');
        }
      });

      ws.on('message', (raw: Buffer | string) => {
        try {
          const msg = JSON.parse(String(raw)) as { id?: string; price?: number };
          if (!msg.id || msg.price == null) {
            log('ws', `Unknown message: ${String(raw).slice(0, 200)}`);
            return;
          }
          const symbol = msg.id.toUpperCase();
          setPrices((prev) => {
            const next = new Map(prev);
            const existing = prev.get(symbol);
            let direction: PulsePrice['direction'] = 'neutral';
            if (existing) {
              if (msg.price! > existing.price) direction = 'up';
              else if (msg.price! < existing.price) direction = 'down';
            }
            next.set(symbol, { price: msg.price!, direction });
            return next;
          });
        } catch {
          log('ws', `Malformed message: ${String(raw).slice(0, 200)}`);
        }
      });

      ws.on('close', (code: number, reason: Buffer) => {
        readyRef.current = false;
        log('ws', `Disconnected (code=${code}, reason=${String(reason)})`);
        if (destroyedRef.current) return;
        const delay = Math.min(RECONNECT_BASE_MS * 2 ** retryRef.current, RECONNECT_MAX_MS);
        retryRef.current++;
        log('ws', `Reconnecting in ${delay}ms (attempt ${retryRef.current})`);
        timerRef.current = setTimeout(connect, delay);
      });

      ws.on('error', (err: Error) => {
        log('error', `WS error: ${err.message}`);
      });
    }

    connect();

    return () => {
      destroyedRef.current = true;
      readyRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (wsRef.current) safeClose(wsRef.current);
    };
  }, []);

  // Send subscribe or update_subscription whenever desired assets change
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || !readyRef.current) return;
    const assets = desiredKey.split(',').filter(Boolean);
    if (assets.length === 0) return;

    const prev = subscribedRef.current.join(',');
    if (prev === assets.join(',')) return;

    const action = subscribedRef.current.length === 0 ? 'subscribe' : 'update_subscription';
    log('ws', `${action}: ${assets.join(', ')}`);
    subscribedRef.current = assets;
    ws.send(JSON.stringify({ action, assets }));
  }, [desiredKey]);

  return prices;
}

/** Get display order: top5 assets, with highlighted asset appended if not in top5 */
export function getTickerAssets(
  assetSymbols: string[],
  highlightedAsset: string | null,
): string[] {
  return buildSubscription(assetSymbols, highlightedAsset);
}
