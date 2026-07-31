/**
 * FORK-ADDED: Kiro 额度渲染体。订阅类型 chip + 基础额度水位条 + 免费试用(仅进行中)。
 */

import { useTranslation } from 'react-i18next';
import type { KiroQuotaState } from '@/types';
import { QuotaMeter } from '../../components/QuotaMeter';
import type { QuotaBodyProps } from '../../types';
import { formatKiroResetTime } from './data';

export function KiroQuotaBody({ quota, classes }: QuotaBodyProps<KiroQuotaState>) {
  const { t } = useTranslation();
  const nodes: React.ReactNode[] = [];

  if (quota.subscriptionTitle) {
    nodes.push(
      <div key="subscription" className={classes.codexPlan}>
        <span className={classes.codexPlanLabel}>{t('kiro_quota.subscription_label')}</span>
        <span className={classes.codexPlanValue}>{quota.subscriptionTitle}</span>
      </div>
    );
  }

  if (quota.baseQuota) {
    const { used, limit, resetTime } = quota.baseQuota;
    const remaining = Math.max(0, limit - used);
    const percent = limit > 0 ? Math.round((remaining / limit) * 100) : 0;

    nodes.push(
      <div key="base" className={classes.quotaRow}>
        <div className={classes.quotaRowHeader}>
          <span className={classes.quotaModel}>{t('kiro_quota.base_quota')}</span>
          <div className={classes.quotaMeta}>
            <span className={classes.quotaPercent}>{`${percent}%`}</span>
            <span className={classes.quotaAmount}>{`${remaining.toFixed(1)}/${limit}`}</span>
            <span className={classes.quotaReset}>{formatKiroResetTime(resetTime)}</span>
          </div>
        </div>
        <QuotaMeter percent={percent} classes={classes} />
      </div>
    );
  }

  // FORK-TWEAK: hide the free-trial row entirely once the trial has expired.
  if (quota.freeTrialQuota) {
    const { used, limit, expiry, status } = quota.freeTrialQuota;
    if (status.toUpperCase() === 'ACTIVE') {
      const remaining = Math.max(0, limit - used);
      const percent = limit > 0 ? Math.round((remaining / limit) * 100) : 0;
      const statusLabel = t('kiro_quota.trial_active');

      nodes.push(
        <div key="trial" className={classes.quotaRow}>
          <div className={classes.quotaRowHeader}>
            <span className={classes.quotaModel}>{`${t('kiro_quota.free_trial')} (${statusLabel})`}</span>
            <div className={classes.quotaMeta}>
              <span className={classes.quotaPercent}>{`${percent}%`}</span>
              <span className={classes.quotaAmount}>{`${remaining.toFixed(1)}/${limit}`}</span>
              <span className={classes.quotaReset}>{formatKiroResetTime(expiry)}</span>
            </div>
          </div>
          <QuotaMeter percent={percent} classes={classes} />
        </div>
      );
    }
  }

  if (nodes.length === 0) {
    return <div className={classes.quotaMessage}>{t('kiro_quota.empty')}</div>;
  }

  return <>{nodes}</>;
}
