/**
 * Quota configuration definitions.
 */

import React from 'react';
import type { ReactNode } from 'react';
import type { TFunction } from 'i18next';
import type {
  AntigravityQuotaGroup,
  AntigravityQuotaSubscription,
  AntigravityQuotaSummaryPayload,
  AntigravityQuotaState,
  AuthFileItem,
  ClaudeExtraUsage,
  ClaudeProfileResponse,
  ClaudeQuotaState,
  ClaudeQuotaWindow,
  ClaudeUsagePayload,
  CodexRateLimitInfo,
  CodexRateLimitResetCredit,
  CodexQuotaState,
  CodexUsageWindow,
  CodexQuotaWindow,
  CodexUsagePayload,
  KimiQuotaRow,
  KimiQuotaState,
  XaiBillingSummary,
  XaiQuotaState,
  // FORK-ADDED: Kiro/Copilot quota
  KiroQuotaState,
  KiroBaseQuota,
  KiroFreeTrialQuota,
  CopilotQuotaState,
  CopilotQuotaItem,
  CopilotQuotaSnapshots,
  // FORK-ADDED: Qoder quota
  QoderQuotaState,
  QoderUsageSnapshot,
  // FORK-ADDED: WorkBuddy/QoderWork plugin credits
  PluginCreditsQuotaState,
  PluginCreditsQuotaData,
} from '@/types';
import {
  antigravitySubscriptionApi,
  apiCallApi,
  authFilesApi,
  getApiCallErrorMessage,
  // FORK-ADDED: WorkBuddy/QoderWork plugin credits
  pluginCreditsApi,
  type PluginCreditsPluginId,
  type AntigravitySubscriptionSummary,
} from '@/services/api';
import {
  ANTIGRAVITY_QUOTA_URLS,
  ANTIGRAVITY_REQUEST_HEADERS,
  CLAUDE_PROFILE_URL,
  CLAUDE_USAGE_URL,
  CLAUDE_REQUEST_HEADERS,
  CLAUDE_USAGE_WINDOW_KEYS,
  CODEX_RATE_LIMIT_RESET_CREDITS_URL,
  CODEX_RATE_LIMIT_RESET_CREDITS_CONSUME_URL,
  CODEX_USAGE_URL,
  CODEX_REQUEST_HEADERS,
  KIMI_USAGE_URL,
  KIMI_REQUEST_HEADERS,
  XAI_API_CHAT_URL,
  XAI_API_ME_URL,
  XAI_API_REQUEST_HEADERS,
  XAI_BILLING_MONTHLY_URL,
  XAI_BILLING_WEEKLY_URL,
  XAI_PAID_HEALTH_MODEL,
  XAI_REQUEST_HEADERS,
  normalizeNumberValue,
  normalizePlanType,
  normalizeStringValue,
  normalizeCodexResetCreditsPayload,
  parseAntigravityPayload,
  parseClaudeUsagePayload,
  parseCodexUsagePayload,
  parseKimiUsagePayload,
  parseXaiBillingPayload,
  resolveCodexChatgptAccountId,
  resolveCodexPlanType,
  resolveCodexSubscriptionActiveUntil,
  formatCodexResetLabel,
  formatQuotaResetTime,
  formatKimiResetHint,
  buildAntigravityQuotaGroups,
  buildKimiQuotaRows,
  buildXaiBillingSummary,
  buildXaiPaidHealthSummary,
  mergeXaiBillingSummaries,
  createStatusError,
  formatShanghaiDateTime,
  getStatusFromError,
  isAntigravityFile,
  isClaudeFile,
  isCodexFile,
  isDisabledAuthFile,
  isKimiFile,
  isPaidXaiAuthFile,
  isXaiFile,
  // FORK-ADDED: Kiro/Copilot quota
  KIRO_QUOTA_URL,
  KIRO_REQUEST_HEADERS,
  KIRO_REQUEST_BODY,
  COPILOT_QUOTA_URL,
  COPILOT_REQUEST_HEADERS,
  parseKiroQuotaPayload,
  parseKiroErrorPayload,
  parseCopilotQuotaPayload,
  isKiroFile,
  isCopilotFile,
  isQoderFile,
  // FORK-ADDED: WorkBuddy/QoderWork plugin credits
  isWorkBuddyFile,
  isQoderWorkFile,
} from '@/utils/quota';
import { normalizeAuthIndex } from '@/utils/authIndex';
import { formatDateTimeValue } from '@/utils/format';
import type { QuotaRenderHelpers } from './QuotaCard';
import styles from '@/pages/QuotaPage.module.scss';

type QuotaUpdater<T> = T | ((prev: T) => T);

type QuotaType =
  | 'antigravity'
  | 'claude'
  | 'codex'
  | 'kimi'
  | 'xai'
  // FORK-ADDED: Kiro/Copilot quota
  | 'kiro'
  | 'github-copilot'
  // FORK-ADDED: Qoder quota
  | 'qoder'
  // FORK-ADDED: WorkBuddy/QoderWork plugin credits
  | 'workbuddy'
  | 'qoderwork';

type AntigravityQuotaData = {
  groups: AntigravityQuotaGroup[];
  subscription: AntigravityQuotaSubscription | null;
  serverTimeOffsetMs: number | null;
};

type CodexResetCreditsData = {
  availableCount: number | null;
  credits: CodexRateLimitResetCredit[];
  error: string;
};

type CodexQuotaData = {
  planType: string | null;
  subscriptionActiveUntil: string | number | null;
  rateLimitResetCreditsAvailableCount: number | null;
  rateLimitResetCredits: CodexRateLimitResetCredit[];
  rateLimitResetCreditsError: string;
  windows: CodexQuotaWindow[];
};

const QUOTA_PROGRESS_HIGH_THRESHOLD = 70;
const QUOTA_PROGRESS_MEDIUM_THRESHOLD = 30;
const CODEX_RESET_CREDITS_REQUEST_TIMEOUT_MS = 8000;
const XAI_PAID_HEALTH_REQUEST_TIMEOUT_MS = 15000;

export interface QuotaStore {
  antigravityQuota: Record<string, AntigravityQuotaState>;
  claudeQuota: Record<string, ClaudeQuotaState>;
  codexQuota: Record<string, CodexQuotaState>;
  kimiQuota: Record<string, KimiQuotaState>;
  xaiQuota: Record<string, XaiQuotaState>;
  // FORK-ADDED: Kiro/Copilot quota
  kiroQuota: Record<string, KiroQuotaState>;
  copilotQuota: Record<string, CopilotQuotaState>;
  qoderQuota: Record<string, QoderQuotaState>;
  // FORK-ADDED: WorkBuddy plugin credits (QoderWork shares qoderQuota)
  workbuddyQuota: Record<string, PluginCreditsQuotaState>;
  setAntigravityQuota: (updater: QuotaUpdater<Record<string, AntigravityQuotaState>>) => void;
  setClaudeQuota: (updater: QuotaUpdater<Record<string, ClaudeQuotaState>>) => void;
  setCodexQuota: (updater: QuotaUpdater<Record<string, CodexQuotaState>>) => void;
  setKimiQuota: (updater: QuotaUpdater<Record<string, KimiQuotaState>>) => void;
  setXaiQuota: (updater: QuotaUpdater<Record<string, XaiQuotaState>>) => void;
  // FORK-ADDED: Kiro/Copilot quota
  setKiroQuota: (updater: QuotaUpdater<Record<string, KiroQuotaState>>) => void;
  setCopilotQuota: (updater: QuotaUpdater<Record<string, CopilotQuotaState>>) => void;
  setQoderQuota: (updater: QuotaUpdater<Record<string, QoderQuotaState>>) => void;
  // FORK-ADDED: WorkBuddy plugin credits
  setWorkbuddyQuota: (updater: QuotaUpdater<Record<string, PluginCreditsQuotaState>>) => void;
  clearQuotaCache: () => void;
}

export interface QuotaConfig<TState, TData> {
  type: QuotaType;
  i18nPrefix: string;
  filterFn: (file: AuthFileItem) => boolean;
  fetchQuota: (file: AuthFileItem, t: TFunction) => Promise<TData>;
  resetQuota?: (file: AuthFileItem, t: TFunction) => Promise<TData>;
  canResetQuota?: (quota: TState) => boolean;
  storeSelector: (state: QuotaStore) => Record<string, TState>;
  storeSetter: keyof QuotaStore;
  buildLoadingState: () => TState;
  buildSuccessState: (data: TData) => TState;
  buildErrorState: (message: string, status?: number) => TState;
  cardClassName: string;
  gridClassName: string;
  renderQuotaItems: (quota: TState, t: TFunction, helpers: QuotaRenderHelpers) => ReactNode;
}

const resolveAntigravityProjectId = async (file: AuthFileItem): Promise<string> => {
  const directProjectId = normalizeStringValue(file.project_id ?? file.projectId);
  if (directProjectId) return directProjectId;

  const metadata =
    file.metadata && typeof file.metadata === 'object' && file.metadata !== null
      ? (file.metadata as Record<string, unknown>)
      : null;
  const metadataProjectId = metadata
    ? normalizeStringValue(metadata.project_id ?? metadata.projectId)
    : null;
  if (metadataProjectId) return metadataProjectId;

  const attributes =
    file.attributes && typeof file.attributes === 'object' && file.attributes !== null
      ? (file.attributes as Record<string, unknown>)
      : null;
  const attributesProjectId = attributes
    ? normalizeStringValue(
        attributes.project_id ?? attributes.projectId ?? attributes.gemini_virtual_project
      )
    : null;
  if (attributesProjectId) return attributesProjectId;

  try {
    const text = await authFilesApi.downloadText(file.name);
    const trimmed = text.trim();
    if (!trimmed) return '';

    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const topLevel = normalizeStringValue(parsed.project_id ?? parsed.projectId);
    if (topLevel) return topLevel;

    const installed =
      parsed.installed && typeof parsed.installed === 'object' && parsed.installed !== null
        ? (parsed.installed as Record<string, unknown>)
        : null;
    const installedProjectId = installed
      ? normalizeStringValue(installed.project_id ?? installed.projectId)
      : null;
    if (installedProjectId) return installedProjectId;

    const web =
      parsed.web && typeof parsed.web === 'object' && parsed.web !== null
        ? (parsed.web as Record<string, unknown>)
        : null;
    const webProjectId = web ? normalizeStringValue(web.project_id ?? web.projectId) : null;
    if (webProjectId) return webProjectId;
  } catch {
    return '';
  }

  return '';
};

const resolveResponseServerTimeOffsetMs = (
  header: Record<string, string[]> | undefined
): number | null => {
  if (!header) return null;
  const dateEntry = Object.entries(header).find(([key]) => key.toLowerCase() === 'date');
  const rawDate = dateEntry?.[1]?.[0];
  if (!rawDate) return null;
  const serverTime = new Date(rawDate).getTime();
  if (Number.isNaN(serverTime)) return null;
  return serverTime - Date.now();
};

