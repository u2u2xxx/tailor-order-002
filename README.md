# 衡衣间 - 裁缝定制试穿 MVP

这是面向个人裁缝的服装定制销售展示工具原型，当前聚焦男式休闲风亨利衫与短裤。

## 安装依赖

```powershell
npm install
```

如果当前终端还没有刷新 PATH，可以临时使用完整路径：

```powershell
& 'C:\Program Files\nodejs\npm.cmd' install
```

## Supabase 配置

本地开发需要 `.env.local`：

```text
VITE_SUPABASE_URL=你的 Supabase Project URL
VITE_SUPABASE_PUBLISHABLE_KEY=你的 publishable key
VITE_SHARE_BASE_URL=公网或局域网分享地址
VOLCENGINE_API_KEY=火山方舟 API Key
VOLCENGINE_IMAGE_MODEL=doubao-seedream-4-5-251128
```

第一次使用前，在 Supabase 项目的 SQL Editor 里执行：

```text
supabase/schema.sql
```

它会创建客户档案、服装方案、试穿效果图、客户反馈表，以及 `tailor-assets` 图片存储桶。

## 开发运行

```powershell
npm run dev
```

Vite 会输出电脑访问地址和同 Wi-Fi 手机访问地址。

## 打包

```powershell
npm run build
```

## 当前功能

- 裁缝后台录入客户姓名、联系方式、照片和 13 项量体数据。
- 客户照片支持正面全身照、侧面全身照、背面全身照、半身形象照四个槽位。
- 保存客户档案到 Supabase 数据库。
- 选择三套男式休闲亨利衫与短裤方案。
- 生成客户分享链接。
- 客户打开链接后查看试穿展示，并提交确认或修改意见。
- 裁缝可以上传真实 AI 效果图到 Supabase Storage，替换当前的销售展示预览。
- 裁缝可以调用 Seedream 4.5 生成 AI 试穿图，结果保存到 Supabase。

## 当前限制

- 试穿展示是 MVP 预览，不是真实 3D 服装物理仿真。
- MVP 阶段的 Supabase RLS 策略偏开放，只适合内部试用；上线前需要加登录和更严格的权限。
- 手机访问电脑页面仍需要通过同一局域网的 Vite 开发服务；部署上线后才是公网分享链接。
- 样例图片来自线上占位素材，后续应替换为你自己的款式图、面料图和授权客户照片。

## 客户照片建议

- 正面全身照：必填，头到脚完整入镜，站直，双臂自然下垂。
- 侧面全身照：推荐，身体侧对镜头，帮助判断胸腹、臀部和体态厚度。
- 背面全身照：推荐，背对镜头站直，帮助判断肩背、衣长和裤长比例。
- 半身形象照：选填，胸口以上清晰，帮助试穿效果更接近客户气质。
