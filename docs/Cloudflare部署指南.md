# Cloudflare 部署指南

本项目已经适配为 `Cloudflare Pages + Pages Functions` 部署方式。

## 1. 部署前准备

确保你已经有：

- 一个 GitHub 账号
- 一个 Cloudflare 账号
- 一个可用的 `DEEPSEEK_API_KEY`
- 当前项目代码已经推送到 GitHub 仓库

## 2. 推送代码到 GitHub

在项目根目录执行：

```powershell
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin 你的仓库地址
git push -u origin main
```

如果你的仓库已经存在，只需要继续正常 `git add` / `git commit` / `git push` 即可。

## 3. 在 Cloudflare 创建 Pages 项目

进入 Cloudflare 控制台：

1. 打开 `Workers & Pages`
2. 点击 `Create application`
3. 选择 `Pages`
4. 选择 `Connect to Git`
5. 授权并选择你的 GitHub 仓库

## 4. 构建配置

创建项目时填写：

- Framework preset: `Vue`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: 留空

这个项目仓库里已经包含：

- `functions/`：Cloudflare Pages Functions 接口
- `wrangler.toml`：Cloudflare 配置
- `public/_redirects`：前端路由回退配置

## 5. 配置环境变量

在 Cloudflare Pages 项目设置里，添加环境变量：

- Key: `DEEPSEEK_API_KEY`
- Value: 你的 DeepSeek Key

建议在以下两个环境都配置：

- Production
- Preview

## 6. 开始部署

点 `Save and Deploy` 后，Cloudflare 会自动：

- 安装依赖
- 执行 `npm run build`
- 发布前端页面
- 同时部署 `functions/api/chat.js` 和 `functions/api/evaluate.js`

部署完成后，你会拿到一个 `*.pages.dev` 域名。

## 7. 部署后验证

至少检查这几个页面：

- `/`
- `/interview`
- `/report`
- `/notebook`

再实际试一轮：

1. 进入首页
2. 选择岗位并填写 JD
3. 开始面试
4. 检查是否能正常追问、切换主问题、结束面试
5. 检查报告页是否能正常出分

## 8. 绑定自定义域名

如果你有自己的域名：

1. 进入 Pages 项目
2. 打开 `Custom domains`
3. 添加域名
4. 按 Cloudflare 提示完成 DNS 配置

如果域名本身就在 Cloudflare 托管，配置会更简单。

## 9. 后续更新方式

以后更新代码，只需要：

```powershell
git add .
git commit -m "update"
git push
```

Cloudflare 会自动重新构建并部署。

## 10. 当前项目对应的接口路径

线上接口会直接走同域名下的：

- `/api/chat`
- `/api/evaluate`

前端不需要单独改成别的后端地址。
