# Agent Bridge 产品与技术方案

- 状态：方案草案 v2；Phase 0–2、Phase 3A-1 环境管理与 Phase 3A-2 ProjectLink 已实现并完成本机运行验证
- 日期：2026-11-06
- 目标宿主：DeepSeek Harness（Cordis Host + Client 插件）
- 产品名：Agent Bridge

> 当前门禁：Phase 2 仅 materialize 用户明确确认、执行前重新校验且由 Agent Bridge 管理的 Instructions 与无脚本 Skills；不修改来源端、不传播删除、不自动处理 High/Forbidden 类别。

## 1. 产品定义

Agent Bridge 是面向 DSH 的 Agent 环境迁移与兼容层。当前负责安全地发现 Claude Code 与 Codex 中可移植的数据，将其转换为与具体 Harness 无关的中间模型，并在用户审阅后导入 DSH，使用户无需手工复制和重写即可切换到 DSH。

未来，Agent Bridge 将支持从 DSH 导出到 Claude Code、Codex及其他 Harness。Claude Code 与 Codex 之间的直接同步不是当前产品主干；需要端到端迁移时，也应通过同一可移植模型和目标能力评估完成，而不是维护成对转换器。

Agent Bridge 不是用户目录镜像工具，也不承诺迁移凭证、平台私有内部状态或同一个活动会话的运行现场。

### 1.1 当前主路径

```text
Claude Code ─┐
             ├─→ Portable Artifact Model ─→ DSH 原生能力
Codex ───────┘
```

未来扩展：

```text
Claude Code / Codex / 其他 Harness
                 ⇅
          Portable Artifact Model
                 ⇅
                 DSH
```

### 1.2 核心价值

1. 一处盘点 Claude Code、Codex 中可迁移的规则、Skills、项目环境和后续扩展数据。
2. 清楚说明每项数据在 DSH 中的落点、兼容程度、风险和转换损失。
3. 使用 DSH 原生 Cordis 能力让导入内容真正参与 Agent 运行，而不是仅复制文件。
4. 通过不可变计划、显式确认、重新校验、验证和回滚建立安全迁移闭环。
5. 保留来源、baseline 和 materialization 信息，为未来从 DSH 导出到其他 Harness 奠定基础。

### 1.3 “低成本切换”的边界

对明确支持的可移植类别，用户不需要手工复制和重写；Agent Bridge 负责发现、规范化、兼容性评估、预览、导入和验证。

以下内容不承诺无损迁移：

- API Key、OAuth、Cookie、Token、Keychain 等凭证；
- 权限、沙盒和 bypass 放宽配置；
- 平台专属 Hook、工具实现和未公开扩展行为；
- SQLite、WAL、SHM、session index 等内部状态；
- 活动会话运行状态和实时续写现场；
- 没有稳定公开接口或无法安全表达的数据。

### 1.4 设计原则

- **迁移计划先于生效**：任何端点变更或 DSH 运行时生效操作必须先生成不可变计划。
- **来源与目标解耦**：核心模型不使用 Claude/Codex 特有结构作为规范格式。
- **能力驱动**：Adapter 暴露 endpoint capability，控制器不假设不同 Harness 对称。
- **DSH 原生承载**：优先使用 `systemPrompt`、`skills`、agent presets 等正式 Cordis 服务。
- **默认隔离**：导入内容默认进入独立 DSH environment/preset，不直接污染全局默认 Agent。
- **来源可追溯**：每项数据保留来源、hash、作用域、转换版本和 materialization 记录。
- **兼容损失显式化**：不支持或降级的语义必须展示，不能静默丢弃。
- **不传播秘密**：不主动读取已知凭证载体；意外进入边界的敏感输出必须在持久化和展示前脱敏。
- **不按 mtime 决胜**：更新和冲突依赖 baseline 三路比较。
- **验证实际效果**：成功以 DSH 有效 catalog、prompt assembly 或 preset 状态为准，而非文件存在或命令退出 0。

## 2. 用户与核心任务

### 2.1 主要用户

- 已在 Claude Code 或 Codex 中积累个人工作环境，希望迁移到 DSH 的开发者。
- 同时使用多个 Harness，希望减少规则、Skills 和项目环境重复维护的高级用户。
- 希望保留退出路径，未来可从 DSH 迁移到其他 Harness 的用户。

MVP 不面向多人组织集中策略管理。组织策略只识别和尊重，不尝试覆盖。

### 2.2 核心任务

