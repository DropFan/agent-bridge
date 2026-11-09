declare global {
  interface Window {
    __ModuleLoader__: {
      load(definition: { id: string; factory(require: (id: string) => any): unknown }): void
    }
  }
}

const css = `
.agent-bridge-page{color:var(--dsw-alias-label-primary);padding:24px;max-width:1120px;margin:0 auto}.agent-bridge-page *{box-sizing:border-box}
.agent-bridge-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:20px}.agent-bridge-title{font-size:24px;line-height:1.25;margin:0 0 6px}.agent-bridge-muted{color:var(--dsw-alias-label-secondary);margin:0}
.agent-bridge-button{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);border-radius:8px;padding:9px 14px;font:inherit;cursor:pointer}.agent-bridge-button:disabled{opacity:.55;cursor:not-allowed}
.agent-bridge-status{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:10px;padding:16px;margin-bottom:16px}.agent-bridge-error{color:var(--dsw-alias-state-error-primary)}
.agent-bridge-tabs{display:flex;gap:4px;border-bottom:1px solid var(--dsw-alias-border-l1);margin-bottom:16px;overflow:auto}.agent-bridge-tab{border:0;background:transparent;color:var(--dsw-alias-label-secondary);padding:10px 12px;cursor:pointer;white-space:nowrap}.agent-bridge-tab[aria-selected=true]{color:var(--dsw-alias-label-primary);border-bottom:2px solid var(--dsw-alias-brand-primary)}
.agent-bridge-table{width:100%;border-collapse:collapse}.agent-bridge-table th,.agent-bridge-table td{text-align:left;padding:10px;border-bottom:1px solid var(--dsw-alias-border-l1);vertical-align:top}.agent-bridge-table th{color:var(--dsw-alias-label-secondary);font-weight:500}
.agent-bridge-badge{display:inline-flex;align-items:center;gap:6px;font-size:12px}.agent-bridge-dot{width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-state-idle-primary)}.agent-bridge-dot[data-state=success]{background:var(--dsw-alias-state-success-primary)}.agent-bridge-dot[data-state=partial]{background:var(--dsw-alias-state-warn-primary)}.agent-bridge-dot[data-state=error]{background:var(--dsw-alias-state-error-primary)}
.agent-bridge-empty{padding:28px;text-align:center;color:var(--dsw-alias-label-secondary)}
@media(max-width:699px){.agent-bridge-page{padding:16px}.agent-bridge-header{display:block}.agent-bridge-button{margin-top:12px}.agent-bridge-table thead{display:none}.agent-bridge-table tr{display:block;padding:10px 0}.agent-bridge-table td{display:block;border:0;padding:4px 0}.agent-bridge-table td:before{content:attr(data-label) ': ';color:var(--dsw-alias-label-secondary)}}
`

type Copy = typeof dictionaries.en
const dictionaries = {
  en: {
    title: 'Agent Bridge', subtitle: 'Assess portable Claude Code and Codex data for DSH.', scan: 'Scan sources', scanning: 'Scanning…',
    overview: 'Overview', import: 'Import', activity: 'Activity', phase: 'Phase 0 is endpoint read-only', detail: 'Scans save redacted derived data, but do not modify source files or DSH runtime contributions.',
    empty: 'No scan snapshot yet.', source: 'Source', category: 'Category', target: 'DSH target', compatibility: 'Compatibility', result: 'Result', time: 'Time',
    unavailable: 'Host Remote is unavailable. Verify that the DSH API Gateway composed this plugin.',
  },
  zh: {
    title: 'Agent Bridge', subtitle: '评估 Claude Code 与 Codex 可迁移到 DSH 的数据。', scan: '扫描来源', scanning: '扫描中…',
    overview: '概览', import: '导入预览', activity: '活动', phase: 'Phase 0 为端点只读', detail: '扫描会保存脱敏派生数据，但不会修改来源文件或 DSH 运行时贡献。',
    empty: '尚无扫描快照。', source: '来源', category: '类别', target: 'DSH 目标', compatibility: '兼容性', result: '结果', time: '时间',
    unavailable: 'Host Remote 不可用，请确认 DSH API Gateway 已组合本插件。',
  },
}

