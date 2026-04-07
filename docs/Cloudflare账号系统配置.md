# Cloudflare 账号系统配置

这份配置用于让你的 Cloudflare Pages 站点支持云端共享账号，并把错题本、面试过程状态、报告同步到 D1。

## 1. 确认 D1 数据库

如果你已经创建过 D1，可以继续使用原来的数据库。  
如果还没有：

1. 进入 `Workers & Pages`
2. 打开 `D1 SQL Database`
3. 点击 `Create`
4. 新建数据库，例如 `ai-interview-auth`

## 2. 先看当前库是不是老结构

如果你的 `users` 表原来还是邮箱登录结构，需要先执行用户名迁移脚本，再部署新代码。

老结构通常是这样：

- `users.email` 是 `NOT NULL UNIQUE`
- 没有 `users.username` 字段

## 3. 执行用户名迁移

打开 D1 数据库的 `Console`，先执行：

- [username-migration.sql](/c:/Users/45274/Desktop/ai-interview-assistant/database/username-migration.sql)

这个脚本会：

- 新建真正的 `username` 列
- 把旧 `email` 列里的登录标识迁移到 `username`
- 保留 `email` 字段为可选字段
- 重建 `users` 表和唯一索引

注意：

- 这是一次性迁移脚本，适合从旧结构升级
- 执行前建议先备份 D1 数据
- 必须先跑这个脚本，再部署新的认证代码

## 4. 新环境直接执行最新表结构

如果你是全新环境，没有历史用户数据，直接执行：

- [auth-schema.sql](/c:/Users/45274/Desktop/ai-interview-assistant/database/auth-schema.sql)

它会创建：

- `users`
- `interview_attempts`
- `notebook_entries`
- `interview_states`

## 5. 检查 Pages 绑定

进入 Pages 项目：

1. 打开 `Settings`
2. 进入 `Bindings`
3. 确认已经有一个 D1 binding
4. Variable name 必须是 `DB`

## 6. 检查环境变量

进入 Pages 项目：

1. 打开 `Settings`
2. 进入 `Environment variables`

确认以下变量已经在 `Production` 和 `Preview` 中配置：

- `DEEPSEEK_API_KEY`
- `AUTH_SECRET`

## 7. 推送并重新部署

迁移完成后，再推送最新代码：

```powershell
git add .
git commit -m "migrate auth to username column"
git push
```

如果你的 Cloudflare Pages 已连接 Git 仓库，推送后会自动重新部署。

## 8. 如果你要把所有普通账号免费次数重置为 10 次

打开 D1 数据库的 `Console`，执行：

- [reset-free-quota-to-10.sql](/c:/Users/45274/Desktop/ai-interview-assistant/database/reset-free-quota-to-10.sql)

这个脚本会：

- 把所有普通账号的 `interview_quota` 设为 `10`
- 把所有普通账号的 `interview_used` 清零
- 保留你的白名单账号不变

建议顺序：

1. 先执行用户名迁移（如果你的库还是旧结构）
2. 再执行免费额度重置脚本
3. 最后部署最新代码

## 9. 部署后验证

建议按下面顺序验证：

1. 用一个旧账号登录，确认还能正常进入
2. 新注册一个用户名账号
3. 用不存在的用户名登录，确认会提示“该用户名还没有注册”
4. 点击错误提示里的“去注册”，确认能切到注册页签
5. 完成一次面试，确认错题本和报告能正常保存
6. 换一个设备或浏览器重新登录，确认数据仍然存在
