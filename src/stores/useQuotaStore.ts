/**
 * Quota cache that survives route switches.
 */

import { create } from 'zustand';
import type {
  AntigravityQuotaState,
  ClaudeQuotaState,
  CodexQuotaState,
  KimiQuotaState,
  XaiQuotaState,
  // FORK-ADDED: Kiro/Copilot/Qoder quota
  KiroQuotaState,
  CopilotQuotaState,
  QoderQuotaState,
  // FORK-ADDED: WorkBuddy/QoderWork plugin credits
  PluginCreditsQuotaState,
} from '@/types';

type QuotaUpdater<T> = T | ((prev: T) => T);

interface QuotaStoreState {
  cacheGeneration: number;
  antigravityQuota: Record<string, AntigravityQuotaState>;
  claudeQuota: Record<string, ClaudeQuotaState>;
  codexQuota: Record<string, CodexQuotaState>;
  kimiQuota: Record<string, KimiQuotaState>;
  xaiQuota: Record<string, XaiQuotaState>;
  // FORK-ADDED: Kiro/Copilot quota
  kiroQuota: Record<string, KiroQuotaState>;
  copilotQuota: Record<string, CopilotQuotaState>;
  qoderQuota: Record<string, QoderQuotaState>;
  // FORK-ADDED: WorkBuddy/QoderWork plugin credits
  workbuddyQuota: Record<string, PluginCreditsQuotaState>;
  qoderworkQuota: Record<string, PluginCreditsQuotaState>;
  setAntigravityQuota: (updater: QuotaUpdater<Record<string, AntigravityQuotaState>>) => void;
  setClaudeQuota: (updater: QuotaUpdater<Record<string, ClaudeQuotaState>>) => void;
  setCodexQuota: (updater: QuotaUpdater<Record<string, CodexQuotaState>>) => void;
  setKimiQuota: (updater: QuotaUpdater<Record<string, KimiQuotaState>>) => void;
  setXaiQuota: (updater: QuotaUpdater<Record<string, XaiQuotaState>>) => void;
  // FORK-ADDED: Kiro/Copilot quota
  setKiroQuota: (updater: QuotaUpdater<Record<string, KiroQuotaState>>) => void;
  setCopilotQuota: (updater: QuotaUpdater<Record<string, CopilotQuotaState>>) => void;
  setQoderQuota: (updater: QuotaUpdater<Record<string, QoderQuotaState>>) => void;
  // FORK-ADDED: WorkBuddy/QoderWork plugin credits
  setWorkbuddyQuota: (updater: QuotaUpdater<Record<string, PluginCreditsQuotaState>>) => void;
  setQoderworkQuota: (updater: QuotaUpdater<Record<string, PluginCreditsQuotaState>>) => void;
  clearQuotaCache: () => void;
}

const resolveUpdater = <T>(updater: QuotaUpdater<T>, prev: T): T => {
  if (typeof updater === 'function') {
    return (updater as (value: T) => T)(prev);
  }
  return updater;
};

export const useQuotaStore = create<QuotaStoreState>((set) => ({
  cacheGeneration: 0,
  antigravityQuota: {},
  claudeQuota: {},
  codexQuota: {},
  kimiQuota: {},
  xaiQuota: {},
  // FORK-ADDED: Kiro/Copilot quota
  kiroQuota: {},
  copilotQuota: {},
  qoderQuota: {},
  // FORK-ADDED: WorkBuddy/QoderWork plugin credits
  workbuddyQuota: {},
  qoderworkQuota: {},
  setAntigravityQuota: (updater) =>
    set((state) => ({
      antigravityQuota: resolveUpdater(updater, state.antigravityQuota),
    })),
  setClaudeQuota: (updater) =>
    set((state) => ({
      claudeQuota: resolveUpdater(updater, state.claudeQuota),
    })),
  setCodexQuota: (updater) =>
    set((state) => ({
      codexQuota: resolveUpdater(updater, state.codexQuota),
    })),
  setKimiQuota: (updater) =>
    set((state) => ({
      kimiQuota: resolveUpdater(updater, state.kimiQuota),
    })),
  setXaiQuota: (updater) =>
    set((state) => ({
      xaiQuota: resolveUpdater(updater, state.xaiQuota),
    })),
  // FORK-ADDED: Kiro/Copilot quota
  setKiroQuota: (updater) =>
    set((state) => ({
      kiroQuota: resolveUpdater(updater, state.kiroQuota),
    })),
  setCopilotQuota: (updater) =>
    set((state) => ({
      copilotQuota: resolveUpdater(updater, state.copilotQuota),
    })),
  setQoderQuota: (updater) =>
    set((state) => ({
      qoderQuota: resolveUpdater(updater, state.qoderQuota),
    })),
  setWorkbuddyQuota: (updater) =>
    set((state) => ({
      workbuddyQuota: resolveUpdater(updater, state.workbuddyQuota),
    })),
  setQoderworkQuota: (updater) =>
    set((state) => ({
      qoderworkQuota: resolveUpdater(updater, state.qoderworkQuota),
    })),
  clearQuotaCache: () =>
    set((state) => ({
      cacheGeneration: state.cacheGeneration + 1,
      antigravityQuota: {},
      claudeQuota: {},
      codexQuota: {},
      kimiQuota: {},
      xaiQuota: {},
      // FORK-ADDED: Kiro/Copilot quota
      kiroQuota: {},
      copilotQuota: {},
      qoderQuota: {},
      // FORK-ADDED: WorkBuddy/QoderWork plugin credits
      workbuddyQuota: {},
      qoderworkQuota: {},
    })),
}));

export const captureQuotaCacheGeneration = (): number =>
  useQuotaStore.getState().cacheGeneration;

export const commitIfQuotaCacheCurrent = (
  generation: number,
  commit: () => void
): boolean => {
  if (useQuotaStore.getState().cacheGeneration !== generation) return false;
  commit();
  return true;
};
