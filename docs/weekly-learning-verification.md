# 每周词汇与五选项检查

基线：`0452707`，CI run `41214027340`。本地复现 37 通过、1 失败，
唯一失败是旧测试要求 4 个选项，实际按用户要求生成 5 个。

本次仅更新测试：

- 将选项总数及去重数改为 5；保留题目数 4 的断言。
- 保留大小写、标点标准化、拼写错误不模糊放行、空白不判对的断言。
- Node 与本地 D1 双后端新增每周词汇检查：无考试即可访问、班级课程及
  UOW 共用映射、周次/单元、双语例句、学习数据字段范围、认证及角色限制。
- 确认学习不会生成考试、成绩或错题，客户端传入其他班级/项目不能改变范围。
- 浏览器核查学生侧栏、科目和单元筛选、两门 UOW 英语词库与无管理入口。
- 两个独立浏览器脚本按现有的班级、科目、默认全选流程更新测试准备步骤，
  移除对已不存在的 `audienceMode` 控件的依赖。

本地结果：

```sh
SHARED_BROWSER=1 BROWSER_PATH=/usr/bin/chromium BROWSER_NO_SANDBOX=1 npm test
# 41 passed, 0 failed
BROWSER_PATH=/usr/bin/chromium BROWSER_NO_SANDBOX=1 npm run test:browser
BROWSER_PATH=/usr/bin/chromium BROWSER_NO_SANDBOX=1 npm run test:demo
python scripts/deploy-cloudflare-pages.py --build-only
node_modules/esbuild/bin/esbuild public/app.js --bundle --format=esm --outfile=dist/ci-browser-build.js
npm run demo:build
```

两项独立浏览器流程及三项构建成功。全部数据使用隔离环境；未操作正式学生成绩、
创建生产考试、调用生产模型或重新部署。独立演示通过内存 HTML 与禁止联网的浏览器
验证，受环境限制未验证 Windows/macOS 上双击 `file://` 打开。

现有 CI 运行 `npm test`，未开启可选的 `SHARED_BROWSER` 分支，预期为 40 项。
GitHub API 被环境拒绝时，可从允许访问的 GitHub Actions 网页核对提交及运行状态。
