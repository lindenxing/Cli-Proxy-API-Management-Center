/**
 * FORK-ADDED: Qoder 额度数据层(同时承载 QoderWork 插件账号)。React-free。
 * - 原生 Qoder 认证:从 auth file 的 usage 快照读取(不打上游);
 * - QoderWork 插件账号:走 /plugins/qoderwork/credits。
 */

import type { TFunction } from 'i18next';
import type {
  AuthFileItem,
  PluginCreditsQuotaData,
  QoderQuotaState,
  QoderUsageSnapshot,
} from '@/types';
import { isQoderFile, isQoderWorkFile, isDisabledAuthFile } from '@/utils/quota';
import type { QuotaProviderData } from '../types';
import { fetchPluginCreditsQuota } from '../pluginCredits/shared';

export interface QoderQuotaData {
  usage?: QoderUsageSnapshot | null;
  credits?: PluginCreditsQuotaData | null;
}

const readQoderUsageSnapshot = (file: AuthFileItem): QoderUsageSnapshot | null => {
  const raw = file.usage;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as QoderUsageSnapshot;
};

const fetchQoderUsage = async (file: AuthFileItem, t: TFunction): Promise<QoderUsageSnapshot> => {
  const usage = readQoderUsageSnapshot(file);
  if (!usage) {
    throw new Error(t('qoder_quota.empty_data'));
  }
  return usage;
};

export const QODER_CONFIG: QuotaProviderData<QoderQuotaState, QoderQuotaData> = {
  type: 'qoder',
  i18nPrefix: 'qoder_quota',
  // FORK-TWEAK: the Qoder section also hosts QoderWork plugin accounts.
  filterFn: (file) => (isQoderFile(file) || isQoderWorkFile(file)) && !isDisabledAuthFile(file),
  fetchQuota: async (file, t) => {
    if (isQoderWorkFile(file)) {
      const credits = await fetchPluginCreditsQuota('qoderwork', file, t);
      return { credits };
    }
    const usage = await fetchQoderUsage(file, t);
    return { usage };
  },
  storeSelector: (state) => state.qoderQuota,
  storeSetter: 'setQoderQuota',
  buildLoadingState: () => ({ status: 'loading', usage: null, credits: null }),
  buildSuccessState: (data) => ({
    status: 'success',
    usage: data.usage ?? null,
    credits: data.credits ?? null,
  }),
  buildErrorState: (message, status) => ({
    status: 'error',
    usage: null,
    credits: null,
    error: message,
    errorStatus: status,
  }),
};