const fetchAntigravityQuota = async (
  file: AuthFileItem,
  t: TFunction
): Promise<AntigravityQuotaData> => {
  const rawAuthIndex = file['auth_index'] ?? file.authIndex;
  const authIndex = normalizeAuthIndex(rawAuthIndex);
  if (!authIndex) {
    throw new Error(t('antigravity_quota.missing_auth_index'));
  }

  const projectId = await resolveAntigravityProjectId(file);
  if (!projectId) {
    throw new Error(t('antigravity_quota.missing_project_id'));
  }
  const requestBody = JSON.stringify({ project: projectId });
  const subscriptionPromise = antigravitySubscriptionApi
    .get(authIndex)
    .then(toAntigravityQuotaSubscription)
    .catch(() => null);

  let lastError = '';
  let lastStatus: number | undefined;
  let priorityStatus: number | undefined;
  let hadSuccess = false;

  for (const url of ANTIGRAVITY_QUOTA_URLS) {
    try {
      const result = await apiCallApi.request({
        authIndex,
        method: 'POST',
        url,
        header: { ...ANTIGRAVITY_REQUEST_HEADERS },
        data: requestBody,
      });

      if (result.statusCode < 200 || result.statusCode >= 300) {
        lastError = getApiCallErrorMessage(result);
        lastStatus = result.statusCode;
        if (result.statusCode === 403 || result.statusCode === 404) {
          priorityStatus ??= result.statusCode;
        }
        continue;
      }

      hadSuccess = true;
      const payload = parseAntigravityPayload(
        result.body ?? result.bodyText
      ) as AntigravityQuotaSummaryPayload | null;
      if (!payload || !Array.isArray(payload.groups)) {
        lastError = t('antigravity_quota.empty_models');
        continue;
      }

      const groups = buildAntigravityQuotaGroups(payload);
      if (groups.length === 0) {
        lastError = t('antigravity_quota.empty_models');
        continue;
      }

      return {
        groups,
        subscription: await subscriptionPromise,
        serverTimeOffsetMs: resolveResponseServerTimeOffsetMs(result.header),
      };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : t('common.unknown_error');
      const status = getStatusFromError(err);
      if (status) {
        lastStatus = status;
        if (status === 403 || status === 404) {
          priorityStatus ??= status;
        }
      }
    }
  }

  if (hadSuccess) {
    return { groups: [], subscription: await subscriptionPromise, serverTimeOffsetMs: null };
  }

  throw createStatusError(lastError || t('common.unknown_error'), priorityStatus ?? lastStatus);
};

const toAntigravityQuotaSubscription = (
  summary: AntigravitySubscriptionSummary | null
): AntigravityQuotaSubscription | null => {
  if (!summary) return null;
  return {
    plan: summary.plan,
    tierName: summary.tierName,
    tierId: summary.tierId,
  };
};

const buildCodexQuotaWindows = (payload: CodexUsagePayload, t: TFunction): CodexQuotaWindow[] => {
  const FIVE_HOUR_SECONDS = 18000;
  const WEEK_SECONDS = 604800;
  const MIN_MONTH_SECONDS = 28 * 24 * 60 * 60;
  const MAX_MONTH_SECONDS = 31 * 24 * 60 * 60;
  const WINDOW_META = {
    codeFiveHour: { id: 'five-hour', labelKey: 'codex_quota.primary_window' },
    codeWeekly: { id: 'weekly', labelKey: 'codex_quota.secondary_window' },
    codeMonthly: { id: 'monthly', labelKey: 'codex_quota.team_secondary_window' },
    codeReviewFiveHour: {
      id: 'code-review-five-hour',
      labelKey: 'codex_quota.code_review_primary_window',
    },
    codeReviewWeekly: {
      id: 'code-review-weekly',
      labelKey: 'codex_quota.code_review_secondary_window',
    },
    codeReviewMonthly: {
      id: 'code-review-monthly',
      labelKey: 'codex_quota.code_review_team_secondary_window',
    },
  } as const;

  const rateLimit = payload.rate_limit ?? payload.rateLimit ?? undefined;
  const codeReviewLimit =
    payload.code_review_rate_limit ?? payload.codeReviewRateLimit ?? undefined;
  const additionalRateLimits = payload.additional_rate_limits ?? payload.additionalRateLimits ?? [];
  const windows: CodexQuotaWindow[] = [];

  const addWindow = (
    id: string,
    label: string,
    labelKey: string | undefined,
    labelParams: Record<string, string | number> | undefined,
    window?: CodexUsageWindow | null,
    limitReached?: boolean,
    allowed?: boolean
  ) => {
    if (!window) return;
    const resetLabel = formatCodexResetLabel(window);
    const usedPercentRaw = normalizeNumberValue(window.used_percent ?? window.usedPercent);
    const isLimitReached = Boolean(limitReached) || allowed === false;
    const usedPercent = usedPercentRaw ?? (isLimitReached && resetLabel !== '-' ? 100 : null);
    windows.push({
      id,
      label,
      labelKey,
      labelParams,
      usedPercent,
      resetLabel,
    });
  };

  const getWindowSeconds = (window?: CodexUsageWindow | null): number | null => {
    if (!window) return null;
    return normalizeNumberValue(window.limit_window_seconds ?? window.limitWindowSeconds);
  };

  const isMonthlyWindow = (window?: CodexUsageWindow | null): boolean => {
    const seconds = getWindowSeconds(window);
    return seconds !== null && seconds >= MIN_MONTH_SECONDS && seconds <= MAX_MONTH_SECONDS;
  };

  const selectSecondaryWindowMeta = <
    TWeekly extends { id: string; labelKey: string },
    TMonthly extends { id: string; labelKey: string },
  >(
    window: CodexUsageWindow | null | undefined,
    weeklyMeta: TWeekly,
    monthlyMeta: TMonthly
  ): TWeekly | TMonthly => (isMonthlyWindow(window) ? monthlyMeta : weeklyMeta);

  const rawLimitReached = rateLimit?.limit_reached ?? rateLimit?.limitReached;
  const rawAllowed = rateLimit?.allowed;

  const pickClassifiedWindows = (
    limitInfo?: CodexRateLimitInfo | null,
    options?: { allowOrderFallback?: boolean }
  ): { fiveHourWindow: CodexUsageWindow | null; weeklyWindow: CodexUsageWindow | null } => {
    const allowOrderFallback = options?.allowOrderFallback ?? true;
    const primaryWindow = limitInfo?.primary_window ?? limitInfo?.primaryWindow ?? null;
    const secondaryWindow = limitInfo?.secondary_window ?? limitInfo?.secondaryWindow ?? null;
    const rawWindows = [primaryWindow, secondaryWindow];

    let fiveHourWindow: CodexUsageWindow | null = null;
    let weeklyWindow: CodexUsageWindow | null = null;

    for (const window of rawWindows) {
      if (!window) continue;
      const seconds = getWindowSeconds(window);
      if (seconds === FIVE_HOUR_SECONDS && !fiveHourWindow) {
        fiveHourWindow = window;
      } else if ((seconds === WEEK_SECONDS || isMonthlyWindow(window)) && !weeklyWindow) {
        weeklyWindow = window;
      }
    }

    // For legacy payloads without window duration, fallback to primary/secondary ordering.
    if (allowOrderFallback) {
      if (!fiveHourWindow) {
        fiveHourWindow = primaryWindow && primaryWindow !== weeklyWindow ? primaryWindow : null;
      }
      if (!weeklyWindow) {
        weeklyWindow =
          secondaryWindow && secondaryWindow !== fiveHourWindow ? secondaryWindow : null;
      }
    }

    return { fiveHourWindow, weeklyWindow };
  };

  const rateWindows = pickClassifiedWindows(rateLimit);
  addWindow(
    WINDOW_META.codeFiveHour.id,
    t(WINDOW_META.codeFiveHour.labelKey),
    WINDOW_META.codeFiveHour.labelKey,
    undefined,
    rateWindows.fiveHourWindow,
    rawLimitReached,
    rawAllowed
  );
  const codeSecondaryWindowMeta = selectSecondaryWindowMeta(
    rateWindows.weeklyWindow,
    WINDOW_META.codeWeekly,
    WINDOW_META.codeMonthly
  );
  addWindow(
    codeSecondaryWindowMeta.id,
    t(codeSecondaryWindowMeta.labelKey),
    codeSecondaryWindowMeta.labelKey,
    undefined,
    rateWindows.weeklyWindow,
    rawLimitReached,
    rawAllowed
  );

  const codeReviewWindows = pickClassifiedWindows(codeReviewLimit);
  const codeReviewLimitReached = codeReviewLimit?.limit_reached ?? codeReviewLimit?.limitReached;
  const codeReviewAllowed = codeReviewLimit?.allowed;
  addWindow(
    WINDOW_META.codeReviewFiveHour.id,
    t(WINDOW_META.codeReviewFiveHour.labelKey),
    WINDOW_META.codeReviewFiveHour.labelKey,
    undefined,
    codeReviewWindows.fiveHourWindow,
    codeReviewLimitReached,
    codeReviewAllowed
  );
  const codeReviewSecondaryWindowMeta = selectSecondaryWindowMeta(
    codeReviewWindows.weeklyWindow,
    WINDOW_META.codeReviewWeekly,
    WINDOW_META.codeReviewMonthly
  );
  addWindow(
    codeReviewSecondaryWindowMeta.id,
    t(codeReviewSecondaryWindowMeta.labelKey),
    codeReviewSecondaryWindowMeta.labelKey,
    undefined,
    codeReviewWindows.weeklyWindow,
    codeReviewLimitReached,
    codeReviewAllowed
  );

  const normalizeWindowId = (raw: string) =>
    raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  if (Array.isArray(additionalRateLimits)) {
    additionalRateLimits.forEach((limitItem, index) => {
      const rateInfo = limitItem?.rate_limit ?? limitItem?.rateLimit ?? null;
      if (!rateInfo) return;

      const limitName =
        normalizeStringValue(limitItem?.limit_name ?? limitItem?.limitName) ??
        normalizeStringValue(limitItem?.metered_feature ?? limitItem?.meteredFeature) ??
        `additional-${index + 1}`;

      const idPrefix = normalizeWindowId(limitName) || `additional-${index + 1}`;
      const additionalWindows = pickClassifiedWindows(rateInfo);
      const additionalLimitReached = rateInfo.limit_reached ?? rateInfo.limitReached;
      const additionalAllowed = rateInfo.allowed;

      addWindow(
        `${idPrefix}-five-hour-${index}`,
        t('codex_quota.additional_primary_window', { name: limitName }),
        'codex_quota.additional_primary_window',
        { name: limitName },
        additionalWindows.fiveHourWindow,
        additionalLimitReached,
        additionalAllowed
      );
      const additionalSecondaryMeta = selectSecondaryWindowMeta(
        additionalWindows.weeklyWindow,
        { id: 'weekly', labelKey: 'codex_quota.additional_secondary_window' },
        { id: 'monthly', labelKey: 'codex_quota.additional_team_secondary_window' }
      );
      addWindow(
        `${idPrefix}-${additionalSecondaryMeta.id}-${index}`,
        t(additionalSecondaryMeta.labelKey, { name: limitName }),
        additionalSecondaryMeta.labelKey,
        { name: limitName },
        additionalWindows.weeklyWindow,
        additionalLimitReached,
        additionalAllowed
      );
    });
  }

  return windows;
};

