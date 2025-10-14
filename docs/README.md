# MGPIC-2025

一个基于 Three.js + Vue 的 3D 游戏项目，使用 MoonBit 作为后端逻辑。

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 部署到 GitHub Pages

这个项目配置了自动部署，推送到 main 分支就会自动构建并部署到 GitHub Pages。

### 资源存储

游戏资源（3D 模型、图片等）存储在 Cloudflare R2 上，通过 CDN 加速访问。

### 环境配置

复制 `env.example` 为 `.env.local`，填入你的 Cloudflare R2 配置：

```env
CLOUDFLARE_ACCOUNT_ID=你的账户ID
CLOUDFLARE_R2_ACCESS_KEY_ID=你的访问密钥
CLOUDFLARE_R2_SECRET_ACCESS_KEY=你的秘密密钥
CLOUDFLARE_R2_BUCKET_NAME=mgpic2025
```

### 手动上传资源

```bash
# 测试上传配置
npm run test:upload-config

# 上传资源到 R2
npm run deploy:assets:smart
```

## 项目结构

- `src/` - Vue 前端代码
- `main/` - MoonBit 游戏逻辑
- `assets/` - 游戏资源（会上传到 R2）
- `scripts/` - 部署脚本

## 技术栈

- **前端**: Vue 3 + Three.js
- **后端**: MoonBit (编译为 WebAssembly)
- **部署**: GitHub Pages + Cloudflare R2
- **构建**: Vite

## 常见问题

**页面空白？** 检查浏览器控制台，可能是模块导入问题。

**资源加载失败？** 检查 R2 的 CORS 配置，确保允许你的域名访问。

**构建失败？** 确保 Node.js 版本 >= 18，并且依赖安装完整。
