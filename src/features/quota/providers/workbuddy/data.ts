/**
 * FORK-ADDED: WorkBuddy 插件积分数据层。
 */

import type { PluginCreditsQuotaData, PluginCreditsQuotaState } from '@/types';
import { isWorkBuddyFile, isDisabledAuthFile } from '@/utils/quota';
import type { QuotaProviderData } from '../types';
import {
  fetchPluginCreditsQuota,
  buildPluginCreditsLoadingState,
  buildPluginCreditsSuccessState,
  buildPluginCreditsErrorState,
} from '../pluginCredits/shared';

export const WORKBUDDY_CONFIG: QuotaProviderData<PluginCreditsQuotaState, PluginCreditsQuotaData> = {
  type: 'workbuddy',
  i18nPrefix: 'workbuddy_quota',
  filterFn: (file) => isWorkBuddyFile(file) && !isDisabledAuthFile(file),
  fetchQuota: (file, t) => fetchPluginCreditsQuota('workbuddy', file, t),
  storeSelector: (state) => state.workbuddyQuota,
  storeSetter: 'setWorkbuddyQuota',
  buildLoadingState: buildPluginCreditsLoadingState,
  buildSuccessState: buildPluginCreditsSuccessState,
  buildErrorState: buildPluginCreditsErrorState,
};

export { PluginCreditsBody as WorkBuddyQuotaBody } from '../pluginCredits/PluginCreditsBody';
