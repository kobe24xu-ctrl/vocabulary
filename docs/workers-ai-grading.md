# Workers AI 语义判分

正式 Cloudflare 版本使用 `AI` Workers AI 绑定，模型为
`@cf/meta/llama-3.1-8b-instruct-fast`。用户已确认账户是 Free 套餐；部署不会更改套餐。
当前 Token 无权读取订阅及 AI 模型列表；未更改 Token 或开通付费服务。

## 判分范围

- 先执行原标准答案和同义答案匹配。
- 仅把未匹配、非空的英译中中文释义交给模型，接受语境一致的同义表达。
- 英文拼写、选择题和空白答案仍执行原规则。
- 每批最多 20 题，并行处理；每批等待最多 12 秒。只接受完整、无重复且 id 有效的 JSON 判定。
- 模型认为不确定、输出异常、额度不足或调用失败时，不擅自加分。
- 单份考试结果保存模型名称、判分策略版本和每题判分来源；不回改历史成绩。

考试故障会保留提交，按预设答案计分并显示待老师复核提示。错题复习遇到模型故障会返回
503，原复习进度保持不变。超过 200 字的未匹配释义不发送给模型，按同样策略处理。
当前提示只告知联系 master 复核，没有新增在线改分功能。

模型只收到学科、目标词汇、题干、参考答案和本题作答，不收到姓名、班级、账号或密码。
不使用 ChatGPT 登录态或浏览器 API Key。模型判断仍可能出错。

## 部署

Pages：`python scripts/deploy-cloudflare-pages.py --enable-workers-ai`。
此参数只添加已有项目的生产 AI 绑定，保留原 D1、环境变量及其他配置。
原 Worker 定时交卷也必须带有 `"ai": {"binding": "AI"}` 并部署相同代码，
以保证手动提交与到时交卷采用相同规则。

设置运行时变量 `SEMANTIC_GRADING=false` 可以停止语义调用。
Node 本地版本与独立演示不绑定 Cloudflare AI，继续执行预设答案匹配。

## 可选 OpenAI API 接入（当前未启用）

已准备 OpenAI Responses API 适配层。当前仍使用 Workers AI，未配置或试调用付费 API。
模型 ID 必须是该 OpenAI API 账户实际可用的 ID；没有将聊天中的 Luna 名称当作已验证 ID。
决定切换后，在 **Pages 正式环境和原 Worker** 同时配置：

- `GRADING_PROVIDER=openai`
- `OPENAI_GRADING_MODEL`：账户实际可用的模型 ID。
- `OPENAI_API_KEY`：使用 Cloudflare Secret 保存，不能提交 Git 或填入前端代码。

两端须使用相同配置，保证手动交卷和定时交卷一致。缺少 Key 或模型时不调用 API。
OpenAI 模式支持未匹配预设答案的中英文填空语义判断；英文要求拼写正确。
数学符号和选择题仍按标准答案判断，不发给任何 AI。先按预设答案匹配可以减少调用。
请求仅包含题干、学科、参考答案、方向和本题作答，不发送学生姓名、账号或班级，
并设置 `store=false`。30 秒超时会中断 OpenAI 请求，按原有规则保留提交并显示回退提示。
OpenAI API 独立计费；当前用户正在比较免费额度，继续保留 Workers AI。

Cloudflare 当前提供每日 10,000 Neurons 免费额度，额度是账户共享，无法保证对应固定题量。
Free 超额请求会失败；如果未来更换为 Paid，超额可能收费，须重新检查费用策略。
参考：https://developers.cloudflare.com/workers-ai/platform/pricing/

本轮按要求不新增或运行测试，不在生产创建试卷、修改成绩或进行模型试调用。
部署成功仅证明代码构建与绑定配置完成，真实语义效果需在使用中确认。