1. **检查环境**：确认 Claude Code、Codex 和 DSH 的版本与公开能力。
2. **发现来源数据**：只读盘点允许迁移的用户级和项目级数据。
3. **理解兼容性**：知道数据可原生承载、需适配、仅可归档还是必须阻塞。
4. **预览 DSH 落点**：明确会新增或遮蔽哪些 DSH 能力，以及语义损失。
5. **安全导入**：审阅不可变计划后，将获批内容导入隔离环境。
6. **验证与回退**：确认实际生效结果，失败时停用或回滚 Agent Bridge 管理的 materialization。
7. **持续更新**：来源或 DSH 状态变化后，用 baseline 三路比较更新，而非盲目覆盖。
8. **未来导出**：从可移植模型和 DSH 当前状态生成目标 Harness 的导出计划。

## 3. 功能范围

### 3.1 迁移能力矩阵

| 类别 | 当前发现 | DSH 目标 | 首次导入 | 未来导出 | 策略 |
|---|---:|---|---:|---:|---|
| 用户/项目 Instructions | Phase 0 | `systemPrompt` contribution / preset scope | Phase 2 | 是 | 保留来源和作用域，冲突显式处理 |
| `AGENTS.md` / `CLAUDE.md` | Phase 0 | workspace-sensitive instruction | Phase 2 | 是 | 不直接覆盖源文件 |
| Skills 正文 | Phase 0 | DSH `skills` provider | Phase 2 | 是 | 按需加载，扫描时不执行 |
| Skill references/assets | Phase 0 | 受控 resource base | Phase 2 | 是 | 路径、大小和类型受限 |
| Skill scripts | 仅静态清单/hash | 隔离资源，默认不执行 | 逐项 High 审批 | 受限 | 不因导入而自动获得执行信任 |
| Commands | Phase 3 | DSH command 或安全 prompt wrapper | Phase 3 | 受限 | 仅迁移语义明确的安全子集 |
| Agent definitions | Phase 3 | agent preset / prompt / tool policy | Phase 3 | 受限 | 不直接注册外部执行 provider |
| MCP 定义 | Phase 3 | 无秘密安装/配置意图 | Phase 3 | 受限 | 不读取或复制秘密值，目标端重新授权 |
| Plugins | Phase 3 | 安装意图 | Phase 3 | 受限 | 不复制缓存，不自动启用高风险能力 |
| Hooks | 后续评估 | 无默认直接落点 | 否 | 否 | 平台专属，默认 blocked |
| 普通设置 | 后续评估 | 白名单等价设置 | 受限 | 受限 | 仅迁移语义明确字段 |
| 权限/沙盒 | 可识别 | 仅建议 | 否 | 否 | 不自动写入或放宽 |
| 项目关联 | Phase 3 | DSH workspace link | Phase 3 | 是 | 不复制源码 |
| 对话 | Phase 3 | 只读索引/官方导出引用 | 不写活动会话 | 是 | 区分原生与导入副本 |
| 记忆 | Phase 4 | 经审批的 Portable Artifact | 审批后 | 是 | 不复制内部生成状态 |
| 凭证/Auth | 仅官方 presence | 无 | 否 | 否 | 永不读取或迁移值 |
| 内部数据库 | 否 | 无 | 否 | 否 | Forbidden |

### 3.2 兼容性等级

每个 artifact 都必须得到一种 DSH 兼容性结论：

- `native`：DSH 有语义基本等价的正式承载能力。
- `adapted`：可安全转换，但存在已说明的语义差异。
- `archive-only`：只能作为只读资料保存或索引，不能参与运行时。
- `blocked`：敏感、危险、格式未知或没有安全落点。

兼容性评估必须同时给出：目标能力、转换说明、丢失字段、风险、审批要求和验证方法。

### 3.3 明确不在范围

- 将 Claude Code 和 Codex 目录互相镜像。
- 实时双写活动会话或承诺跨 Harness 原生续写等价。
- 读取、复制或导出凭证值。
- 直接依赖或修改 Claude、Codex、DSH 未公开的内部数据库格式。
- 自动执行被扫描的 Hook、Skill script 或其他代码。
- 自动启用 MCP executable、Plugin、Hook 或放宽权限。
- 复制项目源码。
- 无人工审批的生成记忆循环同步。
- 第一版云服务、团队后台或多机同步。

## 4. DSH 承载模型

本节区分已核实事实和设计决定。

### 4.1 已核实的 DSH 能力

通过当前 Harness 的 Cordis Inspect 已核实：

- Client `settings.section` 是 root scope、list 类型，可注册独立设置页。
- Host `storageDomain` 可保存具备 schema 和版本的插件私有 domain 数据。
- Host `subprocess` 支持 canonical executable 解析、argv 数组执行、取消、有界输出和退出等待。
- Host `systemPrompt.section()` 可注册全局或 scoped prompt section。
- Host `skills.registerProvider()` / `skills.register()` 可提供 global 或 preset-scoped Skills，并支持按需加载正文。
- Host `agentPresets.register()` 可注册独立 Agent preset 和 Cordis composition。
- Host `commands.register()` 注册的是带 handler 的可执行命令，不等同于静态 prompt 文件。
- Host `subagents.registerProvider()` 注册的是可信执行 provider，不等同于外部 agent 文本定义。
- DSH settings 的远程读取会隐藏 secret 字段值，只返回安全视图和 presence。
- 插件不应向 DSH Session append 自定义业务事件；迁移状态属于插件全局管理数据。

