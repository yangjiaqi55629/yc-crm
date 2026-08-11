# 元川 AI 轻量 CRM

独立的单人客户管理系统，用于承接元川 AI 门户网站的留资，并完成客户档案、跟进、CRM 内提醒和销售建议。

## 已实现

- 单账号登录、数据库会话与 HttpOnly Cookie
- 客户新增、编辑、搜索、筛选、归档与标签
- 手机号规范化去重
- 客户状态、门户留资历史和统一时间线
- 跟进记录、下次跟进时间、今日/逾期待办工作台
- 门户留资接收接口与事件幂等校验
- 同步接收端异常记录页
- AI 销售建议页面；配置兼容 OpenAI Chat Completions 的服务后调用真实模型，未配置时使用明确标识的本地规则建议

## 运行要求

- Node.js `>= 22.13`（目标服务器文档中的 Node.js 22.23.1 可用）
- npm

## 本地启动

1. 复制 `.env.example` 为 `.env.local`，并设置管理员密码和门户同步密钥。
2. 安装依赖：`npm install`
3. 启动开发环境：`npm run dev`
4. 访问 `http://localhost:3000/login`

首次登录会在数据库中创建一个管理员账号。开发环境未设置密码时，默认账号是 `admin`，默认密码是 `ChangeMe123!`；生产环境不会接受该默认值，必须设置 `CRM_ADMIN_PASSWORD`。

## 生产环境安全配置

- 默认情况下，生产环境登录 Cookie 仅会通过 HTTPS 发送。请在配置好域名和证书后保持 `CRM_SESSION_COOKIE_SECURE=true`（或不设置该变量）。
- 仅在受控的临时 HTTP 验证环境中，才可设为 `CRM_SESSION_COOKIE_SECURE=false`；启用 HTTPS 后必须删除该配置或改回 `true`。
- `CRM_ADMIN_PASSWORD`、`PORTAL_SYNC_SECRET`、AI 密钥等均只能保存在服务端环境文件中，不得写入仓库或以 `NEXT_PUBLIC_` 前缀暴露。

## 数据库

- 默认文件：`data/crm.db`
- 启动时自动执行 Drizzle 迁移
- SQLite 使用 WAL 和外键约束
- 迁移定义位于 `src/db/schema.ts`，生成的 SQL 位于 `src/db/migrations/`

## 门户接入接口

`POST /api/integrations/portal/leads`

请求体：

```json
{
  "eventKey": "门户侧唯一事件键",
  "portalLeadId": "门户 leads.id",
  "name": "客户姓名",
  "phone": "手机号",
  "email": "客户邮箱",
  "source": "web",
  "submittedAt": "2026-08-10T10:00:00+08:00"
}
```

生产环境请求必须使用以下 HMAC-SHA256 签名：

- `x-portal-timestamp`：ISO 时间戳
- `x-portal-signature`：对 `${timestamp}.${rawJsonBody}` 使用 `PORTAL_SYNC_SECRET` 计算的十六进制 HMAC-SHA256

同一个 `eventKey` 只会被处理一次；相同规范化手机号会合并为同一客户，并保留新的门户留资事件。

## 门户源代码接入

门户源码位于同级 `../portal` 目录时，已实现以下机制：

1. `crm_sync_outbox` 与门户留资在同一事务写入；
2. 留资提交后立即签名推送 CRM；
3. 失败事件使用指数退避自动重试；
4. CRM 的“同步异常”页面可查看门户失败队列并发起人工重试。

## 验证命令

```bash
npm run typecheck
npm run lint
npm run build
```
