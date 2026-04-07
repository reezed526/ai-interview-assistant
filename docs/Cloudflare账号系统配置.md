# Cloudflare 云同步数据配置

这份配置用于让你的 Cloudflare Pages 站点支持云端共享账号，并把错题本、面试过程状态、报告一起同步到 D1。

## 1. 确认 D1 数据库

如果你已经创建过 D1，可以直接继续使用原来的数据库。

如果还没有：

1. 进入 `Workers & Pages`
2. 打开 `D1 SQL Database`
3. 点击 `Create`
4. 新建数据库，例如：`ai-interview-auth`

## 2. 执行最新表结构 SQL

打开 D1 数据库的 `Console`，执行 [database/auth-schema.sql](c:\Users\45274\Desktop\ai-interview-assistant\database\auth-schema.sql) 全部内容。

这次 SQL 不只是用户表，还包括：

- `users`
- `notebook_entries`
- `interview_states`

如果你之前已经建过 `users` 表，也可以重复执行这份 SQL，`IF NOT EXISTS` 不会破坏已有表。

## 3. 检查 Pages 绑定

进入 Pages 项目：

1. 打开 `Settings`
2. 进入 `Bindings`
3. 确认已经有一个 D1 binding
4. Variable name 必须是：`DB`

## 4. 检查环境变量

进入 Pages 项目：

1. 打开 `Settings`
2. 进入 `Environment variables`

确认以下变量已经在 `Production` 和 `Preview` 中配置：

- `DEEPSEEK_API_KEY`
- `AUTH_SECRET`

## 5. 重新部署

推送最新代码后重新部署：

```powershell
git add .
git commit -m "sync user data to d1"
git push
```

## 6. 这次会上云的数据

现在会同步到云端的内容：

- 用户账号
- 登录状态
- 错题本
- 当前面试过程状态
- 当前面试报告

这意味着：

- 用户换浏览器或换设备后，登录同一账号仍能看到自己的错题本
- 如果用户中途退出，再次登录后还能恢复当前面试状态和报告

## 7. 部署后验证

建议按下面顺序验证：

1. 用户 A 在设备 1 注册并登录
2. 保存几条错题本
3. 开始一场面试，做到一半关闭页面
4. 在设备 2 登录同一账号
5. 检查错题本是否同步
6. 检查面试状态是否恢复
7. 完成面试并进入报告页
8. 再换设备登录，检查报告是否还在
