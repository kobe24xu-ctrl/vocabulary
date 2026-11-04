# NCUK 商务与经济 Topic 词库

来源：用户上传的 `商务Topic A-E单词.zip` 和 `经济单词.zip`。
商务现有 A–E 五个 Topic；经济微观 A–O、宏观 P–Z。原文 E、F 合并，
保留为 Topic E–F，不虚构拆分或周次。

正文共提取商务 252 条、经济 335 条记录。整理后商务 242 条、经济 326 条：
合并跨 Topic 重复词，拆分相反概念与并列生产要素，保留不同词义、原文件和行号。
每条有双语场景例句，支持填空及五选一选择题。例句为教学材料，不冒充官方试题。
同义词、英美拼写和缩写可作为预设答案；干扰项排除同一英文词的其他记录。

纠正原表中明确的错配，原文仍存于词条来源记录：

- store of value：价值储藏；unit of account：计价单位。
- disinflation：通胀放缓；NAIRU：非加速通货膨胀失业率。
- X-inefficiency：X非效率；productivity：生产率。
- 从世界其他地区进口的支出属于本国进口漏出。

NCUK 商务、经济使用独立词库，不混入通用示例或其他项目词表。
访问按学生班级的已配置科目过滤；商科班可学习商务和经济，工科班不增加科目。
学生入口为「词汇学习」，可按 Topic 筛选，无需考试发布。

## 后续追加

准备同结构词条后运行：

```sh
python scripts/import-topic-vocabulary.py data/prepared-topics.json
python scripts/import-topic-vocabulary.py data/prepared-topics.json --apply
```

默认预览。已有词条合并分组、别名和来源记录，保留 ID 与已有例句；没有删除操作。
重复导入不产生新增或重复分组。账号、试卷快照、成绩及错题保持原样。
原文件与加工材料位于 Git 忽略的 `data/ncuk-topic-import/`，内容存入原 D1。
