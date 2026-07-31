/**
 * FORK-ADDED: 插件积分共享渲染体(WorkBuddy / QoderWork)。
 * 仅总览进度条:套餐/区域 chip + 剩余/池水位条 + 耗尽提示。
 */

import { useTranslation } from 'react-i18next';
import type { PluginCreditsQuotaState } from '@/types';
import { QuotaMeter } from '../../components/QuotaMeter';
import type { QuotaBodyProps } from '../../types';
import { formatPluginCreditsFetchedAt } from './shared';

export function PluginCreditsBody({ quota, classes }: QuotaBodyProps<PluginCreditsQuotaState>) {
  const { t } = useTranslation();
  const data = quota.data ?? null;

  if (!data) {
    return <div className={classes.quotaMessage}>{t('plugin_credits_quota.empty_data')}</div>;
  }

  const remain = data.remain ?? 0;
  const used = data.used ?? 0;
  // Pool: prefer size; fall back to remain+used. Check-in packs grow the pool.
  const pool = data.size && data.size > 0 ? data.size : remain + used;
  const hasSignal = remain > 0 || used > 0 || pool > 0;

  const metaChips: React.ReactNode[] = [];
  if (data.plan) {
    metaChips.push(
      <span key="plan" className={classes.codexPlanItem}>
        <span className={classes.codexPlanLabel}>{t('plugin_credits_quota.plan_label')}</span>
        <span className={classes.codexPlanValue}>{data.plan}</span>
      </span>
    );
  }
  if (data.region) {
    metaChips.push(
      <span key="region" className={classes.codexPlanItem}>
        <span className={classes.codexPlanLabel}>{t('plugin_credits_quota.region_label')}</span>
        <span className={classes.codexPlanValue}>{data.region.toUpperCase()}</span>
      </span>
    );
  }

  const nodes: React.ReactNode[] = [];
  if (metaChips.length > 0) {
    nodes.push(
      <div key="meta" className={classes.codexPlan}>
        {metaChips}
      </div>
    );
  }

  if (!hasSignal) {
    nodes.push(
      <div key="empty" className={classes.quotaMessage}>
        {t('plugin_credits_quota.empty_data')}
      </div>
    );
    return <>{nodes}</>;
  }

  const percent = pool > 0 ? Math.max(0, Math.min(100, Math.round((remain / pool) * 100))) : 0;
  const fetchedLabel = formatPluginCreditsFetchedAt(data.fetchedAt);

  nodes.push(
    <div key="credits" className={classes.quotaRow}>
      <div className={classes.quotaRowHeader}>
        <span className={classes.quotaModel}>{t('plugin_credits_quota.credits_label')}</span>
        <div className={classes.quotaMeta}>
          <span className={classes.quotaPercent}>{`${percent}%`}</span>
          <span className={classes.quotaAmount}>{`${remain} / ${pool}`}</span>
          {fetchedLabel && (
            <span className={classes.quotaReset}>
              {t('plugin_credits_quota.fetched_at', { time: fetchedLabel })}
            </span>
          )}
        </div>
      </div>
      <QuotaMeter percent={percent} classes={classes} />
    </div>
  );

  if (data.exhausted) {
    nodes.push(
      <div key="exhausted" className={classes.quotaMessage}>
        {t('plugin_credits_quota.exhausted')}
      </div>
    );
  }

  return <>{nodes}</>;
}
