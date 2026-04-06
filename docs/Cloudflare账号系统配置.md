# Cloudflare 共享注册登录配置

这份配置用于让你的 Cloudflare Pages 站点支持“所有用户共享注册和登录”。

## 1. 创建 D1 数据库

进入 Cloudflare 控制台：

1. 打开 `Workers & Pages`
2. 进入 `D1 SQL Database`
3. 点击 `Create`
4. 新建一个数据库，例如：`ai-interview-auth`

创建完成后，记下数据库名称。

## 2. 初始化用户表

打开刚创建的 D1 数据库，进入 `Console` 或 `Query` 页面，执行 [database/auth-schema.sql](c:\Users\45274\Desktop\ai-interview-assistant\database\auth-schema.sql) 里的 SQL：

```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

## 3. 给 Pages 项目绑定 D1

进入你的 Pages 项目：

1. 打开 `Settings`
2. 进入 `Bindings`
3. 选择 `Add binding`
4. 类型选 `D1 database`
5. Variable name 填：`DB`
6. 选择你刚创建的数据库

这个名字必须是 `DB`，因为代码里认证接口就是从 `context.env.DB` 读取数据库。

## 4. 配置环境变量

进入 Pages 项目：

1. 打开 `Settings`
2. 进入 `Environment variables`
3. 分别在 `Production` 和 `Preview` 添加：

- `DEEPSEEK_API_KEY`
- `AUTH_SECRET`

其中：

- `DEEPSEEK_API_KEY`：你现有的 DeepSeek key
- `AUTH_SECRET`：一段你自己生成的长随机字符串，建议至少 32 位

示例：

```text
AUTH_SECRET=8f7c3f0f1a934c1f8c9e25bd7e9a4f62
```

`AUTH_SECRET` 用于签名登录 Cookie。改掉它会导致所有已登录用户失效，这是正常现象。

## 5. 重新部署

代码推送后重新部署：

```powershell
git add .
git commit -m "add cloudflare shared auth"
git push
```

Cloudflare 会自动重新构建。

## 6. 上线后验证

部署完成后，至少验证：

1. 在浏览器 A 注册一个新账号
2. 退出登录
3. 在浏览器 B 或无痕窗口用同一账号登录
4. 确认可以成功登录
5. 再尝试注册同一邮箱，应该提示已注册

## 7. 当前范围说明

这次改造已经让“注册和登录”变成云端共享账号。

当前仍然保存在浏览器本地的数据：

- 错题本
- 面试中的临时会话状态

如果你下一步还要“用户换设备后也能看到自己的错题本和历史记录”，那就需要继续把这些数据也迁移到 D1。