const buildCodexRequestHeader = (file: AuthFileItem): Record<string, string> => {
  const accountId = resolveCodexChatgptAccountId(file);
  const requestHeader: Record<string, string> = {
    ...CODEX_REQUEST_HEADERS,
  };
  if (accountId) {
    requestHeader['Chatgpt-Account-Id'] = accountId;
  }
  return requestHeader;
};

const fetchCodexResetCredits = async (
  authIndex: string,
  requestHeader: Record<string, string>,
  t: TFunction
): Promise<CodexResetCreditsData> => {
  try {
    const result = await apiCallApi.request(
      {
        authIndex,
        method: 'GET',
        url: CODEX_RATE_LIMIT_RESET_CREDITS_URL,
        header: {
          ...requestHeader,
          Accept: 'application/json',
          'OpenAI-Beta': 'codex-1',
          Originator: 'Codex Desktop',
        },
      },
      { timeout: CODEX_RESET_CREDITS_REQUEST_TIMEOUT_MS }
    );

    if (result.statusCode < 200 || result.statusCode >= 300) {
      return {
        availableCount: null,
        credits: [],
        error: getApiCallErrorMessage(result),
      };
    }

    const summary = normalizeCodexResetCreditsPayload(result.body ?? result.bodyText);
    if (summary.invalidPayload) {
      return {
        availableCount: null,
        credits: [],
        error: t('codex_quota.reset_credits_invalid_payload'),
      };
    }

    return {
      availableCount: summary.availableCount,
      credits: summary.credits,
      error: '',
    };
  } catch (err: unknown) {
    return {
      availableCount: null,
      credits: [],
      error: err instanceof Error ? err.message : t('common.unknown_error'),
    };
  }
};

const fetchCodexQuota = async (file: AuthFileItem, t: TFunction): Promise<CodexQuotaData> => {
  const rawAuthIndex = file['auth_index'] ?? file.authIndex;
  const authIndex = normalizeAuthIndex(rawAuthIndex);
  if (!authIndex) {
    throw new Error(t('codex_quota.missing_auth_index'));
  }

  const planTypeFromFile = resolveCodexPlanType(file);
  const subscriptionActiveUntil = resolveCodexSubscriptionActiveUntil(file);
  const requestHeader = buildCodexRequestHeader(file);

  const result = await apiCallApi.request({
    authIndex,
    method: 'GET',
    url: CODEX_USAGE_URL,
    header: requestHeader,
  });

  if (result.statusCode < 200 || result.statusCode >= 300) {
    throw createStatusError(getApiCallErrorMessage(result), result.statusCode);
  }

  const payload = parseCodexUsagePayload(result.body ?? result.bodyText);
  if (!payload) {
    throw new Error(t('codex_quota.empty_windows'));
  }

  const planTypeFromUsage = normalizePlanType(payload.plan_type ?? payload.planType);
  const resetCredits = payload.rate_limit_reset_credits ?? payload.rateLimitResetCredits ?? null;
  const usageResetCreditsAvailableCount = normalizeNumberValue(
    resetCredits?.available_count ?? resetCredits?.availableCount
  );
  const resetCreditsData = await fetchCodexResetCredits(authIndex, requestHeader, t);
  const resetCreditsCountFromDetails =
    resetCreditsData.credits.length > 0 ? resetCreditsData.credits.length : null;
  const rateLimitResetCreditsAvailableCount =
    resetCreditsData.availableCount ??
    resetCreditsCountFromDetails ??
    usageResetCreditsAvailableCount;
  const planType = planTypeFromUsage ?? planTypeFromFile;
  const windows = buildCodexQuotaWindows(payload, t);
  return {
    planType,
    subscriptionActiveUntil,
    rateLimitResetCreditsAvailableCount,
    rateLimitResetCredits: resetCreditsData.credits,
    rateLimitResetCreditsError: resetCreditsData.error,
    windows,
  };
};

const createCodexRedeemRequestId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    const segment = char === 'x' ? value : (value & 0x3) | 0x8;
    return segment.toString(16);
  });
};

const consumeCodexRateLimitResetCredit = async (
  file: AuthFileItem,
  t: TFunction
): Promise<void> => {
  const rawAuthIndex = file['auth_index'] ?? file.authIndex;
  const authIndex = normalizeAuthIndex(rawAuthIndex);
  if (!authIndex) {
    throw new Error(t('codex_quota.missing_auth_index'));
  }

  const requestHeader = buildCodexRequestHeader(file);

  const result = await apiCallApi.request({
    authIndex,
    method: 'POST',
    url: CODEX_RATE_LIMIT_RESET_CREDITS_CONSUME_URL,
    header: requestHeader,
    data: JSON.stringify({
      redeem_request_id: createCodexRedeemRequestId(),
    }),
  });

  if (result.statusCode < 200 || result.statusCode >= 300) {
    throw createStatusError(getApiCallErrorMessage(result), result.statusCode);
  }
};

const resetCodexQuota = async (file: AuthFileItem, t: TFunction): Promise<CodexQuotaData> => {
  await consumeCodexRateLimitResetCredit(file, t);
  return fetchCodexQuota(file, t);
};

const formatAntigravityDuration = (t: TFunction, deltaMs: number): string => {
  const totalMinutes = Math.max(1, Math.ceil(deltaMs / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return t('antigravity_quota.duration_day_hour', {
      days,
      hours,
    });
  }
  if (hours > 0) {
    return t('antigravity_quota.duration_hour_minute', {
      hours,
      minutes,
    });
  }
  if (minutes > 0) {
    return t('antigravity_quota.duration_minute', {
      minutes,
    });
  }
  return t('antigravity_quota.duration_less_than_minute');
};

const formatAntigravityResetLabel = (
  resetTime: string | undefined,
  t: TFunction,
  nowMs: number
): string => {
  if (!resetTime) return '-';
  const resetMs = new Date(resetTime).getTime();
  if (Number.isNaN(resetMs)) return '-';
  const deltaMs = resetMs - nowMs;
  if (deltaMs <= 0) return t('antigravity_quota.refresh_available');
  return t('antigravity_quota.refreshes_in', {
    duration: formatAntigravityDuration(t, deltaMs),
  });
};

const ANTIGRAVITY_GROUP_LABEL_KEYS = new Map<string, string>([
  ['gemini models', 'group_gemini_models'],
  ['claude and gpt models', 'group_claude_gpt_models'],
]);

const ANTIGRAVITY_BUCKET_LABEL_KEYS = new Map<string, string>([
  ['weekly limit', 'weekly_limit'],
  ['daily limit', 'daily_limit'],
  ['5 hour limit', 'five_hour_limit'],
  ['5-hour limit', 'five_hour_limit'],
  ['five hour limit', 'five_hour_limit'],
  ['monthly limit', 'monthly_limit'],
]);

const normalizeAntigravityQuotaText = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, ' ');

const translateAntigravityQuotaLabel = (
  value: string,
  keys: Map<string, string>,
  t: TFunction
): string => {
  const key = keys.get(normalizeAntigravityQuotaText(value));
  return key ? t(`antigravity_quota.${key}`) : value;
};

const translateAntigravityQuotaDescription = (
  value: string | undefined,
  t: TFunction
): string | undefined => {
  if (!value) return undefined;
  const modelsMatch = value.match(/^models within this group:\s*(.+)$/i);
  if (modelsMatch) {
    return t('antigravity_quota.group_models_description', {
      models: modelsMatch[1].trim(),
    });
  }
  return value;
};

const getAntigravityPlanLabel = (
  subscription: AntigravityQuotaSubscription | null | undefined,
  t: TFunction
): string | null => {
  if (!subscription) return null;
  if (subscription.plan === 'free') return t('antigravity_subscription.plan_free');
  if (subscription.plan === 'pro') return t('antigravity_subscription.plan_pro');
  if (subscription.plan === 'ultra') return t('antigravity_subscription.plan_ultra');
  if (subscription.plan === 'ultra-lite') return t('antigravity_subscription.plan_ultra_lite');
  return (
    subscription.tierName ||
    subscription.tierId ||
    (subscription.plan === 'unknown' ? t('antigravity_subscription.plan_unknown') : null)
  );
};

const renderAntigravityItems = (
  quota: AntigravityQuotaState,
  t: TFunction,
  helpers: QuotaRenderHelpers
): ReactNode => {
  const { styles: styleMap, QuotaProgressBar } = helpers;
  const { createElement: h, Fragment } = React;
  const groups = quota.groups ?? [];
  const nodes: ReactNode[] = [];
  const planLabel = getAntigravityPlanLabel(quota.subscription, t);
  const normalizedPlan = quota.subscription?.plan?.toLowerCase() ?? '';
  const isPremiumPlan = normalizedPlan === 'ultra' || normalizedPlan === 'ultra-lite';

  if (planLabel) {
    nodes.push(
      h(
        'div',
        { key: 'plan', className: styleMap.codexPlan },
        h(
          'span',
          { className: styleMap.codexPlanItem },
          h('span', { className: styleMap.codexPlanLabel }, t('antigravity_quota.plan_label')),
          h(
            'span',
            { className: isPremiumPlan ? styleMap.premiumPlanValue : styleMap.codexPlanValue },
            planLabel
          )
        )
      )
    );
  }

  if (groups.length === 0) {
    nodes.push(
      h(
        'div',
        { key: 'empty', className: styleMap.quotaMessage },
        t('antigravity_quota.empty_models')
      )
    );
    return h(Fragment, null, ...nodes);
  }

  const nowMs = Date.now() + (quota.serverTimeOffsetMs ?? 0);

  nodes.push(
    ...groups.map((group) => {
      const groupLabel = translateAntigravityQuotaLabel(
        group.label,
        ANTIGRAVITY_GROUP_LABEL_KEYS,
        t
      );
      const groupDescription = translateAntigravityQuotaDescription(group.description, t);

      return h(
        'div',
        { key: group.id, className: styleMap.antigravityQuotaGroup },
        h(
          'div',
          { className: styleMap.antigravityQuotaGroupHeader },
          h('span', { className: styleMap.antigravityQuotaGroupTitle }, groupLabel),
          groupDescription
            ? h('span', { className: styleMap.antigravityQuotaGroupDescription }, groupDescription)
            : null
        ),
        ...group.buckets.map((bucket) => {
          const clamped = Math.max(0, Math.min(1, bucket.remainingFraction));
          const percent = clamped * 100;
          const percentLabel =
            bucket.remainingFraction === 1
              ? t('antigravity_quota.quota_available')
              : t('antigravity_quota.remaining_percent', {
                  percent: Math.round(percent),
                });
          const resetLabel = formatAntigravityResetLabel(bucket.resetTime, t, nowMs);
          const bucketLabel = translateAntigravityQuotaLabel(
            bucket.label,
            ANTIGRAVITY_BUCKET_LABEL_KEYS,
            t
          );
          const bucketDescription = translateAntigravityQuotaDescription(bucket.description, t);

          return h(
            'div',
            { key: bucket.id, className: styleMap.quotaRow },
            h(
              'div',
              { className: styleMap.quotaRowHeader },
              h('span', { className: styleMap.quotaModel, title: bucketDescription }, bucketLabel),
              h(
                'div',
                { className: styleMap.quotaMeta },
                h('span', { className: styleMap.quotaPercent }, percentLabel),
                h('span', { className: styleMap.quotaReset }, resetLabel)
              )
            ),
            h(QuotaProgressBar, {
              percent,
              highThreshold: QUOTA_PROGRESS_HIGH_THRESHOLD,
              mediumThreshold: QUOTA_PROGRESS_MEDIUM_THRESHOLD,
            })
          );
        })
      );
    })
  );

  return h(Fragment, null, ...nodes);
};