### 4.2 设计决定

- Instructions 优先编译为 scoped `systemPrompt` contribution。
- Skills 优先由 Agent Bridge `skills` provider 提供，不复制进 DSH 私有目录。
- 导入内容默认组成来源独立的 DSH environment/preset：
  - `Imported from Claude Code`
  - `Imported from Codex`
- 第一版不自动把两个来源合并成统一 environment。
- Commands、Agent definitions、MCP 和 Plugins 在完成专门安全映射前不进入首个导入切片。
- Agent Bridge 只管理自己创建的 materialization，不覆盖其他插件或用户贡献。

### 4.3 待实现前进一步验证

- package-private Host/Client RPC 的精确导出和 handler 契约。
- 编译型 Client 插件的构建产物格式和工作区构建命令。
- `storageDomain` schema helper 的公开导入路径。
- 动态生成或注册 preset 的持久化与重启恢复方式。
- workspace-sensitive prompt contribution 的最终 scope 绑定方法。
- Claude Code 与 Codex 各类数据的公开稳定读取接口和版本矩阵。

## 5. 信息架构与 UI

### 5.1 入口

在 DSH `settings.section` 注册独立页面 **Agent Bridge**，位于 Plugins 与 Agent presets 附近。第一版不增加常驻侧栏按钮。

### 5.2 页面结构

```text
Settings
└── Agent Bridge
    ├── Overview        来源健康、可迁移数量、DSH 导入状态
    ├── Import          来源数据、兼容性、差异与导入计划
    ├── Environments    已导入的 DSH environments/presets
    ├── Projects        外部项目与 DSH workspace 关联（Phase 3）
    ├── Conversations   跨来源只读历史与导出（Phase 3）
    ├── Memories        候选审批（Phase 4）
    ├── Activity        发现、计划、导入、验证和回滚历史
    ├── Preferences     行为、范围、安全和存储设置
    └── Export          DSH → 其他 Harness（未来阶段再展示）
```

### 5.3 Overview

使用状态摘要和紧凑表格，不做统计卡片拼贴：

```text
Agent Bridge                                      [扫描来源]
Claude Code 2.x  已连接     Codex 0.x  已连接     DSH 已就绪

发现 28 项可迁移 · 4 项需适配 · 2 项阻塞

来源 / 类别          数量   DSH 目标                 兼容性
Claude Instructions    6    System prompt section    Native
Claude Skills          12   Skills provider          Adapted
Codex AGENTS.md         3   Project instructions     Native
Codex Commands          7   尚未支持                  Blocked
```

### 5.4 Import 页

采用主从布局：左侧来源、类别和筛选；右侧展示来源内容、Portable Artifact、DSH 目标和转换损失。

筛选至少包括：全部、可原生导入、需适配、仅归档、阻塞、已导入、来源有变化、DSH 有变化、冲突。

每项必须显示：

- 来源 endpoint、scope 和 native reference；
- DSH 目标能力和 environment；
- before/after 或语义 diff；
- 兼容性等级和转换损失；
- 是否由 Agent Bridge 管理；
- 风险、跳过原因和验证方法。

窄屏使用单面板 drill-in，不简单堆叠双栏。

### 5.5 Import Plan

执行前使用完整页面或抽屉，不使用信息不足的通用确认弹窗：

- 目标 DSH environment；
- 将注册、更新、停用和跳过的 materialization；
- DSH 当前贡献及潜在遮蔽；
- 转换损失、风险和阻塞项；
- 计划绑定的 scan revision、source hash 和 DSH revision；
- verify 步骤和回滚方式。

计划持久化在 Agent Bridge storage 中，但不会在确认前改变来源端或 DSH runtime。

### 5.6 Environments

展示每个导入环境的：来源、当前 revision、包含类别、有效/降级状态、最后验证时间和停用入口。

第一版来源环境彼此隔离。同名 artifact 不因名称相同自动合并。

### 5.7 状态与可访问性

所有核心页面必须处理 loading、empty、error、success 和 partial。状态必须使用文字和图形，不能只依赖颜色。

- 动态进度使用 `aria-live="polite"`。
- 错误摘要获得焦点。
- 支持完整键盘导航。
- 使用 Inspect 核实的 `--dsw-alias-*` theme tokens。
- 不依赖 Harness 私有 Client UI 包。
- `<700px` 使用单面板流程；桌面使用主从布局。