window.__ModuleLoader__.load({
  id: '@local/agent-bridge',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    function Page() {
      const locale = useLocale()
      const copy: Copy = locale.startsWith('zh') ? dictionaries.zh : dictionaries.en
      const [tab, setTab] = React.useState('overview')
      const [overview, setOverview] = React.useState(undefined as any)
      const [loading, setLoading] = React.useState(true)
      const [scanning, setScanning] = React.useState(false)
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
        setScanning(true)
        setError('')
        try {
          await remoteCall('scan', {})
          await load()
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : copy.unavailable)
        } finally {
          setScanning(false)
        }
      }

      const snapshot = overview?.snapshot
      const tabs = [['overview', copy.overview], ['import', copy.import], ['activity', copy.activity]]
      return h('main', { className: 'agent-bridge-page', 'aria-labelledby': 'agent-bridge-title' },
        h('header', { className: 'agent-bridge-header' },
          h('div', null, h('h1', { id: 'agent-bridge-title', className: 'agent-bridge-title' }, copy.title), h('p', { className: 'agent-bridge-muted' }, copy.subtitle)),
          h('button', { className: 'agent-bridge-button', type: 'button', disabled: scanning, onClick: scan }, scanning ? copy.scanning : copy.scan)),
        h('section', { className: 'agent-bridge-status', 'aria-live': 'polite' },
          h('div', { className: 'agent-bridge-badge' }, h('span', { className: 'agent-bridge-dot', 'data-state': snapshot?.state ?? 'idle', 'aria-hidden': true }), copy.phase),
          h('p', { className: 'agent-bridge-muted' }, copy.detail), error ? h('p', { className: 'agent-bridge-error', role: 'alert' }, error) : null),
        h('div', { className: 'agent-bridge-tabs', role: 'tablist', 'aria-label': copy.title },
          ...tabs.map(([id, label]) => h('button', { key: id, className: 'agent-bridge-tab', role: 'tab', type: 'button', 'aria-selected': tab === id, onClick: () => setTab(id) }, label))),
        h('section', { role: 'tabpanel', tabIndex: 0 }, renderPanel(h, tab, copy, overview, loading)))
    }

    function useLocale(): string {
      const [locale, setLocale] = React.useState(() => localeService?.getLocale?.().id ?? navigator.language ?? 'en')
      React.useEffect(() => localeService?.subscribe?.(() => setLocale(localeService.getLocale().id)), [])
      return locale
    }

    let ctxRef: any
    let localeService: any
    async function remoteCall(method: string, payload?: unknown): Promise<any> {
      const remote = ctxRef?.remote ?? ctxRef?.get?.('remote')
      const namespace = remote?.agentBridge
      if (!namespace || typeof namespace[method] !== 'function') throw new Error('agent-bridge/remote-unavailable')
      const result = payload === undefined ? await namespace[method]() : await namespace[method](payload)
      if (result?.ok === false) throw new Error(result.error?.message ?? 'agent-bridge/remote-error')
      return result?.ok === true ? result.value : result
    }

    return {
      inject: ['slots'],
      apply(ctx: any) {
        ctxRef = ctx
        localeService = ctx.get?.('locale')
        const disposeStyle = injectStyle(css)
        const disposeSlot = ctx.slots.inject('settings.section', () => ctx.slots.register({ name: 'settings.section', id: 'agent-bridge', order: 17, label: 'Agent Bridge' }, Page))
        return () => { disposeSlot?.(); disposeStyle(); ctxRef = undefined; localeService = undefined }
      },
    }
  },
})

function renderPanel(h: any, tab: string, copy: Copy, overview: any, loading: boolean): unknown {
  if (loading) return h('div', { className: 'agent-bridge-empty' }, '…')
  const snapshot = overview?.snapshot
  if (tab === 'activity') {
    const rows = overview?.activities ?? []
    return rows.length === 0 ? h('div', { className: 'agent-bridge-empty' }, copy.empty) : table(h, [copy.time, copy.result], rows.map((row: any) => [row.startedAt, row.summary]))
  }
  if (!snapshot) return h('div', { className: 'agent-bridge-empty' }, copy.empty)
  if (tab === 'overview') {
    return table(h, [copy.source, copy.result], snapshot.endpoints.map((endpoint: any) => [endpoint.id, `${endpoint.state}${endpoint.version ? ` · ${endpoint.version}` : ''}`]))
  }
  return table(h, [copy.source, copy.category, copy.target, copy.compatibility], snapshot.artifacts.map((item: any) => [
    item.artifact.source.endpointId, item.artifact.identity.kind, item.compatibility.targetKind ?? '—', `${item.compatibility.level} · ${item.compatibility.risk}`,
  ]))
}

function table(h: any, headers: string[], rows: unknown[][]): unknown {
  return h('table', { className: 'agent-bridge-table' },
    h('thead', null, h('tr', null, ...headers.map((header) => h('th', { key: header, scope: 'col' }, header)))),
    h('tbody', null, ...rows.map((row, index) => h('tr', { key: index }, ...row.map((cell, cellIndex) => h('td', { key: cellIndex, 'data-label': headers[cellIndex] }, String(cell)))))))
}

function injectStyle(text: string): () => void {
  const tag = document.createElement('style')
  tag.dataset.plugin = '@local/agent-bridge'
  tag.textContent = text
  document.head.appendChild(tag)
  return () => tag.remove()
}

export {}
