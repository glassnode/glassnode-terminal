import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import type { AssetMetadata, MetricMetadata } from 'glassnode-api';
import { useMetricData } from './hooks/useMetricData.js';
import { useListNavigation } from './hooks/useListNavigation.js';
import { AssetList } from './components/AssetList.js';
import { MetricList } from './components/MetricList.js';
import { DataView } from './components/DataView.js';
import { StatusBar } from './components/StatusBar.js';
import { SearchOverlay } from './components/SearchOverlay.js';
import { Spinner } from './components/Spinner.js';
import { loadStartupData, buildMetricList } from './lib/startup-data.js';
import {
  Pane,
  INTERVALS,
  SINCE_OPTIONS,
  CURRENCIES,
  DEFAULT_PARAMS,
  type BrowseMode,
  type MetricParams,
  type MetricListItem,
} from './lib/types.js';

function cycleNext<T>(arr: readonly T[], current: T): T {
  const idx = arr.indexOf(current);
  return arr[(idx + 1) % arr.length]!;
}

export function App(): React.ReactElement {
  const { stdout } = useStdout();
  const [termHeight, setTermHeight] = useState(stdout?.rows ?? 24);

  useEffect(() => {
    if (!stdout) return;
    const onResize = () => setTermHeight(stdout.rows);
    stdout.on('resize', onResize);
    return () => { stdout.off('resize', onResize); };
  }, [stdout]);

  const viewportSize = Math.max(5, termHeight - 8);

  // Startup data (assets, metrics, metadata map — all cached for 1 day)
  const [allAssets, setAllAssets] = useState<AssetMetadata[]>([]);
  const [allMetrics, setAllMetrics] = useState<string[]>([]);
  const [metadataMap, setMetadataMap] = useState<Record<string, MetricMetadata>>({});
  const [startupLoading, setStartupLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    loadStartupData((msg) => setLoadingMessage(msg))
      .then((data) => {
        setAllAssets(data.assets);
        setAllMetrics(data.metrics);
        setMetadataMap(data.metricMetadataMap);
        setStartupLoading(false);
      })
      .catch((err: Error) => {
        setLoadingMessage(`Error: ${err.message}`);
      });
  }, []);

  const [browseMode, setBrowseMode] = useState<BrowseMode>('asset-first');
  const [activePane, setActivePane] = useState<Pane>(Pane.Left);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedMetricPath, setSelectedMetricPath] = useState<string | null>(null);
  const [params, setParams] = useState<MetricParams>(DEFAULT_PARAMS);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Build reverse index: asset symbol (uppercase) → set of metric paths that support it
  const metricsByAsset = useMemo(() => {
    const index = new Map<string, Set<string>>();
    for (const [path, meta] of Object.entries(metadataMap)) {
      const assets = meta.parameters?.['a'] ?? [];
      for (const a of assets) {
        const key = a.toUpperCase();
        if (!index.has(key)) index.set(key, new Set());
        index.get(key)!.add(path);
      }
    }
    return index;
  }, [metadataMap]);

  // Build forward index: metric path → set of asset symbols (uppercase)
  const assetsByMetric = useMemo(() => {
    const index = new Map<string, Set<string>>();
    for (const [path, meta] of Object.entries(metadataMap)) {
      const assets = meta.parameters?.['a'] ?? [];
      index.set(path, new Set(assets.map((a) => a.toUpperCase())));
    }
    return index;
  }, [metadataMap]);

  // Build structured metric list with group/tag headers (UI composition from cached data)
  const allMetricItems = useMemo(
    () => buildMetricList(allMetrics, metadataMap),
    [allMetrics, metadataMap],
  );

  const isMetricSelectable = useCallback(
    (index: number) => allMetricItems[index]?.type === 'metric',
    [allMetricItems],
  );

  // Navigation hooks — declared before filtering so we can use selectedIndex for highlighting
  const assetNav = useListNavigation({ itemCount: allAssets.length, viewportSize });
  const metricNav = useListNavigation({ itemCount: allMetricItems.length, viewportSize, isSelectable: isMetricSelectable });

  const leftIsAssets = browseMode === 'asset-first';

  // The currently highlighted (cursor) item in each list
  const highlightedAssetSymbol = allAssets[assetNav.selectedIndex]?.symbol?.toUpperCase() ?? null;
  const highlightedMetricItem = allMetricItems[metricNav.selectedIndex];
  const highlightedMetricPath = highlightedMetricItem?.type === 'metric' ? highlightedMetricItem.path : null;

  // Filter metric items based on highlighted asset (asset-first mode) and search
  const filteredMetricItems = useMemo(() => {
    // First determine which metric paths pass the filters
    let pathFilter: Set<string> | null = null;

    // In asset-first mode, filter metrics to those supporting the highlighted asset
    if (browseMode === 'asset-first' && highlightedAssetSymbol) {
      const supported = metricsByAsset.get(highlightedAssetSymbol);
      if (supported) pathFilter = supported;
    }

    // Search filter
    const isMetricSearchPane =
      (activePane === Pane.Left && browseMode === 'metric-first') ||
      (activePane === Pane.Middle && browseMode === 'asset-first');
    let searchFilter: ((item: MetricListItem) => boolean) | null = null;
    if (searchMode && isMetricSearchPane && searchQuery) {
      const q = searchQuery.toLowerCase();
      searchFilter = (item) =>
        item.type !== 'metric' ||
        item.path.toLowerCase().includes(q) ||
        item.displayName.toLowerCase().includes(q);
    }

    // Filter the structured list, keeping headers only if they have visible metrics after them
    const result: MetricListItem[] = [];
    let pendingTagHeader: MetricListItem | null = null;
    let pendingGroupHeader: MetricListItem | null = null;

    for (const item of allMetricItems) {
      if (item.type === 'tag-header') {
        pendingTagHeader = item;
        pendingGroupHeader = null;
        continue;
      }
      if (item.type === 'group-header') {
        pendingGroupHeader = item;
        continue;
      }
      // item.type === 'metric'
      if (pathFilter && !pathFilter.has(item.path)) continue;
      if (searchFilter && !searchFilter(item)) continue;

      // Metric passes — emit pending headers
      if (pendingTagHeader) {
        result.push(pendingTagHeader);
        pendingTagHeader = null;
      }
      if (pendingGroupHeader) {
        result.push(pendingGroupHeader);
        pendingGroupHeader = null;
      }
      result.push(item);
    }

    return result;
  }, [allMetricItems, browseMode, highlightedAssetSymbol, metricsByAsset, searchMode, searchQuery, activePane]);

  const filteredAssets = useMemo(() => {
    let list = allAssets;

    // In metric-first mode, filter assets to those supported by the highlighted metric
    if (browseMode === 'metric-first' && highlightedMetricPath) {
      const supported = assetsByMetric.get(highlightedMetricPath);
      if (supported) {
        list = list.filter((a) => supported.has(a.symbol.toUpperCase()));
      }
    }

    // Search filter
    const isAssetSearchPane =
      (activePane === Pane.Left && browseMode === 'asset-first') ||
      (activePane === Pane.Middle && browseMode === 'metric-first');
    if (searchMode && isAssetSearchPane && searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) => a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q));
    }
    return list;
  }, [allAssets, browseMode, highlightedMetricPath, assetsByMetric, searchMode, searchQuery, activePane]);

  // Update nav item counts when filtered lists change
  const filteredAssetNav = useListNavigation({ itemCount: filteredAssets.length, viewportSize });

  const isFilteredMetricSelectable = useCallback(
    (index: number) => filteredMetricItems[index]?.type === 'metric',
    [filteredMetricItems],
  );
  const filteredMetricNav = useListNavigation({
    itemCount: filteredMetricItems.length,
    viewportSize,
    isSelectable: isFilteredMetricSelectable,
  });

  // Remember the last metric/asset path the user explicitly selected in the middle pane
  const lastMiddleMetricPath = useRef<string | null>(null);
  const lastMiddleAssetId = useRef<string | null>(null);

  // When the filtered metric list changes, try to restore the last selected metric
  useEffect(() => {
    if (!lastMiddleMetricPath.current || !leftIsAssets) return;
    const idx = filteredMetricItems.findIndex(
      (item) => item.type === 'metric' && item.path === lastMiddleMetricPath.current,
    );
    if (idx >= 0) filteredMetricNav.goTo(idx);
  }, [filteredMetricItems]); // eslint-disable-line react-hooks/exhaustive-deps

  // When the filtered asset list changes, try to restore the last selected asset
  useEffect(() => {
    if (!lastMiddleAssetId.current || leftIsAssets) return;
    const idx = filteredAssets.findIndex(
      (a) => a.symbol.toUpperCase() === lastMiddleAssetId.current?.toUpperCase(),
    );
    if (idx >= 0) filteredAssetNav.goTo(idx);
  }, [filteredAssets]); // eslint-disable-line react-hooks/exhaustive-deps

  // In asset-first: left pane uses assetNav (on full list), middle uses filteredMetricNav
  // In metric-first: left pane uses metricNav (on full list), middle uses filteredAssetNav
  const leftNav = leftIsAssets ? assetNav : metricNav;
  const middleNav = leftIsAssets ? filteredMetricNav : filteredAssetNav;

  const activeNav = activePane === Pane.Left ? leftNav
    : activePane === Pane.Middle ? middleNav
    : null;

  // Metric data (only fetched when both metric and asset are selected via Enter)
  const { data, loading: dataLoading, error: dataError } = useMetricData(
    selectedMetricPath,
    selectedAssetId,
    params,
  );
  const dataNavReal = useListNavigation({ itemCount: data.length, viewportSize });

  // Pane switching
  const nextPane = useCallback(() => {
    setActivePane((p) => {
      if (p === Pane.Left) return Pane.Middle;
      if (p === Pane.Middle) return Pane.Data;
      return Pane.Left;
    });
  }, []);

  const prevPane = useCallback(() => {
    setActivePane((p) => {
      if (p === Pane.Data) return Pane.Middle;
      if (p === Pane.Middle) return Pane.Left;
      return Pane.Data;
    });
  }, []);

  // Selection (Enter key)
  const handleSelect = useCallback(() => {
    if (activePane === Pane.Left) {
      if (leftIsAssets) {
        const asset = allAssets[assetNav.selectedIndex];
        if (asset) {
          setSelectedAssetId(asset.symbol);
          // Clear metric if not supported by new asset
          if (selectedMetricPath) {
            const supported = assetsByMetric.get(selectedMetricPath);
            if (supported && !supported.has(asset.symbol.toUpperCase())) {
              setSelectedMetricPath(null);
            }
          }
        }
      } else {
        const item = allMetricItems[metricNav.selectedIndex];
        if (item?.type === 'metric') {
          setSelectedMetricPath(item.path);
          // Clear asset if not supported by new metric
          if (selectedAssetId) {
            const supported = assetsByMetric.get(item.path);
            if (supported && !supported.has(selectedAssetId.toUpperCase())) {
              setSelectedAssetId(null);
            }
          }
        }
      }
      setActivePane(Pane.Middle);
    } else if (activePane === Pane.Middle) {
      if (leftIsAssets) {
        const item = filteredMetricItems[filteredMetricNav.selectedIndex];
        if (item?.type === 'metric') {
          setSelectedMetricPath(item.path);
          lastMiddleMetricPath.current = item.path;
        }
      } else {
        const asset = filteredAssets[filteredAssetNav.selectedIndex];
        if (asset) {
          setSelectedAssetId(asset.symbol);
          lastMiddleAssetId.current = asset.symbol;
        }
      }
      setActivePane(Pane.Data);
    }
  }, [activePane, leftIsAssets, allAssets, allMetricItems, filteredAssets, filteredMetricItems,
    assetNav.selectedIndex, metricNav.selectedIndex, filteredAssetNav.selectedIndex, filteredMetricNav.selectedIndex,
    selectedMetricPath, selectedAssetId, assetsByMetric]);

  useInput((input, key) => {
    if (searchMode) return;

    if (input === 'q') process.exit(0);

    if (key.tab) {
      if (key.shift) prevPane();
      else nextPane();
      return;
    }

    if (key.return) { handleSelect(); return; }

    if (key.upArrow) {
      if (activePane === Pane.Data) dataNavReal.moveUp();
      else activeNav?.moveUp();
      return;
    }
    if (key.downArrow) {
      if (activePane === Pane.Data) dataNavReal.moveDown();
      else activeNav?.moveDown();
      return;
    }
    if (key.leftArrow) { prevPane(); return; }
    if (key.rightArrow) { handleSelect(); return; }

    if (input === '/' && activePane !== Pane.Data) {
      setSearchMode(true);
      setSearchQuery('');
      return;
    }

    if (input === 'm') {
      setBrowseMode((m) => (m === 'asset-first' ? 'metric-first' : 'asset-first'));
      setSelectedAssetId(null);
      setSelectedMetricPath(null);
      assetNav.resetSelection();
      metricNav.resetSelection();
      filteredAssetNav.resetSelection();
      filteredMetricNav.resetSelection();
      setActivePane(Pane.Left);
      return;
    }

    if (input === 'i') { setParams((p) => ({ ...p, interval: cycleNext(INTERVALS, p.interval) })); return; }
    if (input === 's') { setParams((p) => ({ ...p, since: cycleNext(SINCE_OPTIONS, p.since) })); return; }
    if (input === 'c') { setParams((p) => ({ ...p, currency: cycleNext(CURRENCIES, p.currency) })); return; }
  });

  const handleSearchSubmit = useCallback(() => { setSearchMode(false); }, []);
  const handleSearchCancel = useCallback(() => { setSearchMode(false); setSearchQuery(''); }, []);

  // Loading screen
  if (startupLoading) {
    return (
      <Box flexDirection="column" height={termHeight}>
        <Box justifyContent="center" alignItems="center" flexGrow={1}>
          <Spinner label={loadingMessage} />
        </Box>
      </Box>
    );
  }

  // Derive title for middle pane
  const middleTitle = leftIsAssets
    ? `Metrics${highlightedAssetSymbol ? ` (${highlightedAssetSymbol})` : ''}`
    : `Assets${highlightedMetricPath ? ` (${highlightedMetricPath.split('/').pop()})` : ''}`;

  return (
    <Box flexDirection="column" height={termHeight}>
      <Box paddingX={1}>
        <Text bold color="cyan">glassnode-terminal</Text>
        <Text dimColor>
          {' '}[{browseMode === 'asset-first' ? 'Asset → Metric' : 'Metric → Asset'}]
        </Text>
      </Box>

      <Box flexGrow={1}>
        {/* Left pane — full list, cursor drives filtering of middle pane */}
        {leftIsAssets ? (
          <AssetList
            assets={allAssets}
            selectedIndex={assetNav.selectedIndex}
            visibleRange={assetNav.visibleRange}
            isFocused={activePane === Pane.Left}
            title="Assets"
          />
        ) : (
          <MetricList
            items={allMetricItems}
            selectedIndex={metricNav.selectedIndex}
            visibleRange={metricNav.visibleRange}
            isFocused={activePane === Pane.Left}
            title="Metrics"
          />
        )}

        {/* Middle pane — filtered by highlighted item in left pane */}
        {leftIsAssets ? (
          <MetricList
            items={filteredMetricItems}
            selectedIndex={filteredMetricNav.selectedIndex}
            visibleRange={filteredMetricNav.visibleRange}
            isFocused={activePane === Pane.Middle}
            title={middleTitle}
          />
        ) : (
          <AssetList
            assets={filteredAssets}
            selectedIndex={filteredAssetNav.selectedIndex}
            visibleRange={filteredAssetNav.visibleRange}
            isFocused={activePane === Pane.Middle}
            title={middleTitle}
          />
        )}

        {/* Data pane */}
        <DataView
          data={data}
          loading={dataLoading}
          error={dataError}
          params={params}
          selectedMetric={selectedMetricPath}
          selectedAsset={selectedAssetId}
          isFocused={activePane === Pane.Data}
          visibleRange={dataNavReal.visibleRange}
          selectedIndex={dataNavReal.selectedIndex}
        />
      </Box>

      {searchMode ? (
        <SearchOverlay
          query={searchQuery}
          onChange={setSearchQuery}
          onSubmit={handleSearchSubmit}
          onCancel={handleSearchCancel}
        />
      ) : (
        <StatusBar browseMode={browseMode} />
      )}
    </Box>
  );
}