## 6. 设置与数据治理

### 6.1 基本设置

| 设置 | 默认 | Phase | 说明 |
|---|---|---|---|
| Claude Code 来源 | 自动发现 | 0 | 显示解析后的 executable 和 capability |
| Codex 来源 | 自动发现 | 0 | 同上 |
| 扫描触发 | 手动 | 0 | MVP 不自动扫描 |
| 导入目标 | 独立 environment | 1 | 不直接污染全局默认 Agent |
| 导入前确认 | always | 1 | MVP 不可关闭 |
| 允许读取对话正文 | 关 | 3 | 与元数据索引分离 |
| 自动导入 | 关 | 4+ | 仅评估后的 Low 类别可考虑 |

### 6.2 配置落点

- 稳定插件偏好：Cordis Config，通过 `configEditor` 保存。
- endpoint status、Portable Artifact snapshot、baseline、plan、materialization 和 activity：`storageDomain`。
- Claude/Codex 凭证：本插件不拥有、不解析、不迁移。
- 未来远程后端凭证：仅使用 DSH `credentials`，与来源端凭证隔离。
- 不直接编辑 profile 的 `package.json` 或 `cordis.patch.yml`。

### 6.3 本地派生数据

Phase 0 虽然“端点只读”，仍会在插件 storage 保存脱敏派生数据。UI 必须明确说明这一点。

暂定治理策略：

- scan snapshot：保留最近 10 次或 30 天，先到者清理；
- activity：默认保留 90 天；
- baseline 和有效 materialization：环境存在期间保留；
- 提供“清除扫描与活动数据”入口；
- 禁用插件不自动删除数据；
- 卸载时是否删除 domain 数据必须由用户明确选择；
- 不保存原始 CLI stdout/stderr，只保存脱敏摘要和结构化诊断。

保留期限和卸载行为仍需用户最终确认。

## 7. 领域模型

### 7.1 核心对象

```text
Endpoint
  id, kind, role
  version, capabilities, health

PortableArtifact
  identity: {kind, scope, projectKey?, logicalName}
  source: {endpointId, nativeRef, observedRevision}
  normalizedContent?       # 不含秘密
  contentHash
  sensitivity
  compatibility
  conversionDiagnostics[]

Materialization
  artifactIdentity
  endpointId: dsh
  environmentId
  targetKind
  nativeRef
  contentHash
  ownership: bridge-managed | user-managed | external
  revision

Baseline
  artifactIdentity
  sourceEndpointId
  sourceHash?
  portableHash?
  dshMaterializationHash?
  lastSuccessfulRunId

ImportPlan
  id, createdAt, scanRevision
  sourceEndpointIds[]
  targetEnvironmentId
  operations[]
  warnings[], blockers[]

ImportOperation
  id, artifactIdentity
  action: register | update | disable | link | archive | skip
  expectedSourceHash
  expectedTargetRevision?
  compatibility, risk
  approvalRequired
  verifySpec
  rollbackRef?

ImportRun
  id, planId, state
  operationResults[]
  startedAt, endedAt
```

### 7.2 Adapter 能力接口

Adapter 按能力拆分，避免 Phase 0 为未来写入提供空实现：

```ts
interface EndpointProbe {
  probe(signal: AbortSignal): Promise<EndpointStatus>
}

interface ArtifactSource {
  discover(
    request: DiscoverRequest,
    signal: AbortSignal,
  ): AsyncIterable<DiscoveredArtifact>
}

interface ArtifactReader {
  read(
    ref: NativeArtifactRef,
    signal: AbortSignal,
  ): Promise<ArtifactPayload>
}

interface CompatibilityAssessor {
  assess(
    artifact: PortableArtifact,
    target: EndpointCapabilities,
  ): CompatibilityAssessment
}

// Phase 1+
interface ImportPlanner { /* immutable plan */ }

// Phase 2+
interface Materializer { /* apply to DSH */ }
interface MaterializationVerifier { /* inspect effective DSH state */ }
interface MaterializationRollback { /* disable or restore owned state */ }

// Future export
interface ArtifactTarget { /* render/plan for another Harness */ }
```

### 7.3 Identity

`kind + scope + projectKey + logicalName` 构成 portable identity。路径只是 native reference，不单独作为逻辑身份。来源 endpoint ID 是 provenance 的一部分；第一版不同来源的同名 artifact 不自动合并。

## 8. 数据流与比较

### 8.1 Phase 0 发现流

```text
UI: Scan sources
  → Probe Claude / Codex / DSH capabilities
  → Discover allowlisted source artifacts
  → Path and sensitivity policy
  → Normalize into PortableArtifact
  → Assess DSH compatibility
  → Persist redacted scan snapshot
  → Overview / Import / Activity
```

