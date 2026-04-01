# assets 目录说明

本目录用于存放站点静态资源。当前二维码弹窗支持两级读取策略：

1. 开发期优先读 `lin-portfolio/photo/`（方便你本地直接替换图片）
2. 若 `photo/` 对应图片不存在，则自动回退读 `assets/` 同名文件

## 已预留二维码（可直接覆盖）

0. `qr-wechat.png`：微信个人二维码
1. `qr-shipinhao.png`：视频号二维码
2. `qr-xiaohongshu.png`：小红书二维码
3. `qr-gongzhonghao.png`：公众号二维码
4. `qr-douyin.png`：抖音二维码

> 提示：二维码弹窗每次打开都会自动附加时间戳参数，规避浏览器缓存导致的“图片不更新”问题。

## 其他可选资源

- `avatar-kunki.jpg`：关于我页头像（已接入）
- `portfolio-*.jpg`：作品封面
- `favicon.ico`：网站图标

建议保持图片命名简洁，并尽量使用英文文件名，方便后续部署与维护。
