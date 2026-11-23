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
        title: 'Agent Bridge', subtitle: 'Portable agent environments, reviewed before they enter DSH.', scan: 'Scan sources', scanning: 'Scanning…', plan: 'Generate plan', planning: 'Planning…', validate: 'Check freshness', execute: 'Execute approved changes', executing: 'Executing…', confirm: 'I reviewed this immutable plan and approve its proposed operations.', environments: 'Environments', disable: 'Disable', rollback: 'Rollback',
        overview: 'Overview', import: 'Import plan', environmentsTab: 'Environments', projectsTab: 'Projects', activity: 'Activity', phase: 'Review before apply', detail: 'Scans are read-only. DSH changes require a fresh plan and explicit approval.',
        empty: 'No source snapshot', emptyHint: 'Scan Claude Code and Codex to build a migration inventory.', noPlan: 'No import plan', noPlanHint: 'Scan sources, then generate a plan to review every proposed change.',
        source: 'Source', category: 'Item', target: 'DSH target', compatibility: 'Support', result: 'Result', time: 'Time', state: 'Status', action: 'Action', risk: 'Risk', reason: 'Explanation',
        endpoints: 'Endpoint health', endpointsHint: 'Availability and versions detected during the latest scan.', inventory: 'Migration inventory', inventoryHint: 'Portable items grouped by source and DSH target.', planTitle: 'Proposed operations', planHint: 'Review every change, conflict, and risk before explicitly approving execution.', activityTitle: 'Recent activity', activityHint: 'Scans, import runs, verification, and rollback history.',
        operations: 'Operations', blockers: 'Blockers', conflicts: 'Conflicts', proposed: 'Ready', digest: 'Plan', fresh: 'Fresh', expired: 'Expired', unavailable: 'Host Remote is unavailable. Verify that the DSH API Gateway composed this plugin.',
      },
      zh: {
        title: 'Agent Bridge', subtitle: '可移植的 Agent 环境，进入 DSH 前逐项审阅。', scan: '扫描来源', scanning: '扫描中…', plan: '生成计划', planning: '计划生成中…', validate: '检查新鲜度', execute: '执行已批准变更', executing: '执行中…', confirm: '我已审阅此不可变计划，并批准其中的拟议操作。', environments: '环境', disable: '停用', rollback: '回滚',
        overview: '概览', import: '导入计划', environmentsTab: '环境', projectsTab: '项目', activity: '活动', phase: '审阅后应用', detail: '扫描保持只读；只有未过期的计划经明确批准后才会修改 DSH。',
        empty: '尚无来源快照', emptyHint: '扫描 Claude Code 与 Codex，建立迁移清单。', noPlan: '尚无导入计划', noPlanHint: '先扫描来源，再生成计划以逐项审阅变更。',
        source: '来源', category: '内容', target: 'DSH 目标', compatibility: '支持情况', result: '结果', time: '时间', state: '状态', action: '操作', risk: '风险', reason: '说明',
        endpoints: '端点健康', endpointsHint: '最近一次扫描检测到的可用性与版本。', inventory: '迁移清单', inventoryHint: '按来源和 DSH 目标整理的可移植内容。', planTitle: '拟议操作', planHint: '执行前逐项审阅变更、冲突和风险，并明确批准。', activityTitle: '近期活动', activityHint: '扫描、导入、验证和回滚记录。',
        operations: '操作数', blockers: '阻塞', conflicts: '冲突', proposed: '待审阅', digest: '计划', fresh: '未过期', expired: '已过期', unavailable: 'Host Remote 不可用，请确认 DSH API Gateway 已组合本插件。',
      },
    }
    type Copy = typeof dictionaries.en

    function Page(props: any) {
      const locale = useLocale()
      const copy: Copy = locale.startsWith('zh') ? dictionaries.zh : dictionaries.en
      const [tab, setTab] = React.useState('overview')
      const [overview, setOverview] = React.useState(undefined as any)
      const [loading, setLoading] = React.useState(true)
      const [scanning, setScanning] = React.useState(false)
      const [planning, setPlanning] = React.useState(false)
      const [validation, setValidation] = React.useState(undefined as any)
      const [confirmed, setConfirmed] = React.useState(false)
      const [executing, setExecuting] = React.useState(false)
      const [environments, setEnvironments] = React.useState([] as any[])
      const [runs, setRuns] = React.useState([] as any[])
      const [projectSnapshot, setProjectSnapshot] = React.useState(undefined as any)
      const [projectLinks, setProjectLinks] = React.useState([] as any[])
      const workspaceSnapshot = props.useWorkspaces ? props.useWorkspaces((snapshot: any) => snapshot) : { items: [] }
      const [selectedWorkspaceId, setSelectedWorkspaceId] = React.useState('')
      React.useEffect(() => {
        if (!selectedWorkspaceId && workspaceSnapshot.items?.length) setSelectedWorkspaceId(workspaceSnapshot.items[0].workspaceId)
      }, [selectedWorkspaceId, workspaceSnapshot])
      const [error, setError] = React.useState('')

      const load = React.useCallback(async () => {
        try {
          setError('')
          const [nextOverview, nextEnvironments, nextRuns, nextLinks] = await Promise.all([remoteCall('overview'), remoteCall('environments'), remoteCall('runs'), remoteCall('projectLinks')])
          setOverview(nextOverview); setEnvironments(nextEnvironments); setRuns(nextRuns); setProjectLinks(nextLinks)
        } catch {
          setError(copy.unavailable)
        } finally {
          setLoading(false)
        }
      }, [copy.unavailable])
      React.useEffect(() => { void load() }, [load])

      const scan = async () => {
        setScanning(true); setError(''); setValidation(undefined)
        try { await remoteCall('scan', selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : { includeProject: false }); await load() }
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
      const executePlan = async () => {
        const plan = overview?.latestPlan
        if (!plan || !confirmed) return
        setExecuting(true); setError('')
        try { await remoteCall('executePlan', { planId: plan.id, planDigest: plan.digest, confirmed: true }); setConfirmed(false); await load() }
        catch (reason) { setError(reason instanceof Error ? reason.message : copy.unavailable) }
        finally { setExecuting(false) }
      }
      const disableEnvironment = async (environmentId: string) => { await remoteCall('disableEnvironment', { environmentId }); await load() }
      const setArtifactEnabled = async (materializationId: string, enabled: boolean) => { await remoteCall('setArtifactEnabled', { materializationId, enabled }); await load() }
      const verifyEnvironment = async (environmentId: string) => {
        const next = await remoteCall('verifyEnvironment', { environmentId })
        setEnvironments((current: any[]) => current.map((item) => item.id === environmentId ? next : item))
      }
      const rollbackRun = async (runId: string) => { await remoteCall('rollbackRun', { runId }); await load() }
      const discoverProjects = async () => {
        if (!selectedWorkspaceId) throw new Error('workspace-required')
        setProjectSnapshot(await remoteCall('discoverProjects', { workspaceId: selectedWorkspaceId }))
      }
      const confirmProjectLink = async (candidateId: string) => { await remoteCall('confirmProjectLink', { candidateId, expectedRevision: projectSnapshot.revision }); await Promise.all([discoverProjects(), load()]) }
      const unlinkProject = async (linkId: string, expectedRevision: number) => { await remoteCall('unlinkProject', { linkId, expectedRevision }); await Promise.all([discoverProjects(), load()]) }

      const snapshot = overview?.snapshot
      const phaseState = snapshot?.state ?? 'idle'
      const tabs = [['overview', copy.overview], ['import', copy.import], ['environments', copy.environmentsTab], ['projects', copy.projectsTab], ['activity', copy.activity]]
      return h('main', { className: 'agent-bridge', 'aria-labelledby': 'agent-bridge-title' },
        h('header', { className: 'agent-bridge__header' },
          h('div', { className: 'agent-bridge__identity' },
            h('div', { className: 'agent-bridge__title-row' }, h('h1', { id: 'agent-bridge-title', className: 'agent-bridge__title' }, copy.title), h('span', { className: 'agent-bridge__version' }, 'Phase 3B')),
            h('p', { className: 'agent-bridge__subtitle' }, copy.subtitle)),
          h('div', { className: 'agent-bridge__actions' },
            h('select', { className: 'agent-bridge__button', value: selectedWorkspaceId, onChange: (event: any) => { setSelectedWorkspaceId(event.target.value); setProjectSnapshot(undefined) }, 'aria-label': 'DSH Workspace' },
              h('option', { value: '' }, 'User scope only'),
              ...((workspaceSnapshot.items ?? []).map((item: any) => h('option', { key: item.workspaceId, value: item.workspaceId }, item.title)))),
            h('button', { className: 'agent-bridge__button', type: 'button', disabled: scanning, onClick: scan }, scanning ? copy.scanning : copy.scan),
            h('button', { className: 'agent-bridge__button agent-bridge__button--primary', type: 'button', disabled: planning || !snapshot, onClick: generatePlan }, planning ? copy.planning : copy.plan))),
        h('div', { className: 'agent-bridge__health', 'aria-live': 'polite' },
          h('div', { className: 'agent-bridge__health-main' }, h('span', { className: 'agent-bridge__dot', 'data-state': phaseState, 'aria-hidden': true }), h('span', { className: 'agent-bridge__health-title' }, copy.phase), h('span', { className: 'agent-bridge__health-copy' }, copy.detail)),
          error ? h('p', { className: 'agent-bridge__error', role: 'alert' }, error) : h('span', { className: 'agent-bridge__meta' }, snapshot ? formatTime(snapshot.completedAt) : '—')),
        h('nav', { className: 'agent-bridge__tabs', role: 'tablist', 'aria-label': copy.title },
          ...tabs.map(([id, label]) => h('button', { key: id, className: 'agent-bridge__tab', role: 'tab', type: 'button', 'aria-selected': tab === id, onClick: () => setTab(id) }, label))),
        h('section', { className: 'agent-bridge__panel', role: 'tabpanel', tabIndex: 0 }, renderPanel(h, tab, copy, overview, loading, validation, validatePlan, { confirmed, setConfirmed, executing, executePlan, environments, disableEnvironment, setArtifactEnabled, verifyEnvironment, runs, rollbackRun, projectSnapshot, projectLinks, discoverProjects, confirmProjectLink, unlinkProject })))
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

    function renderPanel(h: any, tab: string, copy: Copy, overview: any, loading: boolean, validation: any, validatePlan: () => void, execution: any): unknown {
      if (loading) return emptyState(h, '…', '')
      if (tab === 'environments') return renderEnvironments(h, copy, execution)
      if (tab === 'projects') return renderProjects(h, copy, execution)
      if (tab === 'activity') return renderActivity(h, copy, overview?.activities ?? [], execution)
      const snapshot = overview?.snapshot
      if (!snapshot) return emptyState(h, copy.empty, copy.emptyHint)
      if (tab === 'overview') return renderOverview(h, copy, snapshot)
      return renderPlan(h, copy, overview?.latestPlan, validation, validatePlan, execution)
    }

    function renderOverview(h: any, copy: Copy, snapshot: any): unknown {
      const portable = snapshot.artifacts.filter((item: any) => item.compatibility.level === 'native' || item.compatibility.level === 'adapted').length
      const blocked = snapshot.artifacts.length - portable
      return h('div', null,
        sectionHead(h, copy.endpoints, copy.endpointsHint, `${snapshot.endpoints.length}`),
        table(h, [copy.source, copy.result], snapshot.endpoints.map((item: any) => [
          h('span', { className: 'agent-bridge__source' }, endpointLabel(item.id)),
          h('span', null, badge(h, displayValue(copy, item.state), toneFor(item.state)), item.version ? h('span', { className: 'agent-bridge__secondary' }, `  ${item.version}`) : null),
        ])),
        h('div', { style: { height: 28 } }),
        sectionHead(h, copy.inventory, copy.inventoryHint, `${snapshot.artifacts.length}`),
        summary(h, [[snapshot.artifacts.length, copy.operations], [portable, copy.proposed], [blocked, copy.blockers]]),
        table(h, [copy.source, copy.category, copy.target, copy.compatibility], snapshot.artifacts.map((item: any) => [
          h('span', { className: 'agent-bridge__source' }, endpointLabel(item.artifact.source.endpointId)),
          h('span', null, h('span', { className: 'agent-bridge__source' }, item.artifact.identity.logicalName), h('span', { className: 'agent-bridge__secondary' }, ` · ${displayValue(copy, item.artifact.identity.kind)}`)),
          displayValue(copy, item.compatibility.targetKind ?? 'none'),
          badge(h, displayValue(copy, item.compatibility.level), toneFor(item.compatibility.level)),
        ])))
    }

    function renderPlan(h: any, copy: Copy, plan: any, validation: any, validatePlan: () => void, execution: any): unknown {
      if (!plan) return emptyState(h, copy.noPlan, copy.noPlanHint)
      const conflicts = plan.operations.filter((item: any) => item.state === 'conflict').length
      const proposed = plan.operations.filter((item: any) => item.state === 'proposed').length
      return h('div', null,
        h('div', { className: 'agent-bridge__section-head' },
          h('div', null, h('h2', { className: 'agent-bridge__section-title' }, copy.planTitle), h('p', { className: 'agent-bridge__section-copy' }, copy.planHint)),
          h('div', { className: 'agent-bridge__plan-tools' },
            validation ? h('span', { className: 'agent-bridge__freshness', 'data-valid': String(validation.valid), role: 'status' }, validation.valid ? copy.fresh : `${copy.expired} · ${displayReasons(copy, validation.reasons)}`) : null,
            h('button', { className: 'agent-bridge__button', type: 'button', onClick: validatePlan }, copy.validate))),
        summary(h, [[plan.operations.length, copy.operations], [proposed, copy.proposed], [conflicts, copy.conflicts], [plan.blockers.length, copy.blockers]]),
        h('p', { className: 'agent-bridge__meta' }, `${copy.digest} ${plan.digest.slice(0, 12)} · ${formatTime(plan.createdAt)}`),
        h('label', { style: { display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0', fontSize: 12 } }, h('input', { type: 'checkbox', checked: execution.confirmed, onChange: (event: any) => execution.setConfirmed(event.target.checked) }), copy.confirm),
        h('button', { className: 'agent-bridge__button agent-bridge__button--primary', type: 'button', disabled: !execution.confirmed || execution.executing || validation?.valid === false || !plan.operations.some((item: any) => item.state === 'proposed'), onClick: execution.executePlan }, execution.executing ? copy.executing : copy.execute),
        table(h, [copy.source, copy.category, copy.target, copy.state, copy.action, copy.risk, copy.reason], plan.operations.map((item: any) => [
          endpointLabel(item.sourceEndpointId), h('span', null, item.artifactIdentity.logicalName, h('span', { className: 'agent-bridge__secondary' }, ` · ${displayValue(copy, item.artifactIdentity.kind)}`)), displayEnvironment(item.targetEnvironmentId), badge(h, displayValue(copy, item.state), toneFor(item.state)), displayValue(copy, item.action), badge(h, displayValue(copy, item.risk), toneFor(item.risk)), h('span', { className: 'agent-bridge__secondary' }, displayReasons(copy, item.reasons)),
        ])))
    }

    function renderEnvironments(h: any, copy: Copy, execution: any): unknown {
      if (!execution.environments.length) return emptyState(h, copy.environments, copy.activityHint)
      return h('div', null, ...execution.environments.map((environment: any) => h('section', { key: environment.id, style: { marginBottom: 30 } },
        h('div', { className: 'agent-bridge__section-head' },
          h('div', null, h('h2', { className: 'agent-bridge__section-title' }, displayEnvironment(environment.id)), h('p', { className: 'agent-bridge__section-copy' }, `${endpointLabel(environment.sourceEndpointId)} · ${environment.artifactCount} ${displayValue(copy, 'artifacts')} · ${environment.revision.slice(0, 12)}`)),
          h('div', { className: 'agent-bridge__plan-tools' }, badge(h, displayValue(copy, environment.verifyState), toneFor(environment.verifyState)), h('button', { className: 'agent-bridge__button', onClick: () => execution.verifyEnvironment(environment.id) }, copy.validate), h('button', { className: 'agent-bridge__button', disabled: !environment.enabled, onClick: () => execution.disableEnvironment(environment.id) }, copy.disable))),
        environment.verifiedAt ? h('p', { className: 'agent-bridge__meta' }, `${formatTime(environment.verifiedAt)}${environment.verifyDiagnostic ? ` · ${environment.verifyDiagnostic}` : ''}`) : null,
        table(h, [copy.category, copy.source, copy.state, copy.digest, copy.action], environment.artifacts.map((artifact: any) => [h('span', null, artifact.logicalName, h('span', { className: 'agent-bridge__secondary' }, ` · ${displayValue(copy, artifact.kind)}`)), endpointLabel(artifact.sourceEndpointId), badge(h, displayValue(copy, artifact.enabled ? 'enabled' : 'disabled'), artifact.enabled ? 'success' : 'neutral'), h('span', { className: 'agent-bridge__mono' }, artifact.contentHash.slice(0, 12)), h('button', { className: 'agent-bridge__button', onClick: () => execution.setArtifactEnabled(artifact.id, !artifact.enabled) }, artifact.enabled ? copy.disable : 'Enable')]))) ))
    }

    function renderProjects(h: any, copy: Copy, execution: any): unknown {
      const snapshot = execution.projectSnapshot
      return h('div', null,
        h('div', { className: 'agent-bridge__section-head' },
          h('div', null, h('h2', { className: 'agent-bridge__section-title' }, copy.projectsTab), h('p', { className: 'agent-bridge__section-copy' }, 'Canonical paths, Git repository identity, and DSH workspace associations.')),
          h('button', { className: 'agent-bridge__button agent-bridge__button--primary', onClick: execution.discoverProjects }, 'Discover projects')),
        execution.projectLinks.length ? h('div', null,
          sectionHead(h, 'Confirmed links', '', `${execution.projectLinks.length}`),
          table(h, [copy.source, copy.target, 'Confidence', copy.action], execution.projectLinks.map((link: any) => [endpointLabel(link.claudeRefs.length ? 'claude-code' : 'codex'), link.dshWorkspace?.title ?? '—', badge(h, displayValue(copy, link.confidence), toneFor(link.confidence)), h('button', { className: 'agent-bridge__button', onClick: () => execution.unlinkProject(link.id, link.revision) }, 'Unlink')])) , h('div', { style: { height: 28 } })) : null,
        !snapshot ? emptyState(h, 'No project discovery snapshot', 'Discover projects to compare source roots with DSH workspaces.') : h('div', null,
          sectionHead(h, 'Candidates', `${snapshot.projects.length} source references · ${snapshot.workspaces.length} DSH workspaces`, `${snapshot.candidates.length}`),
          table(h, [copy.source, 'Project', copy.target, 'Confidence', copy.reason, copy.action], snapshot.candidates.map((candidate: any) => [
            endpointLabel(candidate.project.endpointId), candidate.project.displayName, candidate.workspace?.title ?? '—', badge(h, displayValue(copy, candidate.confidence), toneFor(candidate.confidence)), displayReasons(copy, candidate.reasons),
            candidate.workspace ? h('button', { className: 'agent-bridge__button', onClick: () => execution.confirmProjectLink(candidate.id) }, candidate.requiresConfirmation ? 'Confirm' : 'Link') : '—',
          ]))))
    }

    function renderActivity(h: any, copy: Copy, rows: any[], execution: any): unknown {
      return h('div', null,
        execution.runs.length ? h('div', null, sectionHead(h, 'Import runs', '', `${execution.runs.length}`), table(h, [copy.time, copy.state, copy.result, copy.action], execution.runs.map((run: any) => [formatTime(run.startedAt), badge(h, displayValue(copy, run.state), toneFor(run.state)), run.diagnostic ?? `${run.operationResults.length} operations`, h('button', { className: 'agent-bridge__button', disabled: run.state !== 'completed', onClick: () => execution.rollbackRun(run.id) }, copy.rollback)])), h('div', { style: { height: 28 } })) : null,
        rows.length ? h('div', null, sectionHead(h, copy.activityTitle, copy.activityHint, `${rows.length}`), table(h, [copy.time, copy.result], rows.map((row: any) => [formatTime(row.startedAt), h('span', null, badge(h, displayValue(copy, row.state), toneFor(row.state)), ` ${row.summary}`)]))) : emptyState(h, copy.activityTitle, copy.activityHint))
    }

    function sectionHead(h: any, title: string, description: string, meta?: string): unknown {
      return h('div', { className: 'agent-bridge__section-head' }, h('div', null, h('h2', { className: 'agent-bridge__section-title' }, title), h('p', { className: 'agent-bridge__section-copy' }, description)), meta ? h('span', { className: 'agent-bridge__meta' }, meta) : null)
    }
    function summary(h: any, items: Array<[number, string]>): unknown { return h('div', { className: 'agent-bridge__summary' }, ...items.map(([value, label]) => h('div', { className: 'agent-bridge__metric', key: label }, h('span', { className: 'agent-bridge__metric-value' }, String(value)), h('span', { className: 'agent-bridge__metric-label' }, label)))) }
    function emptyState(h: any, title: string, hint: string): unknown { return h('div', { className: 'agent-bridge__empty' }, h('div', { className: 'agent-bridge__empty-inner' }, h('span', { className: 'agent-bridge__empty-title' }, title), hint ? h('span', null, hint) : null)) }
    function badge(h: any, label: string, tone: string): unknown { return h('span', { className: 'agent-bridge__badge', 'data-tone': tone }, label) }
    function toneFor(value: string): string { if (['success', 'native', 'proposed', 'low', 'exact', 'verified'].includes(value)) return 'success'; if (['partial', 'adapted', 'conflict', 'medium', 'high', 'strong', 'candidate'].includes(value)) return 'warn'; if (['error', 'blocked', 'forbidden'].includes(value)) return 'error'; return 'neutral' }
    function endpointLabel(value: string): string { return value === 'claude-code' ? 'Claude Code' : value === 'codex' ? 'Codex' : value === 'dsh' ? 'DSH' : value }
    function displayEnvironment(value: string): string { return value === 'imported-claude-code' ? 'Claude Code 环境' : value === 'imported-codex' ? 'Codex 环境' : value }
    function displayValue(copy: Copy, value: string): string {
      const zh = copy.overview === '概览'
      const map: Record<string, [string, string]> = {
        available: ['Available', '可用'], missing: ['Not installed', '未安装'], unsupported: ['Unsupported', '不支持'], error: ['Error', '错误'], success: ['Completed', '已完成'], partial: ['Partial', '部分完成'],
        completed: ['Completed', '已完成'], failed: ['Failed', '失败'], interrupted: ['Interrupted', '已中断'], 'rolled-back': ['Rolled back', '已回滚'], 'rollback-failed': ['Rollback failed', '回滚失败'],
        instruction: ['Instruction', '项目指令'], skill: ['Skill', '技能'], command: ['Prompt command', '提示命令'],
        'system-prompt': ['System prompt', '系统提示词'], 'skill-provider': ['Skill provider', '技能提供方'], 'command-wrapper': ['Prompt command', '提示命令'], none: ['No target', '无目标'],
        native: ['Native', '原生支持'], adapted: ['Adapted', '需转换'], blocked: ['Blocked', '已阻塞'], 'archive-only': ['Archive only', '仅归档'],
        proposed: ['Ready to import', '可导入'], unchanged: ['No changes', '无变化'], conflict: ['Needs resolution', '需解决冲突'], skipped: ['Skipped', '已跳过'],
        register: ['Create', '新建'], update: ['Update', '更新'], skip: ['Skip', '跳过'],
        low: ['Low', '低风险'], medium: ['Medium', '中风险'], high: ['High', '高风险'], forbidden: ['Forbidden', '禁止'],
        exact: ['Exact match', '精确匹配'], strong: ['Strong match', '高置信匹配'], candidate: ['Candidate', '候选'], none_match: ['No match', '无匹配'],
        verified: ['Verified', '验证通过'], degraded: ['Needs attention', '需要处理'],
        enabled: ['Enabled', '已启用'], disabled: ['Disabled', '已停用'], artifacts: ['artifacts', '项内容'],
      }
      return (map[value] ?? [value, value])[zh ? 1 : 0]
    }
    function displayReasons(copy: Copy, reasons: string[]): string {
      if (!reasons.length) return '—'
      const zh = copy.overview === '概览'
      const map: Record<string, [string, string]> = {
        'first-import-target-collision': ['A target with the same identity already exists', '目标中已存在同名内容'],
        'source-and-target-unchanged': ['Source and DSH are unchanged', '来源与 DSH 均无变化'],
        'target-changed-after-baseline': ['DSH changed after the last import', 'DSH 在上次导入后已变化'],
        'source-and-target-diverged': ['Source and DSH changed differently', '来源与 DSH 已分别变化'],
        'scripted-skill-outside-phase-one': ['Scripts require separate review', '包含脚本，需单独审批'],
        'unsafe-or-unsupported-command': ['Command contains executable or unsupported behavior', '命令含执行逻辑或不受支持的行为'],
        'duplicate-command-name': ['Multiple source commands would register the same name', '多个来源命令会注册同一个名称，请先消歧'],
        'target-observation-incomplete': ['DSH target state is incomplete', 'DSH 目标状态不完整'],
        'canonical-path-match': ['Canonical paths are identical', '规范路径完全一致'],
        'repository-root-match': ['Same Git repository or worktree family', '属于同一 Git 仓库或 worktree'],
        'git-identity-match': ['Git remotes identify the same repository', 'Git 远端标识为同一仓库'],
        'basename-match': ['Directory names match', '目录名称相同'],
        'ambiguous-equal-score': ['Multiple workspaces match equally', '多个 Workspace 匹配度相同'],
        'no-workspace-match': ['No matching DSH workspace', '未找到匹配的 DSH Workspace'],
        'project-link-revision-changed': ['Project association changed', '项目关联已变化'],
        'scan-revision-changed': ['A newer source scan exists', '已有更新的来源扫描'],
        'source-changed': ['Source content changed after planning', '来源内容在计划生成后已变化'],
        'target-revision-changed': ['DSH target changed after planning', 'DSH 目标在计划生成后已变化'],
        'plan-not-found': ['The saved plan is unavailable', '已保存的计划不可用'],
      }
      return reasons.map((reason) => (map[reason] ?? [reason, reason])[zh ? 1 : 0]).join('；')
    }
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
