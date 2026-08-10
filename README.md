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
- AI 销售建议页面；在未配置模型前使用明确标识的本地规则建议

## 运行要求

- Node.js `>= 22.13`（目标服务器文档中的 Node.js 22.23.1 可用）
- npm

## 本地启动

1. 复制 `.env.example` 为 `.env.local`，并设置管理员密码和门户同步密钥。
2. 安装依赖：`npm install`
3. 启动开发环境：`npm run dev`
4. 访问 `http://localhost:3000/login`

首次登录会在数据库中创建一个管理员账号。开发环境未设置密码时，默认账号是 `admin`，默认密码是 `ChangeMe123!`；生产环境不会接受该默认值，必须设置 `CRM_ADMIN_PASSWORD`。

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

## 门户源代码待接入项

当前工作区没有门户网站的源码，因此本仓库已完成 CRM 接收端，但未直接修改门户。获取门户项目后，需要依照 [技术方案](../technical-design.md) 第 4 节完成：

1. 创建 `crm_sync_outbox`；
2. 在门户 `POST /api/leads` 成功时写入 Outbox；
3. 立即调用 CRM 接收接口；
4. 对失败事件做指数退避重试；
5. 提供供 CRM 同步异常页查询和人工重试的受保护接口。

## 验证命令

```bash
npm run typecheck
npm run lint
npm run build
```
