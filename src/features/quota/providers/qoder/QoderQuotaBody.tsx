/**
 * FORK-ADDED: Qoder 额度渲染体。
 * QoderWork 插件账号复用插件积分渲染;原生 Qoder 显示 usage 快照总览。
 */

import { useTranslation } from 'react-i18next';
import type { QoderQuotaState, QoderUsageSnapshot } from '@/types';
import { normalizeNumberValue, normalizeStringValue } from '@/utils/quota';
import { QuotaMeter } from '../../components/QuotaMeter';
import type { QuotaBodyProps } from '../../types';
import { PluginCreditsBody } from '../pluginCredits/PluginCreditsBody';

const normalizeBool = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'y', 'on'].includes(value.trim().toLowerCase());
  }
  return false;
};

const formatAmount = (value: number | null, unit = ''): string => {
  if (value === null) return '-';
  const formatted = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
  return unit ? `${formatted} ${unit}` : formatted;
};

const formatExpiry = (value: unknown): string => {
  const asNumber = normalizeNumberValue(value);
  let date: Date | null = null;
  if (asNumber !== null && asNumber > 0) {
    date = new Date(asNumber < 1e12 ? asNumber * 1000 : asNumber);
  } else if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) date = parsed;
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

const normalizeUsedPercent = (usage: QoderUsageSnapshot): number | null => {
  const explicit = normalizeNumberValue(usage.percentage);
  if (explicit !== null) {
    const percent = explicit <= 1 ? explicit * 100 : explicit;
    return Math.max(0, Math.min(100, percent));
  }
  const total = normalizeNumberValue(usage.total);
  if (!total || total <= 0) return null;
  const used = normalizeNumberValue(usage.used);
  if (used !== null) return Math.max(0, Math.min(100, (used / total) * 100));
  const remaining = normalizeNumberValue(usage.remaining);
  if (remaining !== null) return Math.max(0, Math.min(100, ((total - remaining) / total) * 100));
  return null;
};

export function QoderQuotaBody({ quota, classes }: QuotaBodyProps<QoderQuotaState>) {
  const { t } = useTranslation();

  // FORK-TWEAK: QoderWork plugin accounts render via the shared plugin-credits body.
  if (quota.credits) {
    return (
      <PluginCreditsBody
        quota={{ status: quota.status, data: quota.credits, error: quota.error }}
        classes={classes}
      />
    );
  }

  const usage = quota.usage ?? null;
  if (!usage) {
    return <div className={classes.quotaMessage}>{t('qoder_quota.empty_data')}</div>;
  }

  const unit = normalizeStringValue(usage.unit) ?? t('qoder_quota.unit_default');
  const used = normalizeNumberValue(usage.used);
  const total = normalizeNumberValue(usage.total);
  const remainingAmount = normalizeNumberValue(usage.remaining);
  const orgRemaining = normalizeNumberValue(
    usage.org_resource_remaining ?? usage.orgResourceRemaining
  );
  const explicitPercent = normalizeNumberValue(usage.percentage);

  // FORK-TWEAK: guard against empty/zero snapshots (avoid contradictory 100% + 0/0 + exceeded).
  const hasMeaningfulData =
    explicitPercent !== null ||
    (total !== null && total > 0) ||
    (used !== null && used > 0) ||
    (remainingAmount !== null && remainingAmount > 0) ||
    (orgRemaining !== null && orgRemaining > 0);

  if (!hasMeaningfulData) {
    return <div className={classes.quotaMessage}>{t('qoder_quota.empty_data')}</div>;
  }

  const usedPercent = normalizeUsedPercent(usage);
  const remainingPercent =
    usedPercent === null ? null : Math.max(0, Math.min(100, 100 - usedPercent));
  const percentLabel = remainingPercent === null ? '--' : `${Math.round(remainingPercent)}%`;
  const resetLabel = formatExpiry(usage.expires_at ?? usage.expiresAt);
  const isExceeded = normalizeBool(usage.is_quota_exceeded ?? usage.isQuotaExceeded);
  const amountLabel =
    used !== null && total !== null && total > 0
      ? `${formatAmount(used)} / ${formatAmount(total, unit)}`
      : remainingAmount !== null
        ? t('qoder_quota.remaining_amount', { amount: formatAmount(remainingAmount, unit) })
        : null;

  const nodes: React.ReactNode[] = [
    <div key="usage" className={classes.quotaRow}>
      <div className={classes.quotaRowHeader}>
        <span className={classes.quotaModel}>{t('qoder_quota.usage_label')}</span>
        <div className={classes.quotaMeta}>
          <span className={classes.quotaPercent}>{percentLabel}</span>
          {amountLabel && <span className={classes.quotaAmount}>{amountLabel}</span>}
          {resetLabel !== '-' && (
            <span className={classes.quotaReset}>
              {t('qoder_quota.expires_at', { time: resetLabel })}
            </span>
          )}
        </div>
      </div>
      <QuotaMeter percent={remainingPercent} classes={classes} />
    </div>,
  ];

  if (orgRemaining !== null && orgRemaining > 0) {
    nodes.push(
      <div key="org" className={classes.codexPlan}>
        <span className={classes.codexPlanLabel}>{t('qoder_quota.org_resource_remaining')}</span>
        <span className={classes.codexPlanValue}>{formatAmount(orgRemaining, unit)}</span>
      </div>
    );
  }

  if (isExceeded) {
    nodes.push(
      <div key="exceeded" className={classes.quotaMessage}>
        {t('qoder_quota.quota_exceeded')}
      </div>
    );
  }

  return <>{nodes}</>;
}
