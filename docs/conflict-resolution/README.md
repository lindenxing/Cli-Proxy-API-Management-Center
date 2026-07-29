# Fork 冲突解决手册

本 fork(lindenxing/Cli-Proxy-API-Management-Center)基于上游
[router-for-me/Cli-Proxy-API-Management-Center](https://github.com/router-for-me/Cli-Proxy-API-Management-Center),
包含两类改动。所有改动均带有统一注释标记,便于合并时定位:

- `// FORK-REMOVED:` — 去除的上游功能(赞助商广告)
- `// FORK-ADDED:` — 新增的功能(Kiro / Copilot / Qoder 额度)

上游有更新时,`.github/workflows/upstream-sync.yml` 会每天自动尝试合并;
冲突时会开 issue,按本目录手册手动解决。

---

## 一、去广告(FORK-REMOVED)

目标:去掉"快速开始"(apikeyFun 赞助商)与"快速填充"推广入口及全部 affiliate 链接。
底层品牌适配器(code0/fennoAI/qiniuCloud/apikeyFun 的数据读写)**保留**,
已配置的供应商仍可正常管理,只是不再有广告入口。

| 文件 | 改动 | 冲突时处理 |
|------|------|-----------|
| `src/router/MainRoutes.tsx` | `/quick-start` 路由改为重定向到 `/ai-providers` | 保留我们的重定向,删除上游对 `ProvidersWorkbenchPage fixedBrand="apikeyFun"` 的引用 |
| `src/components/layout/MainLayout.tsx` | 删除 quickStartNavItem、IconSidebarQuickStart 导入、`config` 订阅 | 上游若改 navGroups 结构,取上游结构后再删 quickStart 项 |
| `src/features/dashboard/DashboardPage.tsx` | 上游 v1.20.0 起仪表盘迁至 `src/features/dashboard/`(旧 `src/pages/DashboardPage.tsx` 已删)。当前上游仪表盘不含赞助商广告,直接采用上游版本即可 | 若上游仪表盘重新引入 quick-start/apikeyFun 卡片,再按 FORK-REMOVED 方式删除 |
| `src/features/providers/ProvidersWorkbenchPage.tsx` | 删除 SponsorQuickStartPanel 分支、quickStartResource、headerTitle 特判 | 取上游后按 FORK-REMOVED 标记重删 |
| `src/features/providers/components/ProviderCategoryList.tsx` | 快速填充 aside 删除;赞助商品牌只在已配置时出现在普通列表 | 保留我们的 `providerGroups` 过滤逻辑 |
| `src/features/providers/components/ProviderResourcePanel.tsx` | 删除全部 affiliate/dashboard 链接与相关导入 | 取上游后重删推广链接 JSX |
| `src/features/providers/components/SponsorQuickStartPanel.*` | **文件已删除** | 上游更新此文件时直接 `git rm` |

i18n 中相关键(`nav.quick_start`、`dashboard.quick_start_*`、`providersPage.sponsor.*` 等)
保留未删,以减小冲突面(未引用的键无副作用)。

## 二、Kiro / GitHub Copilot 额度(FORK-ADDED,移植自 erik6293 fork)

| 文件 | 改动 |
|------|------|
| `src/types/quota.ts` | 文件末尾追加 Kiro*/Copilot* 接口 |
| `src/types/authFile.ts` | `AuthFileType` 增加 `kiro`/`github-copilot`/`qoder` |
| `src/utils/quota/constants.ts` | 末尾追加 KIRO_*/COPILOT_* 常量;TYPE_COLORS 增加 kiro/github-copilot/qoder |
| `src/utils/quota/validators.ts` | 末尾追加 `isKiroFile`/`isCopilotFile`/`isQoderFile` |
| `src/utils/quota/parsers.ts` | 末尾追加 `parseKiroQuotaPayload`/`parseKiroErrorPayload`/`parseCopilotQuotaPayload` |
| `src/stores/useQuotaStore.ts` | 增加 `kiroQuota`/`copilotQuota`/`qoderQuota` 状态与 setter(注意保留上游 `cacheGeneration` 机制) |
| `src/components/quota/quotaConfigs.ts` | 末尾追加 KIRO_CONFIG / COPILOT_CONFIG / QODER_CONFIG(含 fetch/render) |
| `src/components/quota/index.ts` | barrel 导出新增三个 CONFIG |
| `src/pages/QuotaPage.tsx` | 追加三个 `<QuotaSection>` |
| `src/features/authFiles/constants.ts` | `QuotaProviderType`/`QUOTA_PROVIDER_TYPES`/TYPE_COLORS 增加三类 |
| `src/features/authFiles/components/AuthFileQuotaSection.tsx` | getQuotaConfig/quota selector/setter 增加三类分支 |
| `src/features/authFiles/components/AuthFileCard.tsx` | providerCardClass 增加 kiroCard/copilotCard/qoderCard |
| `src/pages/QuotaPage.module.scss` | kiroGrid/copilotGrid/qoderGrid + 卡片渐变 |
| `src/pages/AuthFilesPage.module.scss` | kiroCard/copilotCard/qoderCard 渐变 |
| `src/i18n/locales/*.json`(4 个) | `filter_kiro`/`filter_github-copilot`/`filter_qoder` + `kiro_quota`/`copilot_quota`/`qoder_quota` 段 |

冲突解决通用原则:**改动都在文件末尾或 switch/映射的追加分支**。
上游改了同一文件时,先接受上游版本,再按 FORK-ADDED 标记把我们的追加块补回去。

## 三、Qoder 额度(FORK-ADDED,移植自 kaitranntt fork)

Qoder 额度不发起 API 请求,直接读取认证文件里的 `usage` 快照
(`QoderUsageSnapshot`),需要后端为 kaitranntt 的 CLIProxyAPI fork。
文件清单已并入上表。

## 三点五、WorkBuddy / QoderWork 插件积分(FORK-ADDED,对接 Sliverkiss/cpa-plugin)

依赖后端安装对应插件(workbuddy / qoderwork),前端通过插件管理端点查询:
`GET /v0/management/plugins/<id>/credits?auth_index=<idx>`。

| 文件 | 改动 |
|------|------|
| `src/services/api/pluginCredits.ts` | **新文件**:pluginCreditsApi.getAccount(归一化 accounts[0]) |
| `src/services/api/index.ts` | barrel 导出 pluginCredits |
| `src/types/quota.ts` | 末尾追加 PluginCredits* 类型 |
| `src/utils/quota/validators.ts` | isWorkBuddyFile / isQoderWorkFile(provider 或文件名前缀) |
| `src/utils/quota/constants.ts` | TYPE_COLORS 增加 workbuddy/qoderwork |
| `src/stores/useQuotaStore.ts` | workbuddyQuota / qoderworkQuota 状态槽 |
| `src/components/quota/quotaConfigs.ts` | buildPluginCreditsConfig 工厂 + WORKBUDDY_CONFIG / QODERWORK_CONFIG(仅总览进度条,无分包明细) |
| `src/pages/QuotaPage.tsx` | 追加两个 Section |
| `src/pages/QuotaPage.module.scss` | workbuddyGrid/qoderworkGrid + 卡片渐变 |
| `src/i18n/locales/*.json` | plugin_credits_quota / workbuddy_quota / qoderwork_quota 段 + filter 标签 |

注意:未安装插件时 credits 端点 404 → 卡片显示错误;无认证文件时显示空状态卡片(按用户要求)。

## 四、上游同步流程

```bash
# 手动同步(自动化失败时)
git fetch upstream main
git merge upstream/main
# 解决冲突(参考上表)
bun run verify
git push origin main
```

语义冲突高发点:
1. `useQuotaStore` — 上游若新增 provider 或改 `clearQuotaCache` 签名,同步修改我们的三个新键
2. `QuotaConfig` 接口 — 上游若加新必填字段(如 `cardIdleMessageKey`),三个新 CONFIG 也要补
3. `AuthFileQuotaSection` — 上游若重构 quota 分发逻辑(如改为映射表),将三类并入新结构
