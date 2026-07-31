/**
 * FORK-ADDED: Kiro (AWS CodeWhisperer) 额度数据层。React-free / SCSS-free。
 */

import type { TFunction } from 'i18next';
import type {
  AuthFileItem,
  KiroBaseQuota,
  KiroFreeTrialQuota,
  KiroQuotaState,
} from '@/types';
import { apiCallApi, getApiCallErrorMessage } from '@/services/api';
import {
  KIRO_QUOTA_URL,
  KIRO_REQUEST_HEADERS,
  KIRO_REQUEST_BODY,
  parseKiroQuotaPayload,
  parseKiroErrorPayload,
  normalizeNumberValue,
  normalizeStringValue,
  createStatusError,
  isKiroFile,
  isDisabledAuthFile,
} from '@/utils/quota';
import { normalizeAuthIndex } from '@/utils/authIndex';
import type { QuotaProviderData } from '../types';

export interface KiroQuotaData {
  subscriptionTitle: string | null;
  baseQuota: KiroBaseQuota | null;
  freeTrialQuota: KiroFreeTrialQuota | null;
}

const fetchKiroQuota = async (file: AuthFileItem, t: TFunction): Promise<KiroQuotaData> => {
  const rawAuthIndex = file['auth_index'] ?? file.authIndex;
  const authIndex = normalizeAuthIndex(rawAuthIndex);
  if (!authIndex) {
    throw new Error(t('kiro_quota.missing_auth_index'));
  }

  const result = await apiCallApi.request({
    authIndex,
    method: 'POST',
    url: KIRO_QUOTA_URL,
    header: { ...KIRO_REQUEST_HEADERS },
    data: KIRO_REQUEST_BODY,
  });

  if (result.statusCode < 200 || result.statusCode >= 300) {
    const errorPayload = parseKiroErrorPayload(result.body ?? result.bodyText);
    if (errorPayload?.reason === 'TEMPORARILY_SUSPENDED') {
      throw createStatusError(t('kiro_quota.suspended'), result.statusCode);
    }
    throw createStatusError(getApiCallErrorMessage(result), result.statusCode);
  }

  const payload = parseKiroQuotaPayload(result.body ?? result.bodyText);
  if (!payload) {
    throw new Error(t('kiro_quota.empty'));
  }

  const subscriptionTitle = normalizeStringValue(payload.subscriptionInfo?.subscriptionTitle);
  const usageBreakdown = payload.usageBreakdownList?.[0];

  let baseQuota: KiroBaseQuota | null = null;
  let freeTrialQuota: KiroFreeTrialQuota | null = null;

  if (usageBreakdown) {
    const limit = normalizeNumberValue(usageBreakdown.usageLimitWithPrecision);
    const used = normalizeNumberValue(usageBreakdown.currentUsageWithPrecision);
    const resetTime = normalizeNumberValue(usageBreakdown.nextDateReset ?? payload.nextDateReset);

    if (limit !== null && used !== null && resetTime !== null) {
      baseQuota = { used, limit, resetTime };
    }

    const freeTrialInfo = usageBreakdown.freeTrialInfo;
    if (freeTrialInfo) {
      const trialLimit = normalizeNumberValue(freeTrialInfo.usageLimitWithPrecision);
      const trialUsed = normalizeNumberValue(freeTrialInfo.currentUsageWithPrecision);
      const trialExpiry = normalizeNumberValue(freeTrialInfo.freeTrialExpiry);
      const trialStatus = normalizeStringValue(freeTrialInfo.freeTrialStatus);

      if (trialLimit !== null && trialUsed !== null && trialExpiry !== null && trialStatus) {
        freeTrialQuota = {
          used: trialUsed,
          limit: trialLimit,
          expiry: trialExpiry,
          status: trialStatus,
        };
      }
    }
  }

  return { subscriptionTitle, baseQuota, freeTrialQuota };
};

export const KIRO_CONFIG: QuotaProviderData<KiroQuotaState, KiroQuotaData> = {
  type: 'kiro',
  i18nPrefix: 'kiro_quota',
  filterFn: (file) => isKiroFile(file) && !isDisabledAuthFile(file),
  fetchQuota: fetchKiroQuota,
  storeSelector: (state) => state.kiroQuota,
  storeSetter: 'setKiroQuota',
  buildLoadingState: () => ({
    status: 'loading',
    subscriptionTitle: null,
    baseQuota: null,
    freeTrialQuota: null,
  }),
  buildSuccessState: (data) => ({
    status: 'success',
    subscriptionTitle: data.subscriptionTitle,
    baseQuota: data.baseQuota,
    freeTrialQuota: data.freeTrialQuota,
  }),
  buildErrorState: (message, status) => ({
    status: 'error',
    subscriptionTitle: null,
    baseQuota: null,
    freeTrialQuota: null,
    error: message,
    errorStatus: status,
  }),
};

/** M/D HH:MM reset time formatting (shared by the Body). */
export const formatKiroResetTime = (timestamp: number | undefined): string => {
  if (!timestamp) return '-';
  const date = new Date(timestamp * 1000);
  if (Number.isNaN(date.getTime())) return '-';
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
};
