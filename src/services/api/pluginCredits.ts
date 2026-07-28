/**
 * FORK-ADDED: Plugin credits API (Sliverkiss/cpa-plugin WorkBuddy / QoderWork).
 *
 * The plugins register management routes under /v0/management/plugins/<id>/credits.
 * Passing ?auth_index=<idx> returns a single full account row:
 *   { accounts: [ { auth_index, nickname, region, plan, disabled, exhausted,
 *                   credits: { total_remain, total_used, total_size, pack_count,
 *                              fetched_at, packages: [...] }, error? } ] }
 */

import { apiClient } from './client';
import { isRecord } from '@/utils/helpers';
import type { PluginCreditsAccount, PluginCreditsSummary } from '@/types';

export type PluginCreditsPluginId = 'workbuddy' | 'qoderwork';

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const normalizeCreditsSummary = (value: unknown): PluginCreditsSummary | null => {
  if (!isRecord(value)) return null;
  return {
    total_remain: asNumber(value.total_remain),
    total_used: asNumber(value.total_used),
    total_size: asNumber(value.total_size),
    pack_count: asNumber(value.pack_count),
    fetched_at: asString(value.fetched_at),
    packages: Array.isArray(value.packages)
      ? value.packages.filter(isRecord).map((pkg) => ({
          name: asString(pkg.name),
          remain: asNumber(pkg.remain),
          used: asNumber(pkg.used),
          size: asNumber(pkg.size),
        }))
      : undefined,
  };
};

const normalizeAccount = (value: unknown): PluginCreditsAccount | null => {
  if (!isRecord(value)) return null;
  return {
    auth_index: asString(value.auth_index),
    nickname: asString(value.nickname),
    uid: asString(value.uid),
    region: asString(value.region),
    plan: asString(value.plan),
    disabled: value.disabled === true,
    exhausted: value.exhausted === true,
    credits: normalizeCreditsSummary(value.credits),
    error: asString(value.error),
  };
};

export const pluginCreditsApi = {
  /**
   * Fetch real-time credits for one account of a cpa-plugin provider.
   * Throws when the endpoint reports a top-level error (e.g. plugin missing).
   */
  getAccount: async (
    pluginId: PluginCreditsPluginId,
    authIndex: string
  ): Promise<PluginCreditsAccount> => {
    const data = await apiClient.get<Record<string, unknown>>(
      `/plugins/${encodeURIComponent(pluginId)}/credits`,
      { params: { auth_index: authIndex } }
    );

    if (isRecord(data) && typeof data.error === 'string' && data.error) {
      throw new Error(data.error);
    }
    const accounts = isRecord(data) && Array.isArray(data.accounts) ? data.accounts : [];
    const account = normalizeAccount(accounts[0]);
    if (!account) {
      throw new Error('empty credits response');
    }
    if (account.error) {
      throw new Error(account.error);
    }
    return account;
  },
};
