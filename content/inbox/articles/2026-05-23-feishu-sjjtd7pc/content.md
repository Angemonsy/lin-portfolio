# 飞书 kunki输入 / kunki输出 使用规则
> 更新日期：2026-05-17

定位：飞书是轻工作台，GitHub/Obsidian 是唯一主库。

---

## 1. kunki输入：只放任务入口和临时素材

### 适合放入

- 林总当天临时任务
- 待处理链接、录音、素材、想法
- 需要AI员工处理的明确指令
- 需要协作查看的短期输入

### 不适合放入

- 长期记忆最终版
- 完整知识库镜像
- 已经归档到GitHub的旧内容重复副本
- 多个版本混在一起的旧文档

### 输入处理后归档到哪里

<lark-table rows="6" cols="2" column-widths="365,365">

  <lark-tr>
    <lark-td>
      输入类型
    </lark-td>
    <lark-td>
      GitHub/Obsidian归档位置
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      临时碎片
    </lark-td>
    <lark-td>
      `00_Inbox/`
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      每日思考
    </lark-td>
    <lark-td>
      `C-记忆核心/02-每日输入/`
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      长期洞见
    </lark-td>
    <lark-td>
      `C-记忆核心/01-个人上下文/A03-MEMORY.md`
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      内容素材
    </lark-td>
    <lark-td>
      `D-内容创作/03-素材库/`
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      合作信息
    </lark-td>
    <lark-td>
      `E-产出交付/05-合作管理/`
    </lark-td>
  </lark-tr>
</lark-table>

---

## 2. kunki输出：只放任务结果摘要和待归档产物

### 适合放入

- AI员工当天产出的任务结果
- 选题Top3、日报摘要、复盘摘要
- 需要林总确认的草稿
- 暂时无法直接push GitHub的产物

### 不适合放入

- 已归档到GitHub后的全文重复堆积
- 无推荐归档路径的散乱输出
- 过期任务结果长期堆积

### 输出处理后归档到哪里

<lark-table rows="8" cols="2" column-widths="365,365">

  <lark-tr>
    <lark-td>
      输出类型
    </lark-td>
    <lark-td>
      GitHub/Obsidian归档位置
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      选题推荐
    </lark-td>
    <lark-td>
      `D-内容创作/02-选题决策/`
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      内容草稿
    </lark-td>
    <lark-td>
      `E-产出交付/01-已发文案/`
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      复盘沉淀
    </lark-td>
    <lark-td>
      `C-记忆核心/03-经验沉淀/`
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      数据记录
    </lark-td>
    <lark-td>
      `E-产出交付/03-数据反馈/`
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      产品方案
    </lark-td>
    <lark-td>
      `D-内容创作/06-产品管理/`
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      合作方案
    </lark-td>
    <lark-td>
      `E-产出交付/05-合作管理/`
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      临时文件
    </lark-td>
    <lark-td>
      `E-产出交付/06-临时文件/`
    </lark-td>
  </lark-tr>
</lark-table>

---

## 3. AI员工强制格式

AI员工写入 kunki输出 时，文档开头必须包含：
```plaintext
任务名称：
执行日期：
负责AI员工：
推荐归档路径：
是否已写入GitHub：是/否
下一步动作：
```

如果“是否已写入GitHub=否”，则该任务只算临时完成，不算闭环完成。

---

## 4. 一句话原则
> 飞书负责接任务、放结果、给人看；GitHub/Obsidian负责真正记住一切。