const PREMIUM_CODEX_PLAN_TYPES = new Set(['pro', 'prolite', 'pro-lite', 'pro_lite']);

const renderCodexItems = (
  quota: CodexQuotaState,
  t: TFunction,
  helpers: QuotaRenderHelpers
): ReactNode => {
  const { styles: styleMap, QuotaProgressBar } = helpers;
  const { createElement: h, Fragment } = React;
  const windows = quota.windows ?? [];
  const planType = quota.planType ?? null;
  const subscriptionActiveUntil = quota.subscriptionActiveUntil ?? null;
  const rateLimitResetCreditsAvailableCount = quota.rateLimitResetCreditsAvailableCount ?? null;
  const rateLimitResetCredits = quota.rateLimitResetCredits ?? [];
  const rateLimitResetCreditsError = quota.rateLimitResetCreditsError ?? '';

  const getPlanLabel = (pt?: string | null): string | null => {
    const normalized = normalizePlanType(pt);
    if (!normalized) return null;
    if (normalized === 'pro') return t('codex_quota.plan_pro');
    if (PREMIUM_CODEX_PLAN_TYPES.has(normalized) && normalized !== 'pro') {
      return t('codex_quota.plan_prolite');
    }
    if (normalized === 'plus') return t('codex_quota.plan_plus');
    if (normalized === 'team') return t('codex_quota.plan_team');
    if (normalized === 'free') return t('codex_quota.plan_free');
    return pt || normalized;
  };

  const planLabel = getPlanLabel(planType);
  const isPremiumPlan = PREMIUM_CODEX_PLAN_TYPES.has(normalizePlanType(planType) ?? '');
  const expiryLabel = subscriptionActiveUntil ? formatDateTimeValue(subscriptionActiveUntil) : '';
  const nodes: ReactNode[] = [];

  if (planLabel || expiryLabel || rateLimitResetCreditsAvailableCount !== null) {
    const planValueClass = isPremiumPlan ? styleMap.premiumPlanValue : styleMap.codexPlanValue;
    const planNodes: ReactNode[] = [];

    const appendPlanItem = (
      key: string,
      label: string,
      value: string,
      valueClassName = styleMap.codexPlanValue
    ) => {
      planNodes.push(
        h(
          'span',
          { key, className: styleMap.codexPlanItem },
          h('span', { className: styleMap.codexPlanLabel }, label),
          h('span', { className: valueClassName }, value)
        )
      );
    };

    if (planLabel) {
      appendPlanItem('plan-type', t('codex_quota.plan_label'), planLabel, planValueClass);
    }

    if (expiryLabel) {
      appendPlanItem('subscription-expiry', t('codex_quota.expires_label'), expiryLabel);
    }

    if (rateLimitResetCreditsAvailableCount !== null) {
      appendPlanItem(
        'reset-credits',
        t('codex_quota.reset_credits_label'),
        rateLimitResetCreditsAvailableCount.toString()
      );
    }

    nodes.push(h('div', { key: 'plan', className: styleMap.codexPlan }, ...planNodes));
  }

  if (rateLimitResetCredits.length > 0) {
    nodes.push(
      h(
        'div',
        { key: 'reset-credit-expiries', className: styleMap.codexResetCredits },
        h(
          'div',
          { className: styleMap.codexResetCreditsTitle },
          t('codex_quota.reset_credits_expiry_label')
        ),
        ...rateLimitResetCredits.map((credit, index) =>
          h(
            'div',
            {
              key: credit.id || `${credit.expiresAt}-${index}`,
              className: styleMap.codexResetCreditRow,
            },
            h(
              'span',
              { className: styleMap.codexResetCreditLabel },
              t('codex_quota.reset_credit_number', { index: index + 1 })
            ),
            h(
              'span',
              { className: styleMap.codexResetCreditTime },
              formatShanghaiDateTime(credit.expiresAt) || credit.expiresAt
            )
          )
        )
      )
    );
  } else if (rateLimitResetCreditsError) {
    nodes.push(
      h(
        'div',
        { key: 'reset-credit-expiry-error', className: styleMap.codexResetCreditsError },
        t('codex_quota.reset_credits_expiry_failed', {
          message: rateLimitResetCreditsError,
        })
      )
    );
  }

  if (windows.length === 0) {
    nodes.push(
      h('div', { key: 'empty', className: styleMap.quotaMessage }, t('codex_quota.empty_windows'))
    );
    return h(Fragment, null, ...nodes);
  }

  nodes.push(
    ...windows.map((window) => {
      const used = window.usedPercent;
      const clampedUsed = used === null ? null : Math.max(0, Math.min(100, used));
      const remaining = clampedUsed === null ? null : Math.max(0, Math.min(100, 100 - clampedUsed));
      const percentLabel = remaining === null ? '--' : `${Math.round(remaining)}%`;
      const windowLabel = window.labelKey
        ? t(window.labelKey, window.labelParams as Record<string, string | number>)
        : window.label;

      return h(
        'div',
        { key: window.id, className: styleMap.quotaRow },
        h(
          'div',
          { className: styleMap.quotaRowHeader },
          h('span', { className: styleMap.quotaModel }, windowLabel),
          h(
            'div',
            { className: styleMap.quotaMeta },
            h('span', { className: styleMap.quotaPercent }, percentLabel),
            h('span', { className: styleMap.quotaReset }, window.resetLabel)
          )
        ),
        h(QuotaProgressBar, {
          percent: remaining,
          highThreshold: QUOTA_PROGRESS_HIGH_THRESHOLD,
          mediumThreshold: QUOTA_PROGRESS_MEDIUM_THRESHOLD,
        })
      );
    })
  );

  return h(Fragment, null, ...nodes);
};

const buildClaudeQuotaWindows = (
  payload: ClaudeUsagePayload,
  t: TFunction
): ClaudeQuotaWindow[] => {
  const windows: ClaudeQuotaWindow[] = [];

  for (const { key, id, labelKey } of CLAUDE_USAGE_WINDOW_KEYS) {
    const window = payload[key as keyof ClaudeUsagePayload];
    if (!window || typeof window !== 'object' || !('utilization' in window)) continue;
    const typedWindow = window as { utilization: number; resets_at: string };
    const usedPercent = normalizeNumberValue(typedWindow.utilization);
    const resetLabel = formatQuotaResetTime(typedWindow.resets_at);
    windows.push({
      id,
      label: t(labelKey),
      labelKey,
      usedPercent,
      resetLabel,
    });
  }

  return windows;
};

const normalizeFlagValue = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(trimmed)) return true;
    if (['false', '0', 'no', 'n', 'off'].includes(trimmed)) return false;
  }
  return undefined;
};

const parseClaudeProfilePayload = (payload: unknown): ClaudeProfileResponse | null => {
  if (payload === undefined || payload === null) return null;
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed) as ClaudeProfileResponse;
    } catch {
      return null;
    }
  }
  if (typeof payload === 'object') {
    return payload as ClaudeProfileResponse;
  }
  return null;
};

const resolveClaudePlanType = (profile: ClaudeProfileResponse | null): string | null => {
  if (!profile) return null;

  const hasClaudeMax = normalizeFlagValue(profile.account?.has_claude_max);
  if (hasClaudeMax) return 'plan_max';

  const hasClaudePro = normalizeFlagValue(profile.account?.has_claude_pro);
  if (hasClaudePro) return 'plan_pro';

  const organizationType = normalizeStringValue(
    profile.organization?.organization_type
  )?.toLowerCase();
  const subscriptionStatus = normalizeStringValue(
    profile.organization?.subscription_status
  )?.toLowerCase();

  if (organizationType === 'claude_team' && subscriptionStatus === 'active') {
    return 'plan_team';
  }

  if (hasClaudeMax === false && hasClaudePro === false) return 'plan_free';

  return null;
};

const fetchClaudeQuota = async (
  file: AuthFileItem,
  t: TFunction
): Promise<{
  windows: ClaudeQuotaWindow[];
  extraUsage?: ClaudeExtraUsage | null;
  planType?: string | null;
}> => {
  const rawAuthIndex = file['auth_index'] ?? file.authIndex;
  const authIndex = normalizeAuthIndex(rawAuthIndex);
  if (!authIndex) {
    throw new Error(t('claude_quota.missing_auth_index'));
  }

  const [usageResult, profileResult] = await Promise.allSettled([
    apiCallApi.request({
      authIndex,
      method: 'GET',
      url: CLAUDE_USAGE_URL,
      header: { ...CLAUDE_REQUEST_HEADERS },
    }),
    apiCallApi.request({
      authIndex,
      method: 'GET',
      url: CLAUDE_PROFILE_URL,
      header: { ...CLAUDE_REQUEST_HEADERS },
    }),
  ]);

  if (usageResult.status === 'rejected') {
    throw usageResult.reason;
  }

  const result = usageResult.value;

  if (result.statusCode < 200 || result.statusCode >= 300) {
    throw createStatusError(getApiCallErrorMessage(result), result.statusCode);
  }

  const payload = parseClaudeUsagePayload(result.body ?? result.bodyText);
  if (!payload) {
    throw new Error(t('claude_quota.empty_windows'));
  }

  const windows = buildClaudeQuotaWindows(payload, t);
  const planType =
    profileResult.status === 'fulfilled' &&
    profileResult.value.statusCode >= 200 &&
    profileResult.value.statusCode < 300
      ? resolveClaudePlanType(
          parseClaudeProfilePayload(profileResult.value.body ?? profileResult.value.bodyText)
        )
      : null;

  return { windows, extraUsage: payload.extra_usage, planType };
};

