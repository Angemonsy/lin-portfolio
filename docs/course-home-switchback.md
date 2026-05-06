# 跨境业务首页与个人站隐藏切换说明

创建时间：2026-05-07

## 当前状态

当前网站根路径 `index.html` 已临时切换为跨境首饰业务站：

- 品牌首页：Meilong Atelier
- 商品页区块：`#shop`
- 产业故事页区块：`#origin`
- 批发询盘页区块：`#wholesale`
- 物流合规页区块：`#compliance`
- 运营方案区块：`#operations`

这个首页对外呈现为跨境业务网站，不在页面可见内容里提小组、课程或模拟项目。

原个人首页没有删除，已保存为：

- `personal-home-20260507.html`
- `backups/index.personal-home-before-course-20260507-013836.html`

## 当前结合方式

部署到 GitHub 仓库时：

- `index.html` 是默认首页，因此访问域名会先看到 Meilong Atelier 跨境业务站。
- `personal-home-20260507.html` 是原个人品牌首页的隐藏保留版，原页面功能和内容保留。
- 当前跨境业务站左下角有一个很小的 `K` 圆点按钮，点击会跳转到 `personal-home-20260507.html`。
- 这个按钮不放在主导航里，不影响课堂展示时的跨境业务主线。

## 临时查看原个人首页

在浏览器打开：

```text
personal-home-20260507.html
```

这个页面不在主导航里展示，只作为隐藏个人站入口。

## 恢复原个人首页

如果展示结束，需要把网站首页恢复成原来的个人网站，在项目根目录执行：

```powershell
Copy-Item -LiteralPath "personal-home-20260507.html" -Destination "index.html" -Force
```

或者使用更原始的备份：

```powershell
Copy-Item -LiteralPath "backups/index.personal-home-before-course-20260507-013836.html" -Destination "index.html" -Force
```

## 继续保留跨境业务站

如果恢复个人首页后还想保留跨境业务站，可以先把当前业务首页复制为：

```powershell
Copy-Item -LiteralPath "index.html" -Destination "meilong-atelier.html"
```

然后再执行恢复命令。

恢复后访问逻辑会变成：

- `index.html`：原个人品牌首页
- `meilong-atelier.html`：跨境首饰业务站

## 当前可用功能

跨境业务站现在支持：

- 中英双语切换，浏览器会记住上次选择。
- 8 个商品 SKU 展示，商品视觉为本地 CSS 生成，不依赖外部图片链接。
- 商品详情弹窗，包含多张拍摄场景视觉、价格、材质、尺寸、MOQ、交期、市场和商品故事。
- 商品卡片加入询盘。
- 批发询盘表单必填校验。
- 询盘草稿保存到浏览器本地。
- 提交询盘后生成邮件草稿链接。

邮件收件地址目前写在 `index.html` 的批发表单上：

```html
data-contact-email="sales@meilongatelier.com"
```

如果后续有真实邮箱，把这个地址替换成真实业务邮箱即可。