Phase 0 不注册 prompt、Skill 或 preset，不改变来源端和 DSH runtime。

### 8.2 Phase 1/2 导入流

```text
Scan snapshot + DSH current state + Baseline
  → Three-way comparison
  → User resolutions
  → Immutable Import Plan
  → Explicit confirmation
  → Revalidate source hash and DSH revision
  → Acquire operation lease + fencing token
  → Materialize only bridge-managed targets
  → Verify effective DSH runtime state
  → Commit Baseline + Activity
  → On failure disable/rollback reversible items
```

### 8.3 三路比较

比较对象是“来源、上次成功导入 baseline、DSH 当前 materialization”，不是 Claude 与 Codex 两端：

| 来源相对 baseline | DSH 相对 baseline | 结果 |
|---|---|---|
| 未变 | 未变 | 一致，无操作 |
| 已变 | 未变 | 可提议更新 DSH |
| 未变 | 已变 | DSH 被用户或外部修改，保留并提示 |
| 已变 | 已变且结果相同 | 已收敛，可更新 baseline |
| 已变 | 已变且结果不同 | 冲突 |
| 已删除 | 未变 | 停用提案，默认不传播删除 |
| 已删除 | 已修改 | 冲突 |
| 无 baseline | 目标不存在 | 首次导入候选 |
| 无 baseline | 目标已存在 | 首次碰撞，禁止按名称覆盖 |

禁止使用 mtime 自动选择胜方。

### 8.4 计划与执行分离

- Plan 持久化在插件 storage，但不改变来源或 DSH runtime。
- `scanRevision`、source hash 和 DSH revision 绑定计划。
- 用户修改选择或 resolution 会生成新 Plan，不原地修改旧计划。
- 执行前重新 probe capability、检查 hash/revision 和目标 ownership。
- 只有 verify 成功才更新 baseline。
- 页面关闭不取消 Host run；重新打开恢复状态。

## 9. 安全模型

### 9.1 不可跨越的红线

1. 不主动读取 `.env`、auth、credentials、token、cookie、keychain 等已知秘密载体。
2. 不把秘密写入 DSH Config、storage、日志、diff、计划或子进程 argv。
3. 不直接修改任何 Harness 的内部数据库、session index 或活动 transcript。
4. 不自动启用 Hook、MCP executable、Plugin 或放宽权限/沙盒。
5. 扫描期间不执行 Hook、Skill script 或其他被扫描代码。
6. 不因文件存在或命令退出 0 就视为迁移成功，必须验证有效运行时状态。
7. Host 必须拒绝 Forbidden 请求，不能依赖 Client 隐藏按钮实施安全策略。

### 9.2 Secret 处理

- 已知秘密文件和字段通过路径/结构白名单避免读取，而不是“读取后再删除”。
- 对可能混合秘密的 MCP、设置等类别，优先使用官方 presence/capability 接口；无法安全分离时整项跳过。
- CLI 意外输出、错误对象和第三方文本仍必须经过防御性 redaction。
- Secret 命中只记录类别、位置类型和处理动作，不记录原值或可还原片段。
- 测试使用假 secret，断言 UI、RPC、storage、Activity 和日志均无原值。

### 9.3 子进程

- 使用 DSH `subprocess.resolveExecutable()` 和 `spawn()`。
- 只使用 argv 数组，不拼接 shell 字符串。
- 使用 canonical absolute executable、固定 cwd 和最小环境变量。
- stdout/stderr 设置内存上限；原始 spill path 不返回 Client。
- 每次命令设置超时和 AbortSignal；终止后等待实际退出。
- Phase 0 只运行明确的只读版本/capability 命令。

### 9.4 路径与脚本

- 每个来源 adapter 声明允许根、允许文件类型、大小上限和禁止路径。
- realpath 后必须仍位于允许根。
- 离开允许根的 symlink 默认拒绝，不提供扫描时临时放行。
- scripts 只记录静态路径、类型、大小和 hash；不 import、source、require 或执行。
- 二进制或未知格式默认 blocked。
- 未信任项目只读取允许的安全元数据。

### 9.5 风险等级

- `Low`：只读 probe、允许列表元数据、兼容性评估、相同内容判断。
- `Medium`：注册纯 Instructions、无脚本 Skills、项目关联。
- `High`：带 scripts 的 Skills、Commands、Agent definitions、MCP、Plugins、对话正文索引。
- `Forbidden`：凭证值、活动会话写入、内部数据库、Hook 自动启用、权限放宽。

High 项必须逐项确认，不能通过批量选择或“记住决定”绕过。Phase 4 之前不开放自动导入；未来自动化也不能处理 High/Forbidden。

## 10. DSH 插件架构与模块边界