const renderClaudeItems = (
  quota: ClaudeQuotaState,
  t: TFunction,
  helpers: QuotaRenderHelpers
): ReactNode => {
  const { styles: styleMap, QuotaProgressBar } = helpers;
  const { createElement: h, Fragment } = React;
  const windows = quota.windows ?? [];
  const extraUsage = quota.extraUsage ?? null;
  const planType = quota.planType ?? null;
  const nodes: ReactNode[] = [];

  if (planType) {
    nodes.push(
      h(
        'div',
        { key: 'plan', className: styleMap.codexPlan },
        h('span', { className: styleMap.codexPlanLabel }, t('claude_quota.plan_label')),
        h('span', { className: styleMap.codexPlanValue }, t(`claude_quota.${planType}`))
      )
    );
  }

  if (extraUsage && extraUsage.is_enabled) {
    const usedLabel = `$${(extraUsage.used_credits / 100).toFixed(2)} / $${(extraUsage.monthly_limit / 100).toFixed(2)}`;
    nodes.push(
      h(
        'div',
        { key: 'extra', className: styleMap.codexPlan },
        h('span', { className: styleMap.codexPlanLabel }, t('claude_quota.extra_usage_label')),
        h('span', { className: styleMap.codexPlanValue }, usedLabel)
      )
    );
  }

  if (windows.length === 0) {
    nodes.push(
      h('div', { key: 'empty', className: styleMap.quotaMessage }, t('claude_quota.empty_windows'))
    );
    return h(Fragment, null, ...nodes);
  }

  nodes.push(
    ...windows.map((window) => {
      const used = window.usedPercent;
      const clampedUsed = used === null ? null : Math.max(0, Math.min(100, used));
      const remaining = clampedUsed === null ? null : Math.max(0, Math.min(100, 100 - clampedUsed));
      const percentLabel = remaining === null ? '--' : `${Math.round(remaining)}%`;
      const windowLabel = window.labelKey ? t(window.labelKey) : window.label;

      return h(
        'div',
        { key: window.id, className: styleMap.quotaRow },
        h(
          'div',
          { className: styleMap.quotaRowHeader },
          h('span', { className: styleMap.quotaModel }, windowLabel),
          h(
            'div',
            { className: styleMap.quotaMeta },
            h('span', { className: styleMap.quotaPercent }, percentLabel),
            h('span', { className: styleMap.quotaReset }, window.resetLabel)
          )
        ),
        h(QuotaProgressBar, {
          percent: remaining,
          highThreshold: QUOTA_PROGRESS_HIGH_THRESHOLD,
          mediumThreshold: QUOTA_PROGRESS_MEDIUM_THRESHOLD,
        })
      );
    })
  );

  return h(Fragment, null, ...nodes);
};

export const CLAUDE_CONFIG: QuotaConfig<
  ClaudeQuotaState,
  { windows: ClaudeQuotaWindow[]; extraUsage?: ClaudeExtraUsage | null; planType?: string | null }
> = {
  type: 'claude',
  i18nPrefix: 'claude_quota',
  filterFn: (file) => isClaudeFile(file) && !isDisabledAuthFile(file),
  fetchQuota: fetchClaudeQuota,
  storeSelector: (state) => state.claudeQuota,
  storeSetter: 'setClaudeQuota',
  buildLoadingState: () => ({ status: 'loading', windows: [] }),
  buildSuccessState: (data) => ({
    status: 'success',
    windows: data.windows,
    extraUsage: data.extraUsage,
    planType: data.planType,
  }),
  buildErrorState: (message, status) => ({
    status: 'error',
    windows: [],
    error: message,
    errorStatus: status,
  }),
  cardClassName: styles.claudeCard,
  gridClassName: styles.claudeGrid,
  renderQuotaItems: renderClaudeItems,
};

export const ANTIGRAVITY_CONFIG: QuotaConfig<AntigravityQuotaState, AntigravityQuotaData> = {
  type: 'antigravity',
  i18nPrefix: 'antigravity_quota',
  filterFn: (file) => isAntigravityFile(file) && !isDisabledAuthFile(file),
  fetchQuota: fetchAntigravityQuota,
  storeSelector: (state) => state.antigravityQuota,
  storeSetter: 'setAntigravityQuota',
  buildLoadingState: () => ({
    status: 'loading',
    groups: [],
    subscription: null,
    serverTimeOffsetMs: null,
  }),
  buildSuccessState: (data) => ({
    status: 'success',
    groups: data.groups,
    subscription: data.subscription,
    serverTimeOffsetMs: data.serverTimeOffsetMs,
  }),
  buildErrorState: (message, status) => ({
    status: 'error',
    groups: [],
    subscription: null,
    serverTimeOffsetMs: null,
    error: message,
    errorStatus: status,
  }),
  cardClassName: styles.antigravityCard,
  gridClassName: styles.antigravityGrid,
  renderQuotaItems: renderAntigravityItems,
};

export const CODEX_CONFIG: QuotaConfig<CodexQuotaState, CodexQuotaData> = {
  type: 'codex',
  i18nPrefix: 'codex_quota',
  filterFn: (file) => isCodexFile(file) && !isDisabledAuthFile(file),
  fetchQuota: fetchCodexQuota,
  resetQuota: resetCodexQuota,
  canResetQuota: (quota) => (quota.rateLimitResetCreditsAvailableCount ?? 0) > 0,
  storeSelector: (state) => state.codexQuota,
  storeSetter: 'setCodexQuota',
  buildLoadingState: () => ({
    status: 'loading',
    windows: [],
    rateLimitResetCredits: [],
    rateLimitResetCreditsError: '',
  }),
  buildSuccessState: (data) => ({
    status: 'success',
    windows: data.windows,
    planType: data.planType,
    subscriptionActiveUntil: data.subscriptionActiveUntil,
    rateLimitResetCreditsAvailableCount: data.rateLimitResetCreditsAvailableCount,
    rateLimitResetCredits: data.rateLimitResetCredits,
    rateLimitResetCreditsError: data.rateLimitResetCreditsError,
  }),
  buildErrorState: (message, status) => ({
    status: 'error',
    windows: [],
    rateLimitResetCredits: [],
    rateLimitResetCreditsError: '',
    error: message,
    errorStatus: status,
  }),
  cardClassName: styles.codexCard,
  gridClassName: styles.codexGrid,
  renderQuotaItems: renderCodexItems,
};

const fetchKimiQuota = async (file: AuthFileItem, t: TFunction): Promise<KimiQuotaRow[]> => {
  const rawAuthIndex = file['auth_index'] ?? file.authIndex;
  const authIndex = normalizeAuthIndex(rawAuthIndex);
  if (!authIndex) {
    throw new Error(t('kimi_quota.missing_auth_index'));
  }

  const result = await apiCallApi.request({
    authIndex,
    method: 'GET',
    url: KIMI_USAGE_URL,
    header: { ...KIMI_REQUEST_HEADERS },
  });

  if (result.statusCode < 200 || result.statusCode >= 300) {
    throw createStatusError(getApiCallErrorMessage(result), result.statusCode);
  }

  const payload = parseKimiUsagePayload(result.body ?? result.bodyText);
  if (!payload) {
    throw new Error(t('kimi_quota.empty_data'));
  }

  return buildKimiQuotaRows(payload);
};

const renderKimiItems = (
  quota: KimiQuotaState,
  t: TFunction,
  helpers: QuotaRenderHelpers
): ReactNode => {
  const { styles: styleMap, QuotaProgressBar } = helpers;
  const { createElement: h } = React;
  const rows = quota.rows ?? [];

  if (rows.length === 0) {
    return h('div', { className: styleMap.quotaMessage }, t('kimi_quota.empty_data'));
  }

  return rows.map((row) => {
    const limit = row.limit;
    const used = row.used;
    const remaining =
      limit > 0
        ? Math.max(0, Math.min(100, Math.round(((limit - used) / limit) * 100)))
        : used > 0
          ? 0
          : null;
    const percentLabel = remaining === null ? '--' : `${remaining}%`;
    const rowLabel = row.labelKey
      ? t(row.labelKey, (row.labelParams ?? {}) as Record<string, string | number>)
      : (row.label ?? '');
    const resetLabel = formatKimiResetHint(t, row.resetHint);

    return h(
      'div',
      { key: row.id, className: styleMap.quotaRow },
      h(
        'div',
        { className: styleMap.quotaRowHeader },
        h('span', { className: styleMap.quotaModel }, rowLabel),
        h(
          'div',
          { className: styleMap.quotaMeta },
          h('span', { className: styleMap.quotaPercent }, percentLabel),
          resetLabel ? h('span', { className: styleMap.quotaReset }, resetLabel) : null
        )
      ),
      h(QuotaProgressBar, {
        percent: remaining,
        highThreshold: QUOTA_PROGRESS_HIGH_THRESHOLD,
        mediumThreshold: QUOTA_PROGRESS_MEDIUM_THRESHOLD,
      })
    );
  });
};

const toXaiRecord = (value: unknown): Record<string, unknown> | null => {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
};

const resolveXaiUserId = (file: AuthFileItem): string | null => {
  const metadata = toXaiRecord(file.metadata);
  const attributes = toXaiRecord(file.attributes);
  const oauth = toXaiRecord(file.oauth ?? metadata?.oauth ?? attributes?.oauth);
  const user = toXaiRecord(file.user ?? metadata?.user ?? attributes?.user);

  const candidates = [
    file.sub,
    file.subject,
    file.user_id,
    file.userId,
    metadata?.sub,
    metadata?.subject,
    metadata?.user_id,
    metadata?.userId,
    attributes?.sub,
    attributes?.subject,
    attributes?.user_id,
    attributes?.userId,
    oauth?.sub,
    oauth?.subject,
    user?.sub,
    user?.id,
  ];

  for (const candidate of candidates) {
    const userId = normalizeStringValue(candidate);
    if (userId) return userId;
  }

  return null;
};

const buildXaiRequestHeaders = (file: AuthFileItem): Record<string, string> => {
  const headers: Record<string, string> = { ...XAI_REQUEST_HEADERS };
  const userId = resolveXaiUserId(file);
  if (userId) {
    headers['x-userid'] = userId;
  }
  return headers;
};

const requestXaiBilling = async (
  authIndex: string,
  url: string,
  header: Record<string, string>
): Promise<XaiBillingSummary | null> => {
  const result = await apiCallApi.request({
    authIndex,
    method: 'GET',
    url,
    header,
  });

  if (result.statusCode < 200 || result.statusCode >= 300) {
    throw createStatusError(getApiCallErrorMessage(result), result.statusCode);
  }

  const payload = parseXaiBillingPayload(result.body ?? result.bodyText);
  return buildXaiBillingSummary(payload?.config);
};

