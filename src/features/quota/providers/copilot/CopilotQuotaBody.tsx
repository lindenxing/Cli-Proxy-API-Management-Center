/**
 * FORK-ADDED: GitHub Copilot 额度渲染体。套餐 chip + 每项额度水位条。
 */

import { useTranslation } from 'react-i18next';
import type { CopilotQuotaState } from '@/types';
import { QuotaMeter } from '../../components/QuotaMeter';
import type { QuotaBodyProps } from '../../types';
import { formatCopilotResetDate } from './data';

export function CopilotQuotaBody({ quota, classes }: QuotaBodyProps<CopilotQuotaState>) {
  const { t } = useTranslation();
  const nodes: React.ReactNode[] = [];

  if (quota.plan) {
    nodes.push(
      <div key="plan" className={classes.codexPlan}>
        <span className={classes.codexPlanLabel}>{t('copilot_quota.plan_label')}</span>
        <span className={classes.codexPlanValue}>{quota.plan}</span>
      </div>
    );
  }

  if (quota.items.length === 0) {
    nodes.push(
      <div key="empty" className={classes.quotaMessage}>
        {t('copilot_quota.empty')}
      </div>
    );
    return <>{nodes}</>;
  }

  const resetLabel = formatCopilotResetDate(quota.resetDate ?? undefined);

  for (const item of quota.items) {
    const percentLabel = item.unlimited ? t('copilot_quota.unlimited') : `${item.percent}%`;
    const amountLabel = item.unlimited
      ? ''
      : `${Math.max(0, item.limit - item.used)}/${item.limit}`;

    nodes.push(
      <div key={item.id} className={classes.quotaRow}>
        <div className={classes.quotaRowHeader}>
          <span className={classes.quotaModel}>{item.label}</span>
          <div className={classes.quotaMeta}>
            <span className={classes.quotaPercent}>{percentLabel}</span>
            {amountLabel && <span className={classes.quotaAmount}>{amountLabel}</span>}
            <span className={classes.quotaReset}>{resetLabel}</span>
          </div>
        </div>
        <QuotaMeter percent={item.unlimited ? 100 : item.percent} classes={classes} />
      </div>
    );
  }

  return <>{nodes}</>;
}