```text
@local/agent-bridge
├── Host
│   ├── BridgeService             UI 的应用服务入口
│   ├── DiscoveryController       probe / discover / normalize / assess
│   ├── ImportController          plan / materialize / verify / rollback（Phase 1+）
│   ├── ClaudeSourceAdapter
│   ├── CodexSourceAdapter
│   ├── DshTargetAdapter
│   ├── PortableNormalizer
│   ├── CompatibilityEngine
│   ├── ComparisonEngine
│   ├── SecurityPolicy
│   └── Package-private RPC
├── DSH Materializers
│   ├── PromptMaterializer
│   ├── SkillProvider
│   └── PresetEnvironmentManager
├── Storage Domain
│   ├── endpoint_status
│   ├── scan_snapshots
│   ├── baselines
│   ├── materializations
│   ├── import_plans
│   ├── import_runs
│   ├── project_links
│   ├── conversation_index
│   └── memory_candidates
└── Client
    └── settings.section / agent-bridge
        ├── Overview
        ├── Import
        ├── Environments
        ├── Projects
        ├── Conversations
        ├── Activity
        └── Preferences
```

依赖方向：

```text
RPC → BridgeService → Controllers
                         ├─ Source adapters
                         ├─ Portable domain
                         ├─ Security policy
                         ├─ DSH target adapter/materializers
                         └─ Repositories
```

RPC 只负责输入校验、授权边界和 DTO 映射，不包含迁移业务逻辑。Client 永远不直接读取来源目录或决定安全策略。

Host 硬依赖候选：`storageDomain`、`subprocess`。可选依赖：`configEditor`；`credentials` 仅保留给未来远程后端，不能用于复制来源端凭证。

## 11. 测试方案

### 11.1 单元测试

- Portable identity：来源、scope、project、logical name 的稳定性。
- Normalizer：Markdown、Skill frontmatter、静态 resource 清单。
- Compatibility：native、adapted、archive-only、blocked。
- Comparison：首次导入、单边变化、双边变化、删除/修改、无 baseline 碰撞。
- Redactor：假 token、URL userinfo、header 和环境变量值。
- Path policy：traversal、绝对路径替换、symlink escape、未知格式和超限文件。
- Plan validation：过期 revision、hash 改变、ownership、Forbidden operation。
- 状态机：重复请求、取消、partial 和非法转换。

### 11.2 Adapter 契约测试

每个来源 adapter 使用临时 HOME、合成 fixtures 和假 CLI：

- probe：支持、不支持、版本过低、输出格式未知；
- discover：只访问白名单，不读取排除文件；
- timeout、非零退出、取消、输出截断；
- scripts fixture 永不执行；
- 输出中的假 secret 不进入结果或日志；
- 扫描中外部修改文件时将该项标记 unstable。

不得使用真实用户凭证或完整私人对话正文作为 fixture。

### 11.3 集成测试

- Claude source → Portable Artifact → DSH compatibility。
- Codex source → Portable Artifact → DSH compatibility。
- 同名不同来源不自动合并。
- 某一来源/类别失败时其余结果仍可用且状态为 partial。
- 两个客户端同时扫描只产生一个底层 scan。
- 计划后来源变化或 DSH revision 变化使计划过期。
- 两个执行请求只有一个获得 lease/fencing token。
- Host 重启后 interrupted run 可诊断。
- storage close/reopen 后 snapshot、baseline 和 materialization 一致。

### 11.4 Materializer 验证测试（Phase 2）

- Prompt 注册后出现在预期 scope 的 effective assembly。
- Skill 注册后出现在预期 scope/catalog，正文按需读取。
- 停用 environment 后所有 Agent Bridge contribution 被移除。
- 不遮蔽或删除非 Agent Bridge 管理的 contribution。
- verify 失败不会更新 baseline。
- rollback 后再次 verify。

### 11.5 UI 测试

- 首次接入、无来源、单个来源缺失、多个来源可用、DSH capability 缺失。
- native、adapted、archive-only、blocked 和 partial 状态。
- Import Plan 的风险、损失、跳过项和过期状态。
- 页面关闭后重开恢复 snapshot/run。
- 使用键盘完成筛选、详情审阅和计划确认。
- 屏幕阅读器标签、状态文字、错误焦点。
- `<700px` 单面板 drill-in。
- locale 和 light/dark theme。

### 11.6 安全回归测试

- 假 secret 不出现在 UI DOM、RPC、storage、Activity、日志或错误对象。
- `.env`、auth、credentials、token 路径未被打开。
- symlink 逃逸默认拒绝。
- 恶意 Hook/Skill script 扫描期间未执行。
- High 项不能通过批量选择绕过审批。
- 伪造 Client 请求仍被 Host policy 拒绝。
- Agent Bridge 不向 DSH Session append 自定义业务事件。