const requestXaiPaidHealth = async (authIndex: string): Promise<XaiBillingSummary> => {
  const [profileRequest, chatRequest] = await Promise.allSettled([
    apiCallApi.request(
      {
        authIndex,
        method: 'GET',
        url: XAI_API_ME_URL,
        header: XAI_API_REQUEST_HEADERS,
      },
      { timeout: XAI_PAID_HEALTH_REQUEST_TIMEOUT_MS }
    ),
    apiCallApi.request(
      {
        authIndex,
        method: 'POST',
        url: XAI_API_CHAT_URL,
        header: {
          ...XAI_API_REQUEST_HEADERS,
          'Content-Type': 'application/json',
        },
        data: JSON.stringify({
          model: XAI_PAID_HEALTH_MODEL,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
          stream: false,
        }),
      },
      { timeout: XAI_PAID_HEALTH_REQUEST_TIMEOUT_MS }
    ),
  ]);

  if (chatRequest.status === 'rejected') throw chatRequest.reason;
  if (chatRequest.value.statusCode < 200 || chatRequest.value.statusCode >= 300) {
    throw createStatusError(
      getApiCallErrorMessage(chatRequest.value),
      chatRequest.value.statusCode
    );
  }

  const profile =
    profileRequest.status === 'fulfilled' &&
    profileRequest.value.statusCode >= 200 &&
    profileRequest.value.statusCode < 300
      ? profileRequest.value.body
      : null;
  return buildXaiPaidHealthSummary(profile);
};

const fetchXaiQuota = async (file: AuthFileItem, t: TFunction): Promise<XaiBillingSummary> => {
  const rawAuthIndex = file['auth_index'] ?? file.authIndex;
  const authIndex = normalizeAuthIndex(rawAuthIndex);
  if (!authIndex) {
    throw new Error(t('xai_quota.missing_auth_index'));
  }

  if (isPaidXaiAuthFile(file)) {
    return requestXaiPaidHealth(authIndex);
  }

  const requestHeader = buildXaiRequestHeaders(file);
  const [weeklyResult, monthlyResult] = await Promise.allSettled([
    requestXaiBilling(authIndex, XAI_BILLING_WEEKLY_URL, requestHeader),
    requestXaiBilling(authIndex, XAI_BILLING_MONTHLY_URL, requestHeader),
  ]);
  const weeklySummary = weeklyResult.status === 'fulfilled' ? weeklyResult.value : null;
  const monthlySummary = monthlyResult.status === 'fulfilled' ? monthlyResult.value : null;
  const summary = mergeXaiBillingSummaries(weeklySummary, monthlySummary);
  if (summary) return summary;

  const billingError =
    weeklyResult.status === 'rejected' && monthlyResult.status === 'rejected'
      ? weeklyResult.reason
      : new Error(t('xai_quota.empty_data'));

  try {
    return await requestXaiPaidHealth(authIndex);
  } catch {
    // Preserve the original free billing error when neither account mode can be queried.
    throw billingError;
  }
};

const formatUsdFromCents = (cents: number | null): string => {
  if (cents === null) return '--';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
};

const formatXaiRemainingAmount = (billing: XaiBillingSummary): string => {
  const remainingCents =
    billing.monthlyLimitCents !== null && billing.includedUsedCents !== null
      ? Math.max(0, billing.monthlyLimitCents - billing.includedUsedCents)
      : null;
  const remaining = formatUsdFromCents(remainingCents);
  const limit = formatUsdFromCents(billing.monthlyLimitCents);
  if (billing.monthlyLimitCents === null) return remaining;
  return `${remaining} / ${limit}`;
};

const formatXaiOnDemandAmount = (billing: XaiBillingSummary): string => {
  const remainingCents =
    billing.onDemandCapCents !== null && billing.onDemandUsedCents !== null
      ? Math.max(0, billing.onDemandCapCents - billing.onDemandUsedCents)
      : null;
  const remaining = formatUsdFromCents(remainingCents);
  const cap = formatUsdFromCents(billing.onDemandCapCents);
  if (billing.onDemandCapCents === null) return remaining;
  return `${remaining} / ${cap}`;
};

const formatXaiPercent = (value: number | null): string => {
  if (value === null) return '--';
  return `${Math.round(value)}%`;
};

const XAI_SUPERGROK_LIMIT_CENTS = 15_000;
const XAI_SUPERGROK_HEAVY_LIMIT_CENTS = 150_000;

const resolveXaiPlan = (
  monthlyLimitCents: number | null
): { labelKey: string; premium: boolean } | null => {
  if (monthlyLimitCents === XAI_SUPERGROK_LIMIT_CENTS) {
    return { labelKey: 'plan_supergrok', premium: false };
  }
  if (monthlyLimitCents === XAI_SUPERGROK_HEAVY_LIMIT_CENTS) {
    return { labelKey: 'plan_supergrok_heavy', premium: true };
  }
  return null;
};

const renderXaiItems = (
  quota: XaiQuotaState,
  t: TFunction,
  helpers: QuotaRenderHelpers
): ReactNode => {
  const { styles: styleMap, QuotaProgressBar } = helpers;
  const { createElement: h, Fragment } = React;
  const billing = quota.billing;

  if (!billing) {
    return h('div', { className: styleMap.quotaMessage }, t('xai_quota.empty_data'));
  }

  if (billing.mode === 'paid-health') {
    return h(
      Fragment,
      null,
      h(
        'div',
        { className: styleMap.codexPlan },
        h('span', { className: styleMap.codexPlanLabel }, t('xai_quota.plan_label')),
        h('span', { className: styleMap.premiumPlanValue }, t('xai_quota.plan_paid'))
      ),
      h('div', { className: styleMap.quotaMessage }, t('xai_quota.paid_health'))
    );
  }

  const clampedUsed =
    billing.usedPercent === null ? null : Math.max(0, Math.min(100, billing.usedPercent));
  const remaining = clampedUsed === null ? null : Math.max(0, Math.min(100, 100 - clampedUsed));
  const percentLabel = formatXaiPercent(remaining);
  const amountLabel = formatXaiRemainingAmount(billing);
  const resetLabel = formatQuotaResetTime(billing.billingPeriodEnd);
  const onDemandCap = billing.onDemandCapCents ?? 0;
  const clampedOnDemandUsed =
    billing.onDemandUsedPercent === null
      ? null
      : Math.max(0, Math.min(100, billing.onDemandUsedPercent));
  const onDemandRemaining =
    clampedOnDemandUsed === null ? null : Math.max(0, Math.min(100, 100 - clampedOnDemandUsed));
  const onDemandPercentLabel = formatXaiPercent(onDemandRemaining);
  const onDemandAmountLabel = formatXaiOnDemandAmount(billing);
  const plan = resolveXaiPlan(billing.monthlyLimitCents);
  const weeklyUsed =
    billing.periodType === 'weekly' && billing.usagePercent !== null
      ? Math.max(0, Math.min(100, billing.usagePercent))
      : null;
  const weeklyRemaining = weeklyUsed === null ? null : Math.max(0, Math.min(100, 100 - weeklyUsed));
  const weeklyResetLabel = formatQuotaResetTime(billing.periodEnd);
  const hasWeeklyData =
    billing.periodType === 'weekly' &&
    (weeklyUsed !== null || Boolean(billing.periodEnd) || billing.productUsage.length > 0);
  const hasMonthlyData =
    billing.monthlyLimitCents !== null ||
    billing.usedCents !== null ||
    Boolean(billing.billingPeriodEnd);

  return h(
    Fragment,
    null,
    plan
      ? h(
          'div',
          { key: 'plan', className: styleMap.codexPlan },
          h('span', { className: styleMap.codexPlanLabel }, t('xai_quota.plan_label')),
          h(
            'span',
            { className: plan.premium ? styleMap.premiumPlanValue : styleMap.codexPlanValue },
            t(`xai_quota.${plan.labelKey}`)
          )
        )
      : null,
    hasWeeklyData
      ? h(
          'div',
          { key: 'weekly-limit', className: styleMap.quotaRow },
          h(
            'div',
            { className: styleMap.quotaRowHeader },
            h('span', { className: styleMap.quotaModel }, t('xai_quota.weekly_limit')),
            h(
              'div',
              { className: styleMap.quotaMeta },
              h(
                'span',
                { className: styleMap.quotaPercent },
                t('xai_quota.used_percent', {
                  percent: formatXaiPercent(weeklyUsed),
                })
              ),
              weeklyResetLabel !== '-'
                ? h(
                    'span',
                    { className: styleMap.quotaReset },
                    t('xai_quota.reset_at', {
                      time: weeklyResetLabel,
                    })
                  )
                : null
            )
          ),
          h(QuotaProgressBar, {
            percent: weeklyRemaining,
            highThreshold: QUOTA_PROGRESS_HIGH_THRESHOLD,
            mediumThreshold: QUOTA_PROGRESS_MEDIUM_THRESHOLD,
          })
        )
      : null,
    ...billing.productUsage.map((item) => {
      const used =
        item.usagePercent === null ? null : Math.max(0, Math.min(100, item.usagePercent));
      const remainingPercent = used === null ? null : Math.max(0, Math.min(100, 100 - used));
      return h(
        'div',
        { key: `product-${item.product}`, className: styleMap.quotaRow },
        h(
          'div',
          { className: styleMap.quotaRowHeader },
          h(
            'span',
            { className: styleMap.quotaModel },
            t('xai_quota.product_usage', { product: item.product })
          ),
          h(
            'div',
            { className: styleMap.quotaMeta },
            h(
              'span',
              { className: styleMap.quotaPercent },
              t('xai_quota.used_percent', {
                percent: formatXaiPercent(used),
              })
            )
          )
        ),
        h(QuotaProgressBar, {
          percent: remainingPercent,
          highThreshold: QUOTA_PROGRESS_HIGH_THRESHOLD,
          mediumThreshold: QUOTA_PROGRESS_MEDIUM_THRESHOLD,
        })
      );
    }),
    onDemandCap > 0
      ? h(
          'div',
          { key: 'pay-as-you-go', className: styleMap.quotaRow },
          h(
            'div',
            { className: styleMap.quotaRowHeader },
            h('span', { className: styleMap.quotaModel }, t('xai_quota.pay_as_you_go_label')),
            h(
              'div',
              { className: styleMap.quotaMeta },
              h('span', { className: styleMap.quotaPercent }, onDemandPercentLabel),
              h('span', { className: styleMap.quotaAmount }, onDemandAmountLabel)
            )
          ),
          h(QuotaProgressBar, {
            percent: onDemandRemaining,
            highThreshold: QUOTA_PROGRESS_HIGH_THRESHOLD,
            mediumThreshold: QUOTA_PROGRESS_MEDIUM_THRESHOLD,
          })
        )
      : h(
          'div',
          { key: 'pay-as-you-go', className: styleMap.codexPlan },
          h('span', { className: styleMap.codexPlanLabel }, t('xai_quota.pay_as_you_go_label')),
          h('span', { className: styleMap.codexPlanValue }, t('xai_quota.pay_as_you_go_disabled'))
        ),
    hasMonthlyData
      ? h(
          'div',
          { key: 'monthly-credits', className: styleMap.quotaRow },
          h(
            'div',
            { className: styleMap.quotaRowHeader },
            h('span', { className: styleMap.quotaModel }, t('xai_quota.monthly_credits')),
            h(
              'div',
              { className: styleMap.quotaMeta },
              h('span', { className: styleMap.quotaPercent }, percentLabel),
              h('span', { className: styleMap.quotaAmount }, amountLabel),
              resetLabel !== '-' ? h('span', { className: styleMap.quotaReset }, resetLabel) : null
            )
          ),
          h(QuotaProgressBar, {
            percent: remaining,
            highThreshold: QUOTA_PROGRESS_HIGH_THRESHOLD,
            mediumThreshold: QUOTA_PROGRESS_MEDIUM_THRESHOLD,
          })
        )
      : null
  );
};

