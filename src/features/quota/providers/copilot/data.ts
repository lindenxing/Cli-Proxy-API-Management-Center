/**
 * FORK-ADDED: GitHub Copilot 额度数据层。React-free / SCSS-free。
 */

import type { TFunction } from 'i18next';
import type {
  AuthFileItem,
  CopilotQuotaItem,
  CopilotQuotaSnapshots,
  CopilotQuotaState,
} from '@/types';
import { apiCallApi, getApiCallErrorMessage } from '@/services/api';
import {
  COPILOT_QUOTA_URL,
  COPILOT_REQUEST_HEADERS,
  parseCopilotQuotaPayload,
  normalizeNumberValue,
  createStatusError,
  isCopilotFile,
  isDisabledAuthFile,
} from '@/utils/quota';
import { normalizeAuthIndex } from '@/utils/authIndex';
import type { QuotaProviderData } from '../types';

export interface CopilotQuotaData {
  plan: string | null;
  items: CopilotQuotaItem[];
  resetDate: string | null;
}

const resolveCopilotPlanLabel = (
  plan: string | undefined,
  sku: string | undefined,
  t: TFunction
): string | null => {
  if (!plan && !sku) return null;
  const lowerPlan = plan?.toLowerCase();
  const lowerSku = sku?.toLowerCase();

  if (lowerSku?.includes('free')) return t('copilot_quota.plan_free');
  if (lowerSku?.includes('individual')) return t('copilot_quota.plan_pro');
  if (lowerPlan === 'business' || lowerSku?.includes('business')) {
    return t('copilot_quota.plan_business');
  }
  if (lowerPlan === 'enterprise' || lowerSku?.includes('enterprise')) {
    return t('copilot_quota.plan_enterprise');
  }
  if (lowerPlan === 'individual') return t('copilot_quota.plan_pro');

  return plan || sku || null;
};

const fetchCopilotQuota = async (file: AuthFileItem, t: TFunction): Promise<CopilotQuotaData> => {
  const rawAuthIndex = file['auth_index'] ?? file.authIndex;
  const authIndex = normalizeAuthIndex(rawAuthIndex);
  if (!authIndex) {
    throw new Error(t('copilot_quota.missing_auth_index'));
  }

  const result = await apiCallApi.request({
    authIndex,
    method: 'GET',
    url: COPILOT_QUOTA_URL,
    header: { ...COPILOT_REQUEST_HEADERS },
  });

  if (result.statusCode < 200 || result.statusCode >= 300) {
    throw createStatusError(getApiCallErrorMessage(result), result.statusCode);
  }

  const payload = parseCopilotQuotaPayload(result.body ?? result.bodyText);
  if (!payload) {
    throw new Error(t('copilot_quota.empty'));
  }

  const plan = resolveCopilotPlanLabel(payload.copilot_plan, payload.access_type_sku, t);
  const items: CopilotQuotaItem[] = [];
  let resetDate: string | null = null;

  if (payload.limited_user_quotas && payload.monthly_quotas) {
    // Free/Pro subscription format
    resetDate = payload.limited_user_reset_date || null;

    const chatRemaining = normalizeNumberValue(payload.limited_user_quotas.chat) ?? 0;
    const chatLimit = normalizeNumberValue(payload.monthly_quotas.chat) ?? 0;
    if (chatLimit > 0) {
      items.push({
        id: 'chat',
        label: t('copilot_quota.chat'),
        used: chatLimit - chatRemaining,
        limit: chatLimit,
        percent: Math.round((chatRemaining / chatLimit) * 100),
        unlimited: false,
      });
    }

    // FORK-TWEAK: Completions quota intentionally hidden.
  } else if (payload.quota_snapshots) {
    // Business/Enterprise subscription format
    resetDate = payload.quota_reset_date || null;

    // FORK-TWEAK: Completions hidden unconditionally; Premium hidden when it
    // has no entitlement (and is not unlimited).
    const snapshotKeys: Array<{ key: keyof CopilotQuotaSnapshots; labelKey: string }> = [
      { key: 'chat', labelKey: 'copilot_quota.chat' },
      { key: 'premium_interactions', labelKey: 'copilot_quota.premium_interactions' },
    ];

    for (const { key, labelKey } of snapshotKeys) {
      const snapshot = payload.quota_snapshots[key];
      if (!snapshot) continue;

      const unlimited = snapshot.unlimited === true;
      const entitlement = normalizeNumberValue(snapshot.entitlement) ?? 0;
      const remaining = normalizeNumberValue(snapshot.remaining) ?? 0;
      const percentRemaining = normalizeNumberValue(snapshot.percent_remaining) ?? 0;

      if (unlimited && entitlement === 0 && remaining === 0) continue;
      if (key === 'premium_interactions' && !unlimited && entitlement <= 0) continue;

      items.push({
        id: key,
        label: t(labelKey),
        used: entitlement - remaining,
        limit: entitlement,
        percent: unlimited ? 100 : Math.round(percentRemaining),
        unlimited,
      });
    }
  }

  return { plan, items, resetDate };
};

export const COPILOT_CONFIG: QuotaProviderData<CopilotQuotaState, CopilotQuotaData> = {
  type: 'github-copilot',
  i18nPrefix: 'copilot_quota',
  filterFn: (file) => isCopilotFile(file) && !isDisabledAuthFile(file),
  fetchQuota: fetchCopilotQuota,
  storeSelector: (state) => state.copilotQuota,
  storeSetter: 'setCopilotQuota',
  buildLoadingState: () => ({
    status: 'loading',
    plan: null,
    items: [],
    resetDate: null,
  }),
  buildSuccessState: (data) => ({
    status: 'success',
    plan: data.plan,
    items: data.items,
    resetDate: data.resetDate,
  }),
  buildErrorState: (message, status) => ({
    status: 'error',
    plan: null,
    items: [],
    resetDate: null,
    error: message,
    errorStatus: status,
  }),
};

/** M/D reset date formatting (shared by the Body). */
export const formatCopilotResetDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '-';
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
};
