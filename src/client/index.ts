import remoteContribution from './remote.js'

declare global {
  interface Window {
    __ModuleLoader__: {
      load(definition: { id: string; factory(require: (id: string) => any): unknown }): void
    }
  }
}

window.__ModuleLoader__.load({
  id: '@local/agent-bridge',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const css = `
.agent-bridge{color:var(--dsw-alias-label-primary);max-width:1160px;margin:0 auto;padding:20px 24px 40px;font-size:14px;line-height:1.45}.agent-bridge *{box-sizing:border-box}
.agent-bridge__header{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding:4px 0 20px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.agent-bridge__identity{min-width:0}.agent-bridge__title-row{display:flex;align-items:center;gap:10px}.agent-bridge__title{margin:0;font-size:22px;font-weight:600;line-height:30px;letter-spacing:-.015em}.agent-bridge__version{color:var(--dsw-alias-label-secondary);font-size:12px;font-variant-numeric:tabular-nums}
.agent-bridge__subtitle{max-width:650px;margin:4px 0 0;color:var(--dsw-alias-label-secondary);font-size:13px}
.agent-bridge__actions{display:flex;align-items:center;gap:8px;flex:none}.agent-bridge__button{min-height:36px;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;padding:7px 13px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-weight:500;cursor:pointer;white-space:nowrap}.agent-bridge__button:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}.agent-bridge__button:active:not(:disabled){transform:translateY(1px)}.agent-bridge__button:focus-visible,.agent-bridge__tab:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.agent-bridge__button--primary{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base)}.agent-bridge__button--primary:hover:not(:disabled){filter:brightness(.94)}.agent-bridge__button:disabled{opacity:.45;cursor:not-allowed}
.agent-bridge__health{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:12px 0;border-bottom:1px solid var(--dsw-alias-border-l1)}.agent-bridge__health-main{display:flex;align-items:center;gap:9px;min-width:0}.agent-bridge__health-title{font-weight:500}.agent-bridge__health-copy{color:var(--dsw-alias-label-secondary);font-size:12px}.agent-bridge__dot{width:8px;height:8px;border-radius:50%;flex:none;background:var(--dsw-alias-state-idle-primary)}.agent-bridge__dot[data-state=success]{background:var(--dsw-alias-state-success-primary)}.agent-bridge__dot[data-state=partial]{background:var(--dsw-alias-state-warn-primary)}.agent-bridge__dot[data-state=error]{background:var(--dsw-alias-state-error-primary)}.agent-bridge__error{margin:0;color:var(--dsw-alias-state-error-primary);font-size:12px}
.agent-bridge__tabs{display:flex;gap:24px;height:45px;border-bottom:1px solid var(--dsw-alias-border-l1)}.agent-bridge__tab{position:relative;border:0;padding:0 1px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-weight:500;cursor:pointer}.agent-bridge__tab[aria-selected=true]{color:var(--dsw-alias-label-primary)}.agent-bridge__tab[aria-selected=true]:after{content:'';position:absolute;right:0;bottom:-1px;left:0;height:2px;background:var(--dsw-alias-brand-primary)}
.agent-bridge__panel{padding-top:22px}.agent-bridge__section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:12px}.agent-bridge__section-title{margin:0;font-size:15px;font-weight:600}.agent-bridge__section-copy{margin:3px 0 0;color:var(--dsw-alias-label-secondary);font-size:12px}.agent-bridge__meta{color:var(--dsw-alias-label-secondary);font-size:12px;font-variant-numeric:tabular-nums}
.agent-bridge__summary{display:flex;align-items:center;gap:0;margin:0 0 18px;border-top:1px solid var(--dsw-alias-border-l1);border-bottom:1px solid var(--dsw-alias-border-l1)}.agent-bridge__metric{min-width:116px;padding:11px 18px 11px 0}.agent-bridge__metric+.agent-bridge__metric{padding-left:18px;border-left:1px solid var(--dsw-alias-border-l1)}.agent-bridge__metric-value{display:block;font-size:18px;font-weight:600;font-variant-numeric:tabular-nums}.agent-bridge__metric-label{color:var(--dsw-alias-label-secondary);font-size:11px}
.agent-bridge__table-wrap{overflow:auto;border-top:1px solid var(--dsw-alias-border-l2);border-bottom:1px solid var(--dsw-alias-border-l1)}.agent-bridge__table{width:100%;border-collapse:collapse;font-size:13px}.agent-bridge__table th{padding:9px 10px;text-align:left;color:var(--dsw-alias-label-secondary);font-size:11px;font-weight:500;letter-spacing:.015em;white-space:nowrap}.agent-bridge__table td{padding:10px;border-top:1px solid var(--dsw-alias-border-l1);vertical-align:top}.agent-bridge__table tbody tr:hover{background:var(--dsw-alias-bg-layer-1)}.agent-bridge__table td:first-child,.agent-bridge__table th:first-child{padding-left:0}.agent-bridge__table td:last-child,.agent-bridge__table th:last-child{padding-right:0}
.agent-bridge__source{font-weight:500}.agent-bridge__secondary{color:var(--dsw-alias-label-secondary)}.agent-bridge__mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;font-variant-numeric:tabular-nums}.agent-bridge__badge{display:inline-flex;align-items:center;min-height:22px;border:1px solid var(--dsw-alias-border-l1);border-radius:5px;padding:2px 7px;color:var(--dsw-alias-label-secondary);font-size:11px;font-weight:500;white-space:nowrap}.agent-bridge__badge[data-tone=success]{border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 36%,transparent);color:var(--dsw-alias-state-success-primary)}.agent-bridge__badge[data-tone=warn]{border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 38%,transparent);color:var(--dsw-alias-state-warn-primary)}.agent-bridge__badge[data-tone=error]{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 38%,transparent);color:var(--dsw-alias-state-error-primary)}
.agent-bridge__plan-tools{display:flex;align-items:center;gap:10px}.agent-bridge__freshness{font-size:12px}.agent-bridge__freshness[data-valid=true]{color:var(--dsw-alias-state-success-primary)}.agent-bridge__freshness[data-valid=false]{color:var(--dsw-alias-state-error-primary)}
.agent-bridge__empty{display:flex;min-height:190px;align-items:center;justify-content:center;border-top:1px solid var(--dsw-alias-border-l1);border-bottom:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);text-align:center}.agent-bridge__empty-inner{max-width:420px}.agent-bridge__empty-title{display:block;margin-bottom:4px;color:var(--dsw-alias-label-primary);font-weight:500}
@media(max-width:760px){.agent-bridge{padding:16px 16px 32px}.agent-bridge__header{display:block}.agent-bridge__actions{margin-top:14px}.agent-bridge__health{display:block}.agent-bridge__error{margin-top:6px}.agent-bridge__tabs{gap:18px}.agent-bridge__section-head{display:block}.agent-bridge__plan-tools{margin-top:10px}.agent-bridge__summary{overflow:auto}.agent-bridge__metric{min-width:105px}.agent-bridge__table thead{display:none}.agent-bridge__table tr{display:block;padding:9px 0;border-top:1px solid var(--dsw-alias-border-l1)}.agent-bridge__table tbody tr:first-child{border-top:0}.agent-bridge__table td{display:grid;grid-template-columns:100px minmax(0,1fr);gap:12px;border:0;padding:4px 0}.agent-bridge__table td:before{content:attr(data-label);color:var(--dsw-alias-label-secondary);font-size:11px}.agent-bridge__table-wrap{overflow:visible}}
@media(prefers-reduced-motion:reduce){.agent-bridge__button:active:not(:disabled){transform:none}}
`
    const dictionaries = {
      en: {
        title: 'Agent Bridge', subtitle: 'Portable agent environments, reviewed before they enter DSH.', scan: 'Scan sources', scanning: 'Scanning…', plan: 'Generate plan', planning: 'Planning…', validate: 'Check freshness',
        overview: 'Overview', import: 'Import plan', activity: 'Activity', phase: 'Plan-only mode', detail: 'Reads source environments and stores reviewable plans. Nothing is applied to DSH.',
        empty: 'No source snapshot', emptyHint: 'Scan Claude Code and Codex to build a migration inventory.', noPlan: 'No import plan', noPlanHint: 'Scan sources, then generate a plan to review every proposed change.',
        source: 'Source', category: 'Category', target: 'Target', compatibility: 'Compatibility', result: 'Result', time: 'Time', state: 'State', action: 'Action', risk: 'Risk', reason: 'Reason',
        endpoints: 'Endpoint health', endpointsHint: 'Availability and versions detected during the latest scan.', inventory: 'Migration inventory', inventoryHint: 'Portable items grouped by source and DSH target.', planTitle: 'Proposed operations', planHint: 'Nothing below will execute until a later phase adds an approved apply flow.', activityTitle: 'Recent activity', activityHint: 'Read-only scans and plan generation history.',
        operations: 'Operations', blockers: 'Blockers', conflicts: 'Conflicts', proposed: 'Ready', digest: 'Plan', fresh: 'Fresh', expired: 'Expired', unavailable: 'Host Remote is unavailable. Verify that the DSH API Gateway composed this plugin.',
      },
      zh: {
        title: 'Agent Bridge', subtitle: '可移植的 Agent 环境，进入 DSH 前逐项审阅。', scan: '扫描来源', scanning: '扫描中…', plan: '生成计划', planning: '计划生成中…', validate: '检查新鲜度',
        overview: '概览', import: '导入计划', activity: '活动', phase: '仅计划模式', detail: '只读取来源环境并保存可审阅计划，不会向 DSH 应用任何内容。',
        empty: '尚无来源快照', emptyHint: '扫描 Claude Code 与 Codex，建立迁移清单。', noPlan: '尚无导入计划', noPlanHint: '先扫描来源，再生成计划以逐项审阅变更。',
        source: '来源', category: '类别', target: '目标', compatibility: '兼容性', result: '结果', time: '时间', state: '状态', action: '动作', risk: '风险', reason: '原因',
        endpoints: '端点健康', endpointsHint: '最近一次扫描检测到的可用性与版本。', inventory: '迁移清单', inventoryHint: '按来源和 DSH 目标整理的可移植内容。', planTitle: '拟议操作', planHint: '后续阶段增加审批执行闭环前，以下内容均不会实际应用。', activityTitle: '近期活动', activityHint: '只读扫描与计划生成记录。',
        operations: '操作数', blockers: '阻塞', conflicts: '冲突', proposed: '待审阅', digest: '计划', fresh: '未过期', expired: '已过期', unavailable: 'Host Remote 不可用，请确认 DSH API Gateway 已组合本插件。',
      },
    }
    type Copy = typeof dictionaries.en

    function Page() {
      const locale = useLocale()
      const copy: Copy = locale.startsWith('zh') ? dictionaries.zh : dictionaries.en
      const [tab, setTab] = React.useState('overview')
      const [overview, setOverview] = React.useState(undefined as any)
      const [loading, setLoading] = React.useState(true)
      const [scanning, setScanning] = React.useState(false)
      const [planning, setPlanning] = React.useState(false)
      const [validation, setValidation] = React.useState(undefined as any)
      const [error, setError] = React.useState('')

      const load = React.useCallback(async () => {
        try {
          setError('')
          setOverview(await remoteCall('overview'))
        } catch {
          setError(copy.unavailable)
        } finally {
          setLoading(false)
        }
      }, [copy.unavailable])
      React.useEffect(() => { void load() }, [load])

      const scan = async () => {
        setScanning(true); setError(''); setValidation(undefined)
        try { await remoteCall('scan', {}); await load() }
        catch (reason) { setError(reason instanceof Error ? reason.message : copy.unavailable) }
        finally { setScanning(false) }
      }
      const generatePlan = async () => {
        if (!overview?.snapshot) return
        setPlanning(true); setError(''); setValidation(undefined)
        try { await remoteCall('generatePlan', { scanRevision: overview.snapshot.revision }); await load(); setTab('import') }
        catch (reason) { setError(reason instanceof Error ? reason.message : copy.unavailable) }
        finally { setPlanning(false) }
      }
      const validatePlan = async () => {
        if (!overview?.latestPlan) return
        setValidation(await remoteCall('validatePlan', { planId: overview.latestPlan.id }))
      }

      const snapshot = overview?.snapshot
      const phaseState = snapshot?.state ?? 'idle'
      const tabs = [['overview', copy.overview], ['import', copy.import], ['activity', copy.activity]]
      return h('main', { className: 'agent-bridge', 'aria-labelledby': 'agent-bridge-title' },
        h('header', { className: 'agent-bridge__header' },
          h('div', { className: 'agent-bridge__identity' },
            h('div', { className: 'agent-bridge__title-row' }, h('h1', { id: 'agent-bridge-title', className: 'agent-bridge__title' }, copy.title), h('span', { className: 'agent-bridge__version' }, 'Phase 1')),
            h('p', { className: 'agent-bridge__subtitle' }, copy.subtitle)),
          h('div', { className: 'agent-bridge__actions' },
            h('button', { className: 'agent-bridge__button', type: 'button', disabled: scanning, onClick: scan }, scanning ? copy.scanning : copy.scan),
            h('button', { className: 'agent-bridge__button agent-bridge__button--primary', type: 'button', disabled: planning || !snapshot, onClick: generatePlan }, planning ? copy.planning : copy.plan))),
        h('div', { className: 'agent-bridge__health', 'aria-live': 'polite' },
          h('div', { className: 'agent-bridge__health-main' }, h('span', { className: 'agent-bridge__dot', 'data-state': phaseState, 'aria-hidden': true }), h('span', { className: 'agent-bridge__health-title' }, copy.phase), h('span', { className: 'agent-bridge__health-copy' }, copy.detail)),
          error ? h('p', { className: 'agent-bridge__error', role: 'alert' }, error) : h('span', { className: 'agent-bridge__meta' }, snapshot ? formatTime(snapshot.completedAt) : '—')),
        h('nav', { className: 'agent-bridge__tabs', role: 'tablist', 'aria-label': copy.title },
          ...tabs.map(([id, label]) => h('button', { key: id, className: 'agent-bridge__tab', role: 'tab', type: 'button', 'aria-selected': tab === id, onClick: () => setTab(id) }, label))),
        h('section', { className: 'agent-bridge__panel', role: 'tabpanel', tabIndex: 0 }, renderPanel(h, tab, copy, overview, loading, validation, validatePlan)))
    }

    function useLocale(): string {
      const [locale, setLocale] = React.useState(() => localeService?.getLocale?.().id ?? navigator.language ?? 'en')
      React.useEffect(() => localeService?.subscribe?.(() => setLocale(localeService.getLocale().id)), [])
      return locale
    }

    let ctxRef: any
    let localeService: any
    async function remoteCall(method: string, payload?: unknown): Promise<any> {
      const namespace = ctxRef?.remote?.agentBridge
      if (!namespace || typeof namespace[method] !== 'function') throw new Error('agent-bridge/remote-unavailable')
      const result = payload === undefined ? await namespace[method]() : await namespace[method](payload)
      if (result?.ok === false) throw new Error(result.error?.message ?? 'agent-bridge/remote-error')
      return result?.ok === true ? result.value : result
    }

    function renderPanel(h: any, tab: string, copy: Copy, overview: any, loading: boolean, validation: any, validatePlan: () => void): unknown {
      if (loading) return emptyState(h, '…', '')
      if (tab === 'activity') return renderActivity(h, copy, overview?.activities ?? [])
      const snapshot = overview?.snapshot
      if (!snapshot) return emptyState(h, copy.empty, copy.emptyHint)
      if (tab === 'overview') return renderOverview(h, copy, snapshot)
      return renderPlan(h, copy, overview?.latestPlan, validation, validatePlan)
    }

    function renderOverview(h: any, copy: Copy, snapshot: any): unknown {
      const portable = snapshot.artifacts.filter((item: any) => item.compatibility.level === 'native' || item.compatibility.level === 'adapted').length
      const blocked = snapshot.artifacts.length - portable
      return h('div', null,
        sectionHead(h, copy.endpoints, copy.endpointsHint, `${snapshot.endpoints.length}`),
        table(h, [copy.source, copy.result], snapshot.endpoints.map((item: any) => [
          h('span', { className: 'agent-bridge__source' }, endpointLabel(item.id)),
          h('span', null, badge(h, item.state, toneFor(item.state)), item.version ? h('span', { className: 'agent-bridge__secondary' }, `  ${item.version}`) : null),
        ])),
        h('div', { style: { height: 28 } }),
        sectionHead(h, copy.inventory, copy.inventoryHint, `${snapshot.artifacts.length}`),
        summary(h, [[snapshot.artifacts.length, copy.operations], [portable, copy.proposed], [blocked, copy.blockers]]),
        table(h, [copy.source, copy.category, copy.target, copy.compatibility], snapshot.artifacts.map((item: any) => [
          h('span', { className: 'agent-bridge__source' }, endpointLabel(item.artifact.source.endpointId)),
          item.artifact.identity.logicalName,
          h('span', { className: 'agent-bridge__mono' }, item.compatibility.targetKind ?? '—'),
          badge(h, item.compatibility.level, toneFor(item.compatibility.level)),
        ])))
    }

    function renderPlan(h: any, copy: Copy, plan: any, validation: any, validatePlan: () => void): unknown {
      if (!plan) return emptyState(h, copy.noPlan, copy.noPlanHint)
      const conflicts = plan.operations.filter((item: any) => item.state === 'conflict').length
      const proposed = plan.operations.filter((item: any) => item.state === 'proposed').length
      return h('div', null,
        h('div', { className: 'agent-bridge__section-head' },
          h('div', null, h('h2', { className: 'agent-bridge__section-title' }, copy.planTitle), h('p', { className: 'agent-bridge__section-copy' }, copy.planHint)),
          h('div', { className: 'agent-bridge__plan-tools' },
            validation ? h('span', { className: 'agent-bridge__freshness', 'data-valid': String(validation.valid), role: 'status' }, validation.valid ? copy.fresh : `${copy.expired} · ${validation.reasons.join(', ')}`) : null,
            h('button', { className: 'agent-bridge__button', type: 'button', onClick: validatePlan }, copy.validate))),
        summary(h, [[plan.operations.length, copy.operations], [proposed, copy.proposed], [conflicts, copy.conflicts], [plan.blockers.length, copy.blockers]]),
        h('p', { className: 'agent-bridge__meta' }, `${copy.digest} ${plan.digest.slice(0, 12)} · ${formatTime(plan.createdAt)}`),
        table(h, [copy.source, copy.category, copy.target, copy.state, copy.action, copy.risk, copy.reason], plan.operations.map((item: any) => [
          endpointLabel(item.sourceEndpointId), item.artifactIdentity.logicalName, h('span', { className: 'agent-bridge__mono' }, item.targetEnvironmentId), badge(h, item.state, toneFor(item.state)), item.action, badge(h, item.risk, toneFor(item.risk)), h('span', { className: 'agent-bridge__secondary' }, item.reasons.join(', ') || '—'),
        ])))
    }

    function renderActivity(h: any, copy: Copy, rows: any[]): unknown {
      if (!rows.length) return emptyState(h, copy.activityTitle, copy.activityHint)
      return h('div', null, sectionHead(h, copy.activityTitle, copy.activityHint, `${rows.length}`), table(h, [copy.time, copy.result], rows.map((row: any) => [formatTime(row.startedAt), h('span', null, badge(h, row.state, toneFor(row.state)), ` ${row.summary}`)])))
    }

    function sectionHead(h: any, title: string, description: string, meta?: string): unknown {
      return h('div', { className: 'agent-bridge__section-head' }, h('div', null, h('h2', { className: 'agent-bridge__section-title' }, title), h('p', { className: 'agent-bridge__section-copy' }, description)), meta ? h('span', { className: 'agent-bridge__meta' }, meta) : null)
    }
    function summary(h: any, items: Array<[number, string]>): unknown { return h('div', { className: 'agent-bridge__summary' }, ...items.map(([value, label]) => h('div', { className: 'agent-bridge__metric', key: label }, h('span', { className: 'agent-bridge__metric-value' }, String(value)), h('span', { className: 'agent-bridge__metric-label' }, label)))) }
    function emptyState(h: any, title: string, hint: string): unknown { return h('div', { className: 'agent-bridge__empty' }, h('div', { className: 'agent-bridge__empty-inner' }, h('span', { className: 'agent-bridge__empty-title' }, title), hint ? h('span', null, hint) : null)) }
    function badge(h: any, label: string, tone: string): unknown { return h('span', { className: 'agent-bridge__badge', 'data-tone': tone }, label) }
    function toneFor(value: string): string { if (['success', 'native', 'proposed', 'low'].includes(value)) return 'success'; if (['partial', 'adapted', 'conflict', 'medium', 'high'].includes(value)) return 'warn'; if (['error', 'blocked', 'forbidden'].includes(value)) return 'error'; return 'neutral' }
    function endpointLabel(value: string): string { return value === 'claude-code' ? 'Claude Code' : value === 'codex' ? 'Codex' : value === 'dsh' ? 'DSH' : value }
    function formatTime(value: string): string { try { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) } catch { return value } }

    function table(h: any, headers: string[], rows: unknown[][]): unknown {
      return h('div', { className: 'agent-bridge__table-wrap' }, h('table', { className: 'agent-bridge__table' },
        h('thead', null, h('tr', null, ...headers.map((header) => h('th', { key: header, scope: 'col' }, header)))),
        h('tbody', null, ...rows.map((row, index) => h('tr', { key: index }, ...row.map((cell, cellIndex) => h('td', { key: cellIndex, 'data-label': headers[cellIndex] }, cell)))))))
    }

    function injectStyle(text: string): () => void {
      const tag = document.createElement('style')
      tag.dataset.plugin = '@local/agent-bridge'
      tag.textContent = text
      document.head.appendChild(tag)
      return () => tag.remove()
    }

    return {
      inject: ['slots', 'remote'],
      async apply(ctx: any) {
        const disposeRemote = await ctx.remote.$mount(remoteContribution)
        const disposeRemoteView = ctx.effect(() => ctx.inject(['remote.agentBridge'], (remoteCtx: any) => {
          ctxRef = remoteCtx
          localeService = remoteCtx.get?.('locale')
          const disposeStyle = injectStyle(css)
          const disposeSlot = remoteCtx.slots.inject('settings.section', () => remoteCtx.slots.register({ name: 'settings.section', id: 'agent-bridge', order: 17, label: 'Agent Bridge' }, Page))
          return () => { disposeSlot?.(); disposeStyle(); ctxRef = undefined; localeService = undefined }
        }), 'agent-bridge: remote view')
        return async () => { await disposeRemoteView(); await disposeRemote() }
      },
    }
  },
})

export {}