export const KIMI_CONFIG: QuotaConfig<KimiQuotaState, KimiQuotaRow[]> = {
  type: 'kimi',
  i18nPrefix: 'kimi_quota',
  filterFn: (file) => isKimiFile(file) && !isDisabledAuthFile(file),
  fetchQuota: fetchKimiQuota,
  storeSelector: (state) => state.kimiQuota,
  storeSetter: 'setKimiQuota',
  buildLoadingState: () => ({ status: 'loading', rows: [] }),
  buildSuccessState: (rows) => ({ status: 'success', rows }),
  buildErrorState: (message, status) => ({
    status: 'error',
    rows: [],
    error: message,
    errorStatus: status,
  }),
  cardClassName: styles.kimiCard,
  gridClassName: styles.kimiGrid,
  renderQuotaItems: renderKimiItems,
};

export const XAI_CONFIG: QuotaConfig<XaiQuotaState, XaiBillingSummary> = {
  type: 'xai',
  i18nPrefix: 'xai_quota',
  filterFn: (file) => isXaiFile(file) && !isDisabledAuthFile(file),
  fetchQuota: fetchXaiQuota,
  storeSelector: (state) => state.xaiQuota,
  storeSetter: 'setXaiQuota',
  buildLoadingState: () => ({ status: 'loading', billing: null }),
  buildSuccessState: (billing) => ({ status: 'success', billing }),
  buildErrorState: (message, status) => ({
    status: 'error',
    billing: null,
    error: message,
    errorStatus: status,
  }),
  cardClassName: styles.xaiCard,
  gridClassName: styles.xaiGrid,
  renderQuotaItems: renderXaiItems,
};

// ============================================================================
// FORK-ADDED: Kiro (AWS CodeWhisperer) quota support
// ============================================================================

interface KiroQuotaData {
  subscriptionTitle: string | null;
  baseQuota: KiroBaseQuota | null;
  freeTrialQuota: KiroFreeTrialQuota | null;
}

const formatKiroResetTime = (timestamp: number | undefined): string => {
  if (!timestamp) return '-';
  const date = new Date(timestamp * 1000);
  if (Number.isNaN(date.getTime())) return '-';
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
};

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

const renderKiroItems = (
  quota: KiroQuotaState,
  t: TFunction,
  helpers: QuotaRenderHelpers
): ReactNode => {
  const { styles: styleMap, QuotaProgressBar } = helpers;
  const { createElement: h, Fragment } = React;
  const nodes: ReactNode[] = [];

  if (quota.subscriptionTitle) {
    nodes.push(
      h(
        'div',
        { key: 'subscription', className: styleMap.codexPlan },
        h('span', { className: styleMap.codexPlanLabel }, t('kiro_quota.subscription_label')),
        h('span', { className: styleMap.codexPlanValue }, quota.subscriptionTitle)
      )
    );
  }

  if (quota.baseQuota) {
    const { used, limit, resetTime } = quota.baseQuota;
    const remaining = Math.max(0, limit - used);
    const percent = limit > 0 ? Math.round((remaining / limit) * 100) : 0;
    const resetLabel = formatKiroResetTime(resetTime);

    nodes.push(
      h(
        'div',
        { key: 'base', className: styleMap.quotaRow },
        h(
          'div',
          { className: styleMap.quotaRowHeader },
          h('span', { className: styleMap.quotaModel }, t('kiro_quota.base_quota')),
          h(
            'div',
            { className: styleMap.quotaMeta },
            h('span', { className: styleMap.quotaPercent }, `${percent}%`),
            h('span', { className: styleMap.quotaAmount }, `${remaining.toFixed(1)}/${limit}`),
            h('span', { className: styleMap.quotaReset }, resetLabel)
          )
        ),
        h(QuotaProgressBar, {
          percent,
          highThreshold: QUOTA_PROGRESS_HIGH_THRESHOLD,
          mediumThreshold: QUOTA_PROGRESS_MEDIUM_THRESHOLD,
        })
      )
    );
  }

  if (quota.freeTrialQuota) {
    const { used, limit, expiry, status } = quota.freeTrialQuota;
    const isActive = status.toUpperCase() === 'ACTIVE';
    // FORK-TWEAK: hide the free-trial row entirely once the trial has expired.
    if (isActive) {
      const remaining = Math.max(0, limit - used);
      const percent = limit > 0 ? Math.round((remaining / limit) * 100) : 0;
      const statusLabel = t('kiro_quota.trial_active');
      const expiryLabel = formatKiroResetTime(expiry);

      nodes.push(
        h(
          'div',
          { key: 'trial', className: styleMap.quotaRow },
          h(
            'div',
            { className: styleMap.quotaRowHeader },
            h(
              'span',
              { className: styleMap.quotaModel },
              `${t('kiro_quota.free_trial')} (${statusLabel})`
            ),
            h(
              'div',
              { className: styleMap.quotaMeta },
              h('span', { className: styleMap.quotaPercent }, `${percent}%`),
              h('span', { className: styleMap.quotaAmount }, `${remaining.toFixed(1)}/${limit}`),
              h('span', { className: styleMap.quotaReset }, expiryLabel)
            )
          ),
          h(QuotaProgressBar, {
            percent,
            highThreshold: QUOTA_PROGRESS_HIGH_THRESHOLD,
            mediumThreshold: QUOTA_PROGRESS_MEDIUM_THRESHOLD,
          })
        )
      );
    }
  }

  if (nodes.length === 0) {
    return h('div', { className: styleMap.quotaMessage }, t('kiro_quota.empty'));
  }

  return h(Fragment, null, ...nodes);
};

export const KIRO_CONFIG: QuotaConfig<KiroQuotaState, KiroQuotaData> = {
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
  cardClassName: styles.kiroCard,
  gridClassName: styles.kiroGrid,
  renderQuotaItems: renderKiroItems,
};

// ============================================================================
// FORK-ADDED: GitHub Copilot quota support
// ============================================================================

interface CopilotQuotaData {
  plan: string | null;
  items: CopilotQuotaItem[];
  resetDate: string | null;
}

const formatCopilotResetDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '-';
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
};

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

const renderCopilotItems = (
  quota: CopilotQuotaState,
  t: TFunction,
  helpers: QuotaRenderHelpers
): ReactNode => {
  const { styles: styleMap, QuotaProgressBar } = helpers;
  const { createElement: h, Fragment } = React;
  const nodes: ReactNode[] = [];

  if (quota.plan) {
    nodes.push(
      h(
        'div',
        { key: 'plan', className: styleMap.codexPlan },
        h('span', { className: styleMap.codexPlanLabel }, t('copilot_quota.plan_label')),
        h('span', { className: styleMap.codexPlanValue }, quota.plan)
      )
    );
  }

  if (quota.items.length === 0) {
    nodes.push(
      h('div', { key: 'empty', className: styleMap.quotaMessage }, t('copilot_quota.empty'))
    );
    return h(Fragment, null, ...nodes);
  }

  const resetLabel = formatCopilotResetDate(quota.resetDate ?? undefined);

  for (const item of quota.items) {
    const percentLabel = item.unlimited ? t('copilot_quota.unlimited') : `${item.percent}%`;
    const amountLabel = item.unlimited
      ? ''
      : `${Math.max(0, item.limit - item.used)}/${item.limit}`;

    nodes.push(
      h(
        'div',
        { key: item.id, className: styleMap.quotaRow },
        h(
          'div',
          { className: styleMap.quotaRowHeader },
          h('span', { className: styleMap.quotaModel }, item.label),
          h(
            'div',
            { className: styleMap.quotaMeta },
            h('span', { className: styleMap.quotaPercent }, percentLabel),
            amountLabel ? h('span', { className: styleMap.quotaAmount }, amountLabel) : null,
            h('span', { className: styleMap.quotaReset }, resetLabel)
          )
        ),
        h(QuotaProgressBar, {
          percent: item.unlimited ? 100 : item.percent,
          highThreshold: QUOTA_PROGRESS_HIGH_THRESHOLD,
          mediumThreshold: QUOTA_PROGRESS_MEDIUM_THRESHOLD,
        })
      )
    );
  }

  return h(Fragment, null, ...nodes);
};

export const COPILOT_CONFIG: QuotaConfig<CopilotQuotaState, CopilotQuotaData> = {
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
  cardClassName: styles.copilotCard,
  gridClassName: styles.copilotGrid,
  renderQuotaItems: renderCopilotItems,
};

// ============================================================================
// FORK-ADDED: Qoder quota support (usage snapshot read from auth file)
// ============================================================================

const readQoderUsageSnapshot = (file: AuthFileItem): QoderUsageSnapshot | null => {
  const raw = file.usage;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as QoderUsageSnapshot;
};

const fetchQoderQuota = async (file: AuthFileItem, t: TFunction): Promise<QoderUsageSnapshot> => {
  const usage = readQoderUsageSnapshot(file);
  if (!usage) {
    throw new Error(t('qoder_quota.empty_data'));
  }
  return usage;
};

const normalizeQoderBooleanValue = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['true', '1', 'yes', 'y', 'on'].includes(normalized);
  }
  return false;
};

const formatQoderAmount = (value: number | null, unit = ''): string => {
  if (value === null) return '-';
  const formatted = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(value);
  return unit ? `${formatted} ${unit}` : formatted;
};

