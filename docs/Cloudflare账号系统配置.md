# Cloudflare 账号系统配置

这份配置用于让你的 Cloudflare Pages 站点支持云端共享账号，并把错题本、面试过程状态、报告同步到 D1。

## 1. 确认 D1 数据库

如果你已经创建过 D1，可以继续使用原来的数据库。  
如果还没有：

1. 进入 `Workers & Pages`
2. 打开 `D1 SQL Database`
3. 点击 `Create`
4. 新建数据库，例如 `ai-interview-auth`

## 2. 判断你当前属于哪种结构

打开 D1 Console，执行：

```sql
PRAGMA table_info(users);
```

根据结果判断：

- 没有 `username` 列：你还是旧的邮箱登录结构
- 有 `username` 列，但还有 `email` 列：你已经迁过一次，但还没彻底删掉邮箱列
- 只有 `username`，没有 `email`：已经是最终结构

## 3. 从旧邮箱结构直接迁到最终结构

如果你现在还没有 `username` 列，执行：

- [username-migration.sql](/c:/Users/45274/Desktop/ai-interview-assistant/database/username-migration.sql)

这个脚本会：

- 从旧 `email` 登录结构迁移到 `username`
- 不再保留 `email` 列
- 保留用户密码、配额和历史数据

## 4. 如果你已经有 username，但还没删 email

如果你当前表里同时有 `username` 和 `email` 两列，执行：

- [remove-email-column.sql](/c:/Users/45274/Desktop/ai-interview-assistant/database/remove-email-column.sql)

这个脚本会：

- 保留 `username`
- 删除 `email` 列
- 保留用户密码、配额和历史数据

## 5. 全新环境直接执行最新表结构

如果你是全新环境，没有历史用户数据，直接执行：

- [auth-schema.sql](/c:/Users/45274/Desktop/ai-interview-assistant/database/auth-schema.sql)

它会创建：

- `users`
- `interview_attempts`
- `notebook_entries`
- `interview_states`

## 6. 重置所有普通账号为 10 次免费面试

如果你要把所有普通账号免费次数重置为 10 次，并清零已用次数，执行：

- [reset-free-quota-to-10.sql](/c:/Users/45274/Desktop/ai-interview-assistant/database/reset-free-quota-to-10.sql)

这个脚本会：

- 把所有普通账号的 `interview_quota` 设为 `10`
- 把所有普通账号的 `interview_used` 清零
- 保留你的白名单账号不变

## 7. 检查 Pages 绑定

进入 Pages 项目：

1. 打开 `Settings`
2. 进入 `Bindings`
3. 确认已经有一个 D1 binding
4. Variable name 必须是 `DB`

## 8. 检查环境变量

进入 Pages 项目：

1. 打开 `Settings`
2. 进入 `Environment variables`

确认以下变量已经在 `Production` 和 `Preview` 中配置：

- `DEEPSEEK_API_KEY`
- `AUTH_SECRET`

## 9. 推荐执行顺序

如果你还是旧邮箱结构：

1. 先执行 [username-migration.sql](/c:/Users/45274/Desktop/ai-interview-assistant/database/username-migration.sql)
2. 再执行 [reset-free-quota-to-10.sql](/c:/Users/45274/Desktop/ai-interview-assistant/database/reset-free-quota-to-10.sql)
3. 最后部署最新代码

如果你已经有 `username`，只是还没删掉 `email`：

1. 先执行 [remove-email-column.sql](/c:/Users/45274/Desktop/ai-interview-assistant/database/remove-email-column.sql)
2. 再执行 [reset-free-quota-to-10.sql](/c:/Users/45274/Desktop/ai-interview-assistant/database/reset-free-quota-to-10.sql)
3. 最后部署最新代码

## 10. 推送并重新部署

数据库处理完成后，再推送最新代码：

```powershell
git add .
git commit -m "remove email column from auth schema"
git push
```

如果你的 Cloudflare Pages 已连接 Git 仓库，推送后会自动重新部署。

## 11. 部署后验证

建议按下面顺序验证：

1. 查询 `PRAGMA table_info(users);`，确认已经没有 `email` 列
2. 用你的白名单账号登录，确认仍然正常
3. 新注册一个用户名账号
4. 用不存在的用户名登录，确认会提示“该用户名还没有注册”
5. 点击错误提示里的“去注册”，确认能切到注册页签
6. 完成一次面试，确认错题本和报告能正常保存