## 12. 失败模式

| 失败 | 检测 | 处理 | 用户可见结果 |
|---|---|---|---|
| 来源 CLI 不存在 | probe | 保留其他来源 | 明确安装或路径动作 |
| 版本/输出不兼容 | capability parser | 标记 unsupported/unknown | 不误报为未安装 |
| DSH 目标能力缺失 | target probe | compatibility 降级或 blocked | 显示缺失能力 |
| 路径逃逸 | realpath policy | 跳过 | 显示安全原因，不泄露敏感目标 |
| Secret 风险 | allowlist/redactor | 阻止或跳过 | 只显示类别和动作 |
| 扫描中文件变化 | 前后 stat/hash | 标记 unstable | 建议重新扫描 |
| 部分类别失败 | 分类隔离 | 保存 partial snapshot | 列出可信和失败类别 |
| 计划后状态变化 | hash/revision | 计划过期 | 重新审阅，不盲目执行 |
| DSH 目标被外部修改 | baseline compare | 冲突 | 保留用户修改 |
| verify 失败 | effective state inspection | 停止 baseline 更新并回滚 | 显示影响和恢复动作 |
| 回滚失败 | rollback verify | 停止后续操作 | 高优先错误和手工恢复路径 |
| 重复点击/多窗口 | lease + fencing | 复用或拒绝 | 跳转到当前任务 |
| Host 重启 | persisted run state | 标记 interrupted | 重新验证后恢复诊断 |
| storage 记录损坏 | schema validation | 可重建数据 backup-and-skip | baseline/materialization 不静默丢弃 |

所有失败至少留下脱敏 Activity；没有可恢复动作时必须明确说明。

## 13. 分阶段实施

### Phase 0：只读发现与 DSH 兼容性评估

范围：

- 插件骨架、display metadata、`settings.section` 入口；
- Claude、Codex 和 DSH endpoint probe；
- storage domain、secret/path policy；
- 只读发现 Instructions、`AGENTS.md`、`CLAUDE.md`、Skills 正文和静态 resource 清单；
- scripts 只记录路径、类型、大小和 hash，绝不执行；
- Portable Artifact normalization；
- DSH compatibility assessment；
- Overview、Import 只读预览、Activity。

明确不做：

- 不注册 DSH prompt、Skill 或 preset；
- 不修改 Claude、Codex 或 DSH runtime；
- 不扫描 Commands、Agent definitions、MCP、Plugins、Conversations；
- 不读取已知凭证载体。

验收：稳定展示 `source → portable artifact → proposed DSH target`，完整处理 partial 状态；假 secret 不泄露；恶意脚本未执行；路径逃逸被拒绝。

### Phase 1：不可变 DSH 导入计划 MVP

- 方向固定为 Claude/Codex → DSH；
- Instructions、项目规则和无脚本 Skills 作为首个计划切片；
- 每个来源分别生成目标 environment，不自动合并；
- 读取 DSH 当前有效状态并建立首次 baseline；
- 三路比较、冲突和 compatibility loss 展示；
- 不可变 Import Plan 和过期检查；
- 只生成计划，不让内容在 DSH runtime 生效。

验收：计划可解释、持久、无端点副作用；首次同名碰撞不会覆盖；source hash 或 DSH revision 变化会使计划过期。

实现状态（2026-11-10）：已完成。已在 Settings → Agent Bridge 中验证扫描、计划生成、operation 状态/风险展示，以及计划在新扫描后由 Fresh 变为 Expired；未执行任何 DSH runtime 写入。

### Phase 2：安全导入 DSH 闭环

- 用户确认后 materialize 到独立 DSH environment/preset；
- Instructions 使用 scoped prompt contribution；
- Skills 使用 Agent Bridge provider；
- 仅管理插件创建或用户明确接管的目标；MVP 不删除；
- verify effective prompt/skill/preset state；
- baseline、停用、回滚、operation lease、fencing token；
- Host 重启后的 interrupted run 诊断。

验收：导入环境可选择、可停用、可验证、可回滚；不影响非 Agent Bridge 管理的数据；重复执行幂等；外部修改会被拦截。

实现状态（2026-11-11）：已完成。已验证显式计划确认、执行前 Fresh 校验、path-safe storage、lease/fencing、独立 imported environment、effective preset verify、baseline 更新、Activity run、环境停用和 run 回滚；来源端保持只读。

### Phase 3：扩大迁移面与只读历史

Phase 3A-1 实现状态（2026-11-13）：已完成独立 Environments 页面，展示来源、artifact 明细、revision、verify 状态、last run 与启停状态；支持单 environment 重验、单 artifact 停用/恢复，并在 DSH 0.2.2-rc.2 冷启动后验证 storage materialization 与 preset 恢复。