const formatQoderExpiry = (value: unknown): string => {
  const asNumber = normalizeNumberValue(value);
  let date: Date | null = null;
  if (asNumber !== null && asNumber > 0) {
    date = new Date(asNumber < 1e12 ? asNumber * 1000 : asNumber);
  } else if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      date = parsed;
    }
  }
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString(undefined, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const normalizeQoderUsedPercent = (usage: QoderUsageSnapshot): number | null => {
  const explicit = normalizeNumberValue(usage.percentage);
  if (explicit !== null) {
    const percent = explicit <= 1 ? explicit * 100 : explicit;
    return Math.max(0, Math.min(100, percent));
  }

  const total = normalizeNumberValue(usage.total);
  if (!total || total <= 0) return null;

  const used = normalizeNumberValue(usage.used);
  if (used !== null) {
    return Math.max(0, Math.min(100, (used / total) * 100));
  }

  const remaining = normalizeNumberValue(usage.remaining);
  if (remaining !== null) {
    return Math.max(0, Math.min(100, ((total - remaining) / total) * 100));
  }

  return null;
};

const renderQoderItems = (
  quota: QoderQuotaState,
  t: TFunction,
  helpers: QuotaRenderHelpers
): ReactNode => {
  const { styles: styleMap, QuotaProgressBar } = helpers;
  const { createElement: h, Fragment } = React;

  // FORK-TWEAK: QoderWork plugin accounts render via the shared plugin-credits
  // renderer inside the unified Qoder section.
  if (quota.credits) {
    return renderPluginCreditsItems(
      { status: quota.status, data: quota.credits, error: quota.error },
      t,
      helpers
    );
  }

  const usage = quota.usage ?? null;

  if (!usage) {
    return h('div', { className: styleMap.quotaMessage }, t('qoder_quota.empty_data'));
  }

  const unit = normalizeStringValue(usage.unit) ?? t('qoder_quota.unit_default');
  const used = normalizeNumberValue(usage.used);
  const total = normalizeNumberValue(usage.total);
  const remainingAmount = normalizeNumberValue(usage.remaining);
  const orgRemaining = normalizeNumberValue(
    usage.org_resource_remaining ?? usage.orgResourceRemaining
  );
  const explicitPercent = normalizeNumberValue(usage.percentage);

  // FORK-TWEAK: guard against empty/zero Qoder snapshots. When the backend has no
  // real usage data (total/used/remaining all absent or 0 and no explicit percentage),
  // avoid the contradictory "100% + 0/0 + quota exceeded" display.
  const hasMeaningfulData =
    explicitPercent !== null ||
    (total !== null && total > 0) ||
    (used !== null && used > 0) ||
    (remainingAmount !== null && remainingAmount > 0) ||
    (orgRemaining !== null && orgRemaining > 0);

  if (!hasMeaningfulData) {
    return h('div', { className: styleMap.quotaMessage }, t('qoder_quota.empty_data'));
  }

  const usedPercent = normalizeQoderUsedPercent(usage);
  const remainingPercent =
    usedPercent === null ? null : Math.max(0, Math.min(100, 100 - usedPercent));
  const percentLabel = remainingPercent === null ? '--' : `${Math.round(remainingPercent)}%`;
  const resetLabel = formatQoderExpiry(usage.expires_at ?? usage.expiresAt);
  const isExceeded = normalizeQoderBooleanValue(usage.is_quota_exceeded ?? usage.isQuotaExceeded);
  const amountLabel =
    used !== null && total !== null && total > 0
      ? `${formatQoderAmount(used)} / ${formatQoderAmount(total, unit)}`
      : remainingAmount !== null
        ? t('qoder_quota.remaining_amount', {
            amount: formatQoderAmount(remainingAmount, unit),
          })
        : null;

  const nodes: ReactNode[] = [
    h(
      'div',
      { key: 'usage', className: styleMap.quotaRow },
      h(
        'div',
        { className: styleMap.quotaRowHeader },
        h('span', { className: styleMap.quotaModel }, t('qoder_quota.usage_label')),
        h(
          'div',
          { className: styleMap.quotaMeta },
          h('span', { className: styleMap.quotaPercent }, percentLabel),
          amountLabel ? h('span', { className: styleMap.quotaAmount }, amountLabel) : null,
          resetLabel !== '-'
            ? h(
                'span',
                { className: styleMap.quotaReset },
                t('qoder_quota.expires_at', { time: resetLabel })
              )
            : null
        )
      ),
      h(QuotaProgressBar, {
        percent: remainingPercent,
        highThreshold: QUOTA_PROGRESS_HIGH_THRESHOLD,
        mediumThreshold: QUOTA_PROGRESS_MEDIUM_THRESHOLD,
      })
    ),
  ];

  if (orgRemaining !== null && orgRemaining > 0) {
    nodes.push(
      h(
        'div',
        { key: 'org', className: styleMap.codexPlan },
        h('span', { className: styleMap.codexPlanLabel }, t('qoder_quota.org_resource_remaining')),
        h('span', { className: styleMap.codexPlanValue }, formatQoderAmount(orgRemaining, unit))
      )
    );
  }

  if (isExceeded) {
    nodes.push(
      h(
        'div',
        { key: 'exceeded', className: styleMap.quotaWarning },
        t('qoder_quota.quota_exceeded')
      )
    );
  }

  return h(Fragment, null, ...nodes);
};

export const QODER_CONFIG: QuotaConfig<
  QoderQuotaState,
  { usage?: QoderUsageSnapshot | null; credits?: PluginCreditsQuotaData | null }
> = {
  type: 'qoder',
  i18nPrefix: 'qoder_quota',
  // FORK-TWEAK: the Qoder section also hosts QoderWork plugin accounts.
  filterFn: (file) =>
    (isQoderFile(file) || isQoderWorkFile(file)) && !isDisabledAuthFile(file),
  fetchQuota: async (file, t) => {
    if (isQoderWorkFile(file)) {
      const credits = await fetchPluginCreditsQuota('qoderwork', file, t);
      return { credits };
    }
    const usage = await fetchQoderQuota(file, t);
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
  cardClassName: styles.qoderCard,
  gridClassName: styles.qoderGrid,
  renderQuotaItems: renderQoderItems,
};

// ============================================================================
// FORK-ADDED: WorkBuddy / QoderWork plugin credits (Sliverkiss/cpa-plugin)
// ============================================================================

const fetchPluginCreditsQuota = async (
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

const formatPluginCreditsFetchedAt = (value: string | null): string => {
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

const renderPluginCreditsItems = (
  quota: PluginCreditsQuotaState,
  t: TFunction,
  helpers: QuotaRenderHelpers
): ReactNode => {
  const { styles: styleMap, QuotaProgressBar } = helpers;
  const { createElement: h, Fragment } = React;
  const data = quota.data ?? null;

  if (!data) {
    return h('div', { className: styleMap.quotaMessage }, t('plugin_credits_quota.empty_data'));
  }

  const remain = data.remain ?? 0;
  const used = data.used ?? 0;
  // Pool: prefer size; fall back to remain+used. Check-in packs grow the pool.
  const pool = data.size && data.size > 0 ? data.size : remain + used;
  const hasSignal = remain > 0 || used > 0 || pool > 0;

  const nodes: ReactNode[] = [];

  const metaParts: ReactNode[] = [];
  if (data.plan) {
    metaParts.push(
      h(
        'span',
        { key: 'plan', className: styleMap.codexPlanItem },
        h('span', { className: styleMap.codexPlanLabel }, t('plugin_credits_quota.plan_label')),
        h('span', { className: styleMap.codexPlanValue }, data.plan)
      )
    );
  }
  if (data.region) {
    metaParts.push(
      h(
        'span',
        { key: 'region', className: styleMap.codexPlanItem },
        h('span', { className: styleMap.codexPlanLabel }, t('plugin_credits_quota.region_label')),
        h('span', { className: styleMap.codexPlanValue }, data.region.toUpperCase())
      )
    );
  }
  if (metaParts.length > 0) {
    nodes.push(h('div', { key: 'meta', className: styleMap.codexPlan }, ...metaParts));
  }

  if (!hasSignal) {
    nodes.push(
      h(
        'div',
        { key: 'empty', className: styleMap.quotaMessage },
        t('plugin_credits_quota.empty_data')
      )
    );
    return h(Fragment, null, ...nodes);
  }

  const percent = pool > 0 ? Math.max(0, Math.min(100, Math.round((remain / pool) * 100))) : 0;
  const fetchedLabel = formatPluginCreditsFetchedAt(data.fetchedAt);

  nodes.push(
    h(
      'div',
      { key: 'credits', className: styleMap.quotaRow },
      h(
        'div',
        { className: styleMap.quotaRowHeader },
        h('span', { className: styleMap.quotaModel }, t('plugin_credits_quota.credits_label')),
        h(
          'div',
          { className: styleMap.quotaMeta },
          h('span', { className: styleMap.quotaPercent }, `${percent}%`),
          h('span', { className: styleMap.quotaAmount }, `${remain} / ${pool}`),
          fetchedLabel
            ? h(
                'span',
                { className: styleMap.quotaReset },
                t('plugin_credits_quota.fetched_at', { time: fetchedLabel })
              )
            : null
        )
      ),
      h(QuotaProgressBar, {
        percent,
        highThreshold: QUOTA_PROGRESS_HIGH_THRESHOLD,
        mediumThreshold: QUOTA_PROGRESS_MEDIUM_THRESHOLD,
      })
    )
  );

  if (data.exhausted) {
    nodes.push(
      h(
        'div',
        { key: 'exhausted', className: styleMap.quotaWarning },
        t('plugin_credits_quota.exhausted')
      )
    );
  }

  return h(Fragment, null, ...nodes);
};

const buildPluginCreditsConfig = (
  pluginId: PluginCreditsPluginId,
  options: {
    type: QuotaType;
    i18nPrefix: string;
    filterFn: (file: AuthFileItem) => boolean;
    storeSelector: (state: QuotaStore) => Record<string, PluginCreditsQuotaState>;
    storeSetter: keyof QuotaStore;
    cardClassName: string;
    gridClassName: string;
  }
): QuotaConfig<PluginCreditsQuotaState, PluginCreditsQuotaData> => ({
  type: options.type,
  i18nPrefix: options.i18nPrefix,
  filterFn: options.filterFn,
  fetchQuota: (file, t) => fetchPluginCreditsQuota(pluginId, file, t),
  storeSelector: options.storeSelector,
  storeSetter: options.storeSetter,
  buildLoadingState: () => ({ status: 'loading', data: null }),
  buildSuccessState: (data) => ({ status: 'success', data }),
  buildErrorState: (message, status) => ({
    status: 'error',
    data: null,
    error: message,
    errorStatus: status,
  }),
  cardClassName: options.cardClassName,
  gridClassName: options.gridClassName,
  renderQuotaItems: renderPluginCreditsItems,
});

export const WORKBUDDY_CONFIG = buildPluginCreditsConfig('workbuddy', {
  type: 'workbuddy',
  i18nPrefix: 'workbuddy_quota',
  filterFn: (file) => isWorkBuddyFile(file) && !isDisabledAuthFile(file),
  storeSelector: (state) => state.workbuddyQuota,
  storeSetter: 'setWorkbuddyQuota',
  cardClassName: styles.workbuddyCard,
  gridClassName: styles.workbuddyGrid,
});

// FORK-TWEAK: QoderWork accounts are folded into QODER_CONFIG above;
// no standalone QODERWORK_CONFIG section.
