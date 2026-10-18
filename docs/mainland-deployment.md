# 中国大陆免 VPN 部署方案

目标是：学生在中国大陆直接打开学校域名，安装应用、登录、答题、交卷和复习都只连接这一台应用服务。GitHub 用于开发代码托管，学生不需要访问 GitHub、npm、Google、外部字体/CDN、第三方登录或境外评分服务。

**目前尚未购买服务器、绑定域名或从中国大陆网络实测。** 应用代码没有这些外部运行依赖，但仅凭本地测试不能保证任意运营商、学校防火墙和域名的实际连通性。

## 建议落地方案

按阿里云中国大陆地域 ECS + 自有域名 + Nginx HTTPS 准备，腾讯云或学校已有服务器也可采用同样结构。先以 2 核 4 GB、Ubuntu 24.04、40 GB 系统盘作为部署起点；实际班级规模、带宽和同时交卷人数需要上线前压测，不能据此承诺并发容量。地域选择靠近学校的位置，例如华东学校可选上海。

由学校管理员购买和管理服务器、域名、证书与账单。在中国大陆使用公网域名时，按接入商要求完成备案，或使用学校已备案、获准接入的域名。DNS 可使用学校现有服务或国内云厂商的域名解析，不要求学生更改 DNS。

```text
Windows Edge / macOS Safari 或 Chrome
            │ HTTPS 443，同一学校域名
中国大陆云服务器：Nginx + 已签发的可信证书
            │ 127.0.0.1:3000
       Node.js 24 应用
            │ 本机持久化
          SQLite
```

应用主流程运行时不需要向外部服务器发起请求。英文朗读只选择浏览器标记为 `localService=true` 的本地英文语音；缺少语音包时提示安装，不回退到在线语音。学校应在发给学生前安装好系统英文离线语音包，实际朗读还需在目标 Windows/Mac 上验收。

## 国内部署包

开发者可从确认过的 Git 提交生成源码部署包，并附 SHA-256 校验文件。部署包不包含学生数据、设置密钥、`.env`、Git 凭据或 `node_modules`：

```bash
mkdir -p dist
git archive --format=tar.gz --output=dist/lexiclass-server-cn.tar.gz HEAD
cd dist
sha256sum lexiclass-server-cn.tar.gz > lexiclass-server-cn.tar.gz.sha256
```

由管理员把部署包上传到国内服务器。应用运行时仅使用 Node.js 内置模块，因此**生产服务器不需要从 GitHub 拉代码、运行 npm install 或下载 Docker 镜像**。开发测试用的 Playwright 不参与生产运行。

管理员另行准备 Node.js 24 的可信 Linux 发行包和 Nginx；从可信发行渠道取得，并使用官方校验值或签名核验，不关闭 TLS/校验。按照以下布局安装：

| 路径                                     | 内容                                           |
| ---------------------------------------- | ---------------------------------------------- |
| `/opt/node24/bin/node`                   | 经校验的 Node.js 24 运行时                     |
| `/opt/lexiclass`                         | 解压后的应用源码                               |
| `/var/lib/lexiclass`                     | 学生数据与首次设置密钥，systemd 创建并限制权限 |
| `/etc/lexiclass/lexiclass.env`           | 实际学校域名                                   |
| `/etc/nginx/ssl/lexiclass/fullchain.pem` | 域名的完整可信证书链                           |
| `/etc/nginx/ssl/lexiclass/privkey.pem`   | 证书私钥，仅管理员可读                         |

不要用临时自签名证书替代正式可信证书，也不要要求学生忽略浏览器证书错误。证书续期由学校管理员或云厂商的证书管理服务负责，不让学生端承担证书下载或境外访问。

## 启动配置

1. 在服务器上校验部署包：`sha256sum -c lexiclass-server-cn.tar.gz.sha256`，校验文件应从可信渠道取得。解压到 `/opt/lexiclass`。
2. 创建无交互登录的专用系统账号 `lexiclass`，程序目录只读、数据目录归该账号所有。
3. 将 `deploy/mainland/lexiclass.env.example` 复制为 `/etc/lexiclass/lexiclass.env`，填写真实 `PUBLIC_ORIGIN`，例如学校批准的 `https://words.school.edu.cn`，不带末尾斜杠。
4. 将 `deploy/mainland/lexiclass.service` 安装到 `/etc/systemd/system/lexiclass.service`，确认 Node 和源码的实际路径一致，然后执行 `systemctl daemon-reload` 和 `systemctl enable --now lexiclass`。
5. 从国内云厂商证书控制台取得对应域名的可信证书链与私钥，按表中路径安装，限制私钥权限。
6. 将 `deploy/mainland/nginx.conf` 的两处示例域名替换为真实域名，并安装到 Nginx 配置目录；运行 `nginx -t` 成功后再重新加载 Nginx。应用的 `PUBLIC_ORIGIN` 必须与访问域名一致。
7. 将域名 A 记录解析到服务器公网 IPv4。若尚未配置 IPv6，不要发布指向不可达地址的 AAAA 记录。云防火墙开放 80/443；3000 端口仅本机使用，管理端口按学校运维要求限制。
8. 在服务器上私下打开 `/var/lib/lexiclass/setup-key`，通过正式 HTTPS 域名建立教师账号，再录入班级、学生、词库。所有学生入口应在正式域名上生成。

这套方案不依赖 Docker Hub 镜像拉取或自动 ACME 证书签发。已有 Docker/Caddy 方案仍可使用，但管理员要先解决镜像获取、证书签发与续期的实际连通性；不能把它们当作学生免 VPN 使用的前提。

## 中国大陆实网验收

在正式投入课堂前，由学校用**关闭 VPN/代理的真实电脑**检查以下行为。至少覆盖实际学校网络与一条校外国内网络；条件允许时分别测试电信、联通、移动。

1. Windows 使用自带 Edge、Mac 使用 Safari 打开正式域名，确认无证书警告。浏览器开发者工具网络面板中，应用网页、脚本、样式、图片和 API 请求均来自学校域名。
2. 使用测试班级和测试学生，完整走一遍登记姓名、查看定时任务、开始、自动保存、刷新恢复和交卷。教师端应看到正确的学生姓名、班级和成绩。
3. 提交一个错误答案，确认错题进入该学生的复习本，其他班级或学生看不到该记录。
4. 安装到电脑桌面后关闭再打开，确认仍可登录并查看任务。Windows 可直接使用 Edge 安装，不要求下载 Chrome 或登录 Google 账号。
5. 测试电脑安装离线英文语音包后朗读场景句；确认缺少离线包时只提示安装，不自动调用在线语音。
6. 记录 DNS/连接时间、网页加载与交卷响应，按真实班级人数做并发验收。若学校网关拦截新域名，由网管放行学校域名；学生无需安装 VPN。

仓库中的浏览器检查会阻断第三方站点，验证主要教学流程仍能完成，并验证不会主动请求这些站点。这证明应用的依赖边界，**不等于已经完成上述国内实网验收或获得运营商连通保证**。
