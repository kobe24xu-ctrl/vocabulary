# 学院蓝：五套真实字体预览

用户已选择学院蓝配色与布局，本轮提供字体比较，等待用户选择字体后再应用全站。

- `/font-options.html`：相同页面切换五套字体；`?font=wenkai|xihei|xiaowei|smiley|kuaile` 可分别分享。
- `#font-comparison`：五套实际浏览器渲染截图，直接放在一起比较。
- 01 清润文楷：霞鹜文楷，标题与正文。
- 02 轻柔黑体：霞鹜新晰黑，标题与正文。
- 03 书卷细宋：站酷小薇体，标题与正文。
- 04 灵动标题：得意黑标题＋文楷正文。
- 05 圆润活泼：站酷快乐体标题＋文楷正文。

所有字体、脚本、图片均同源部署；不依赖用户电脑安装字体，不调用Google字体/CDN，不读取账号或学生成绩。没有更换正式考试页的字体。

## 字体来源

字体来源与完整授权文件位于 `/font-licenses.html`。霞鹜文楷、站酷小薇体、得意黑、站酷快乐体使用SIL OFL 1.1；霞鹜新晰黑使用IPA Font License 1.0，同时分发未修改的原版字体及替换方法。

本页只渲染固定示例。字体预览文件是精简字形、重新命名的衍生版本 Classwords Preview 1–5；正式应用时需要准备覆盖实际词汇、姓名和课程内容的字体版本，不能把这些预览子集直接用在任意内容上。

源文件下载地址：

- 霞鹜文楷：`https://raw.githubusercontent.com/lxgw/LxgwWenKai/main/fonts/TTF/LXGWWenKai-Regular.ttf`；OFL.txt同仓库根目录。
- 霞鹜新晰黑v1.308：`https://github.com/lxgw/LxgwNeoXiHei/releases/download/v1.308/LXGWNeoXiHei.ttf`；LICENSE.md同仓库根目录。
- 站酷小薇：`https://raw.githubusercontent.com/google/fonts/main/ofl/zcoolxiaowei/ZCOOLXiaoWei-Regular.ttf`；OFL.txt同目录。
- 得意黑v2.0.1：`https://github.com/atelier-anchor/smiley-sans/releases/download/v2.0.1/smiley-sans-v2.0.1.zip`；LICENSE同仓库根目录。
- 站酷快乐：`https://raw.githubusercontent.com/google/fonts/main/ofl/zcoolkuaile/ZCOOLKuaiLe-Regular.ttf`；OFL.txt同目录。

构建依赖fonttools与brotli，源文件SHA256保存在 `font-preview-manifest.json`。在准备好五份原始字体和授权文件的目录后，可运行 `python scripts/build-font-previews.py --font-dir /path/to/fonts`；源文件命名为 `wenkai.ttf`、`xihei.ttf`、`xiaowei.ttf`、`smiley.ttf`、`kuaile.ttf`，授权文件为对应 `*-license.txt`。

浏览器渲染时用Chromium平台字体信息确认标题及正文实际使用下载的字体；同一套布局逐一输出样张。预览覆盖所有可见中文，字体样张图片支持不安装字体的电脑直接比较。
