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
VITE_AI_API_URL=/api/generate-tryon
VOLCENGINE_IMAGE_MODEL=doubao-seedream-4-5-251128
VITE_AI_FREE_QUOTA=200
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

## 国内部署迁移

迁移时先保持 Supabase 不动，只替换前端静态托管和 AI 生成接口。

推荐结构：

- 前端：部署 `npm run build` 生成的 `dist/` 到国内静态托管，例如腾讯云 CloudBase 静态网站托管、阿里云 OSS + CDN、又拍云、七牛云等。
- AI 接口：部署 `cloud-functions/generate-tryon/` 到国内云函数或 Web 函数，并开放一个 HTTPS POST 地址。
- 数据和图片：继续使用现有 Supabase 项目的数据库与 Storage。

前端环境变量：

```text
VITE_SUPABASE_URL=你的 Supabase Project URL
VITE_SUPABASE_PUBLISHABLE_KEY=你的 publishable key
VITE_SHARE_BASE_URL=国内静态站点访问地址
VITE_AI_API_URL=国内云函数 HTTPS 地址
VITE_AI_FREE_QUOTA=200
```

如果前端和 AI 接口部署在同一个域名下，`VITE_AI_API_URL` 可以继续使用 `/api/generate-tryon`。如果它们是两个域名，填完整地址，例如 `https://example.com/generate-tryon`。

云函数环境变量：

```text
VOLCENGINE_API_KEY=火山方舟 API Key
VOLCENGINE_IMAGE_MODEL=doubao-seedream-4-5-251128
ALLOWED_ORIGIN=前端域名，测试时可先用 *
```

云函数入口文件在 `cloud-functions/generate-tryon/index.js`，导出 `main` 和 `handler`。请求体与原 Vercel `/api/generate-tryon` 保持一致，返回 `{ imageUrl, model, prompt }`，前端无需再改业务逻辑。

部署检查：

```powershell
npm run build
```

构建成功后，把 `dist/` 上传到国内静态托管，并把云函数的公网 HTTPS 地址写入生产环境的 `VITE_AI_API_URL` 后重新构建。

### uniCloud 阿里云免费服务空间部署

你已经开通 uniCloud 阿里云服务空间后，下一步按这个顺序做：

1. 在 HBuilderX 或 uniCloud Web 控制台中，绑定当前项目到刚创建的阿里云服务空间。
2. 上传云函数目录 `uniCloud-aliyun/cloudfunctions/generate-tryon`。
3. 在云函数配置里确认已开启 URL 化，路径为 `/http/generate-tryon`。本项目已在该函数的 `package.json` 里写入 `cloudfunction-config.path`。
4. 在云函数环境变量里配置：

```text
VOLCENGINE_API_KEY=火山方舟 API Key
VOLCENGINE_IMAGE_MODEL=doubao-seedream-4-5-251128
ALLOWED_ORIGIN=前端网页托管域名，测试时可先用 *
```

5. 部署云函数后，在 uniCloud 控制台复制 URL 化访问地址。地址通常类似：

```text
https://你的服务空间域名.bspapp.com/http/generate-tryon
```

6. 本地 `.env.local` 或前端托管的构建环境变量设置：

```text
VITE_AI_API_URL=https://你的服务空间域名.bspapp.com/http/generate-tryon
VITE_SHARE_BASE_URL=你的前端网页托管域名
```

7. 重新构建前端：

```powershell
npm run build
```

8. 把 `dist/` 上传到 uniCloud 前端网页托管。上线后先用裁缝后台生成一张正面试穿图，确认云函数、火山引擎和 Supabase 写入都打通。

## 当前功能

- 裁缝后台录入客户姓名、联系方式、照片和 13 项量体数据。
- 客户照片支持正面全身照、侧面全身照、背面全身照、半身形象照四个槽位。
- 保存客户档案到 Supabase 数据库。
- 选择三套男式休闲亨利衫与短裤方案。
- 生成客户分享链接。
- 客户打开链接后查看试穿展示，并提交确认或修改意见。
- 裁缝可以上传真实 AI 效果图到 Supabase Storage，替换当前的销售展示预览。
- 裁缝可以调用 Seedream 4.5 生成 AI 试穿图，结果保存到 Supabase。
- 后台显示 AI 免费生成剩余次数；额度为 0 后提示本次生成将产生费用。

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
