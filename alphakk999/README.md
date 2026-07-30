# Alpha Rebirth 隐藏副本

该目录是线上私人 Alpha Rebirth 界面。原有打卡、双侧图片栏、登录、PWA 和数据同步继续保留；`workspace-cloud.js` 增加一人公司经营工作台。

## 数据边界

- GitHub 只保存页面和 Edge Function 代码。
- 完整 Markdown、目录、附件、路径、Wiki 双链和搜索索引留在本机。
- 云端只保存 `alpha-rebirth-cloud-package/v1` 脱敏经营快照。
- 工作台必须登录后访问，页面继续使用 `noindex` 与 `no-store`。

## 接口

`/api/a8-knowledge`：

- `GET`：需要 Alpha 登录会话，读取当前私人经营快照。
- `PUT`：接受 Alpha 登录会话，或专用同步令牌。
- 最大请求体 `100 KB`。
- 服务端重新校验 Schema、隐私声明、禁用字段、体积和 SHA-256 摘要。
- 新版本写入前保留上一版 KV 记录。

自动推送需要在 EdgeOne 配置：

```text
ALPHA_CLOUD_SYNC_TOKEN_HASH=<专用同步令牌的 SHA-256>
```

本地 Alpha 配置同一令牌的明文 `ALPHA_CLOUD_SYNC_TOKEN`，不得将明文提交到 GitHub。

## 首次同步

本地生成脱敏 JSON：

```bash
npm run cloud:export
```

登录线上隐藏副本，打开「工作台 → 同步状态」，选择生成的 `alpha-rebirth-cloud-package.json`。确认人工链路稳定后，再启用 `npm run cloud:push` 自动同步。
