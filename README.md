# Agent Bridge

Agent Bridge 是面向 DeepSeek Harness（DSH）的 Agent 环境迁移与兼容层。当前目标是安全地发现 Claude Code 与 Codex 中可移植的数据，将其转换为与来源无关的中间模型，并在用户审阅后导入 DSH，使用户无需手工复制和重写即可切换到 DSH。

未来将支持从 DSH 导出到 Claude Code、Codex及其他 Harness。Agent Bridge 不做用户目录镜像，也不承诺迁移平台专属内部状态。

## 项目状态

Phase 3A-1 环境管理已实现并安装验证：在 Phase 2 安全导入闭环之上，增加独立 Environments 页面、来源与 artifact 明细、revision、verify 状态、last run、单 environment 重验和单 artifact 启停，并验证 DSH 冷启动后的持久化恢复。

当前版本只 materialize Agent Bridge 自己管理的 Instructions 与无脚本 Skills；不会修改 Claude Code、Codex 或项目文件，不传播删除，也不会自动处理 High/Forbidden 类别。

## 当前主路径

```text
Claude Code ─┐
             ├─→ 可移植中间模型 ─→ DSH 原生能力
Codex ───────┘
```

计划支持的数据包括：

- 用户级和项目级 Instructions
- `AGENTS.md` / `CLAUDE.md`
- Skills 及其静态 references、assets 和 scripts
- 后续阶段的 Commands、Agent definitions、无秘密 MCP 定义和插件安装意图
- 项目关联信息
- 后续阶段的历史对话只读索引和经审批的记忆候选

## 核心原则

- 所有端点变更或 DSH 运行时生效操作都先生成可审阅、不可变的迁移计划。
- 优先使用来源端公开稳定接口和 DSH 原生 Cordis 服务。
- 中间模型不绑定 Claude Code、Codex 或 DSH 的私有存储格式。
- 不读取或迁移已知凭证载体中的秘密值，不同步 API Key、OAuth、Cookie、Token 或 Keychain 数据。
- 不直接依赖或修改 SQLite、WAL、SHM、session index 或活动会话记录。
- 扫描期间不执行 Hook、Skill script 或其他被扫描代码。
- 冲突不采用“最后修改时间获胜”，而使用上次成功导入 baseline、来源当前状态和 DSH 当前状态进行三路比较。
- 导入后必须验证 DSH 的实际有效能力，而不只检查文件是否存在。
- 平台专属或无法安全转换的数据必须显示兼容性损失、归档建议或阻塞原因，不能静默丢弃。

## “低成本切换”的范围

对明确支持的可移植类别，用户无需手工复制和重写；Agent Bridge 负责发现、转换、预览、导入和验证。

以下内容不承诺无损迁移：凭证、权限与沙盒放宽、平台专属 Hook 或工具行为、内部数据库、活动会话运行状态，以及没有稳定公开接口的数据。

## 文档

- [产品与技术方案](docs/product-and-technical-design.md)

## 计划阶段

1. 只读发现 Claude Code/Codex 数据并评估 DSH 兼容性。
2. 为 Instructions、项目规则和 Skills 生成不可变 DSH 导入计划。
3. 将获批内容安全导入独立 DSH 环境，并完成验证和回滚闭环。
4. 扩展 Commands、Agent definitions、MCP/Plugin 意图、项目和对话索引。
5. 支持从 DSH 导出到其他 Harness、记忆候选和受控自动化。

## 开发验证

```bash
pnpm install
pnpm run verify
```

`verify` 依次执行 TypeScript 检查、Vitest 测试和 Host/Client 构建。构建产物写入 `lib/`，不会自动安装或启用插件。

## License

待确定。