Phase 3A-2 实现状态（2026-11-20）：已完成 DSH Workspace 选择、canonical path/Git repository/worktree identity 探测、候选置信度与原因、用户确认/拆分、持久 ProjectLink，并验证关联 revision 变化会令旧 Import Plan 过期；Git remote 在进入 hash 前移除 userinfo/query/fragment，不读取凭证。

Phase 3B 实现状态（2026-11-23）：已完成 Claude Code `commands/*.md`、项目 `.claude/commands/*.md` 与 Codex 兼容旧格式 `prompts/*.md` 的静态 Prompt Command 发现和 DSH scoped command wrapper；只展开 `$ARGUMENTS`/`{{ input }}` 等文本占位符并通过 `agent.steer` 提交用户消息，不执行参数或来源代码。带 shell/exec/hook/allowed-tools/tool frontmatter、shell code fence、可执行位或敏感内容的文件均阻塞。

后续范围：

- Agent definitions → preset/prompt/tool policy 的受控映射；
- 无秘密 MCP 定义和 Plugin 安装意图；
- 外部项目与 DSH workspace 关联；
- 对话元数据索引、搜索和官方 Markdown 导出；
- 导入 lineage 和重复检测。

验收：高风险能力不会因迁移自动启用；对话区分原生会话和导入副本；正文索引默认关闭。

### Phase 4：DSH 导出与受控自动化

- DSH → Claude Code / Codex / 其他 Harness 的 target adapters；
- 导出前 compatibility assessment 和不可变 Export Plan；
- 仅导出 portable、bridge-managed 或用户明确选中的数据；
- Memory Candidate 审批工作流；
- 低风险变化提醒；
- 稳定后评估低风险自动化和多机加密后端。

验收：目标端语义损失显式展示；不导出 DSH 私有内部状态或凭证；High/Forbidden 永不自动处理；循环导入通过 lineage/hash 去重。

## 14. 已核实事实、设计决定与待验证假设

### 14.1 已核实事实

- 当前仓库只有 README、方案文档和 `.gitignore`，尚无功能实现和 Git commit。
- DSH 当前提供 `settings.section`、`storageDomain`、`subprocess`、`systemPrompt`、`skills`、`agentPresets`、`commands`、`subagents` 和安全 settings view 等契约，具体见第 4 节。
- DSH 插件 UI 应使用 locale 和 theme tokens，不依赖私有 Client UI 包。
- 插件全局迁移状态应存入自己的 storage domain，不写入 DSH Session 自定义业务事件。

### 14.2 当前设计决定

1. 产品是多 Harness 迁移兼容层，当前主路径是 Claude Code/Codex → DSH。
2. Claude 与 Codex 的直接同步不是当前产品主干。
3. 中间模型保持 vendor-neutral，DSH 是当前 managed target，未来可成为导出 source。
4. 导入内容默认进入来源独立的 DSH environment/preset，不污染全局默认 Agent。
5. 第一版不自动合并 Claude 和 Codex 来源。
6. Phase 0 只做 Instructions、项目规则和 Skills 的只读发现与兼容性评估。
7. Phase 1 只生成计划；Phase 2 才在 DSH runtime 生效。
8. 端点只读不等于零落盘：允许保存脱敏的插件派生数据。
9. 带 scripts 的 Skill 是 High；扫描不执行，导入不自动赋予执行信任。
10. Forbidden 类别不可通过设置解锁。

### 14.3 待验证假设

- Claude Code、Codex 各来源目录和公开接口在目标版本上的稳定格式。
- Instructions 和 project rules 到 DSH scope 的精确映射。
- 导入 preset 的动态持久化和版本保留实现。
- Skills resource base 在不同 workspace 和 platform 下的安全寻址方式。
- Commands 与 Agent definitions 中可安全、等价迁移的最小子集。
- 未来 DSH → 目标 Harness 的公开写入能力。

## 15. 开始实现前仍需确认

以下决定不阻塞本次文档修订，但会影响实现：

1. 产品最终名称和图标方向。
2. 首发平台是否仅 macOS；Windows/Linux 会扩大路径、进程和锁测试矩阵。
3. 工程采用 TypeScript 单 package，还是纯 JavaScript 最小 bundle。
4. 测试 runner 是否允许引入 Vitest；新增依赖需单独批准。
5. Phase 0 storage 的最终保留期和卸载清理行为。
6. 导入 environment 的产品命名，以及是否允许用户选择“提升为全局贡献”。
7. Skills scripts 在 Phase 2 是默认完全不提供，还是只作为不可执行 resource 暴露。
8. Conversations 固定在 Phase 3，正文索引的实现方式后续单独评审。
9. “低成本切换”的市场表述是否采用本方案中的有限承诺，避免暗示所有平台专属数据无损迁移。
