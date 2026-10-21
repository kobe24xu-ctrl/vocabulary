# Pages 免费备用入口

Pages 提供 `项目名.pages.dev` 免费域名，可供在当前 `workers.dev` 无法访问时尝试。该域名同样可能受到网络限制；必须在学校和学生的实际国内网络中关闭 VPN 验证网页加载、登录、保存与交卷，不能据部署成功承诺直连。

## 当前准备状态

已准备 Pages 高级模式部署包，包括静态页面和完整 `/api/*` 接口。Pages 直接绑定现有 D1 数据库，不把登录请求从浏览器转发到 `workers.dev`。master、学生密码、考试、词库和错题继续使用同一份数据；新地址需要重新登录。保留现有 Worker 和每五分钟清算逾期答卷的定时任务，避免两套独立数据库和迁移账号。

2026-10-21 的发布尝试被 Cloudflare API 拒绝：HTTP 403，错误代码 10000。当前授权不能读取 Pages 项目，因此尚未创建备用站点，也没有可提供的 Pages 地址。

## 所需权限

Cloudflare → My Profile → API Tokens → 当前 Token → Edit，增加当前账户的 `Account → Cloudflare Pages → Edit`，保留现有 Workers Scripts 和 D1 权限。如果只是编辑同一个 Token 的权限且值不变，无需重新填写密钥；若新建或重新生成 Token，请通过云环境的网络密钥 `CLOUDFLARE_API_TOKEN` 更新，不在聊天或 Git 中传递。

发布 API 使用已经允许的 `api.cloudflare.com`。若还要从本任务云环境核对备用网页，需要在云环境网络规则中允许 `*.pages.dev` 并保存应用；这只影响本云环境的核对请求，不会解除或改变学生网络的访问限制。

## 构建和发布

在已有依赖的云工作区运行：

```sh
npm run cf:pages:build
npm run cf:pages:deploy
```

构建输出在已忽略的 `dist/pages-site/`，包括 `_worker.js`、API 路由配置和现有静态资源。代码复用 `cloudflare/worker.mjs`。生产环境关闭演示模式，复用忽略的 `cloudflare/wrangler.deploy.json` 中的 D1 ID；不创建新数据库，不改变原 Worker、域名解析或计费套餐。

脚本默认新建 `lexiclass-classroom` 项目，以 `main` 为生产分支；如果同名项目已存在则停止，可用 `--project` 指定另一个名字，不覆盖其他项目。创建后把项目配置保存在忽略的 `data/pages-deployment.json`，后续复用，并核对数据库绑定和演示模式。首次创建若因全局名称占用失败，请选择其他项目名。

现有 master 已完成初始化，因此 Pages 不复制或读取原 Worker 的 `SETUP_KEY`，继续使用已有账号登录。不要在新入口重新初始化账号。学生收到的考试链接应使用实际测试通过的域名，新旧入口的数据相互可见。

此轮已完成打包与语法检查；因 Pages 权限不足尚未部署，没有运行登录、答题或中国大陆网络功能测试。
