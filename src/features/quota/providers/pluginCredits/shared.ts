/**
 * FORK-ADDED: WorkBuddy / QoderWork 插件积分共享数据层。React-free / SCSS-free。
 * 数据来自 cpa-plugin 的 /plugins/<id>/credits 端点(Sliverkiss/cpa-plugin)。
 */

import type { TFunction } from 'i18next';
import type { AuthFileItem, PluginCreditsQuotaData, PluginCreditsQuotaState } from '@/types';
import { pluginCreditsApi, type PluginCreditsPluginId } from '@/services/api';
import { normalizeAuthIndex } from '@/utils/authIndex';

export const fetchPluginCreditsQuota = async (
  pluginId: PluginCreditsPluginId,
  file: AuthFileItem,
  t: TFunction
): Promise<PluginCreditsQuotaData> => {
  const rawAuthIndex = file['auth_index'] ?? file.authIndex;
  const authIndex = normalizeAuthIndex(rawAuthIndex);
  if (!authIndex) {
    throw new Error(t('plugin_credits_quota.missing_auth_index'));
  }

  const account = await pluginCreditsApi.getAccount(pluginId, authIndex);
  const credits = account.credits ?? null;

  return {
    nickname: account.nickname ?? null,
    plan: account.plan ?? null,
    region: account.region ?? null,
    exhausted: account.exhausted === true,
    remain: credits?.total_remain ?? null,
    used: credits?.total_used ?? null,
    size: credits?.total_size ?? null,
    fetchedAt: credits?.fetched_at ?? null,
  };
};

export const buildPluginCreditsLoadingState = (): PluginCreditsQuotaState => ({
  status: 'loading',
  data: null,
});

export const buildPluginCreditsSuccessState = (
  data: PluginCreditsQuotaData
): PluginCreditsQuotaState => ({ status: 'success', data });

export const buildPluginCreditsErrorState = (
  message: string,
  status?: number
): PluginCreditsQuotaState => ({
  status: 'error',
  data: null,
  error: message,
  errorStatus: status,
});

export const formatPluginCreditsFetchedAt = (value: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};
