# MGPIC-2025 部署使用指南

## 🚀 快速开始

### 1. 环境配置
```powershell
# 复制环境变量模板
Copy-Item "env.example" ".env.local"

# 编辑配置文件
notepad .env.local
# 填入您的 Cloudflare R2 配置信息
```

### 2. 测试配置
```powershell
# 测试上传配置
npm run test:upload-config

# 本地开发
npm run dev
```

### 3. 部署
```powershell
# 完整部署
npm run deploy:full

# 推送到 GitHub
git add .
git commit -m "feat: 部署到 GitHub Pages + R2"
git push origin main
```

## 📋 环境变量配置

在 `.env.local` 文件中配置：

```env
# Cloudflare R2 配置
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-key
CLOUDFLARE_R2_BUCKET_NAME=mgpic2025

# GitHub Pages 配置
VITE_BASE_URL=/MGPIC-2025/
```

## 🔧 Cloudflare R2 设置

### 1. 创建存储桶
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **R2 Object Storage** → **Create bucket**
3. 输入存储桶名称：`mgpic2025`

### 2. 配置 CORS
在存储桶 **Settings** → **CORS policy** 添加：

```json
[
  {
    "AllowedOrigins": [
      "https://yourusername.github.io",
      "https://yourusername.github.io/MGPIC-2025/",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

### 3. 创建 API Token
1. **My Profile** → **API Tokens** → **Create Token**
2. 选择 **Custom token**
3. 权限：`Cloudflare R2:Edit`
4. 保存 Access Key ID 和 Secret Access Key

## 📁 资源上传规则

### 包含目录（会上传到 R2）
- ✅ `copper/` - 铜偶角色模型和图标
- ✅ `enemy/` - 敌人模型
- ✅ `structure/` - 建筑模型  
- ✅ `equipment/` - 装备图标
- ✅ `resource/` - 游戏资源
- ✅ `frontend_resource/` - 前端资源
- ✅ `logo.glb` - Logo 模型文件

### 排除目录（不上传到 R2）
- ❌ `img/` - 图片目录（本地开发用）

### 支持文件类型
- ✅ `.glb` - 3D 模型文件
- ✅ `.webp` - WebP 图片
- ✅ `.png/.jpg/.jpeg` - 图片文件
- ✅ `.js/.css/.json` - 代码文件

## 🧪 测试和部署命令

```powershell
# 测试上传配置
npm run test:upload-config

# 智能上传（推荐）
npm run deploy:assets:smart

# 完整部署
npm run deploy:full

# 本地开发
npm run dev
```

## 📊 缓存策略

| 文件类型 | 缓存设置 |
|----------|----------|
| 3D 模型 (.glb) | 1年 + immutable |
| 图片文件 | 1年 + immutable |
| 代码文件 | 1天 |
| 其他文件 | 1年 |

## ✅ 验证清单

- [ ] GitHub Pages 已启用
- [ ] Cloudflare R2 存储桶已创建
- [ ] API Token 已配置
- [ ] 环境变量已设置
- [ ] 资源上传成功
- [ ] 页面正常访问

## 🔍 故障排除

| 问题 | 解决方案 |
|------|----------|
| 404 错误 | 检查 GitHub Pages 设置 |
| 资源加载失败 | 检查 R2 CORS 配置 |
| 构建失败 | 检查 Node.js 和依赖 |
| 上传失败 | 检查 API Token 权限 |
| CORS 错误 | 检查 CORS 配置域名 |
| 403 Forbidden | 检查 API Token 权限 |

## 🔧 修改上传配置

编辑 `scripts/upload-config.js`：

```javascript
export const UPLOAD_CONFIG = {
  include: ['copper', 'enemy', 'structure', 'equipment', 'resource', 'frontend_resource', 'logo.glb'],
  exclude: ['img'],
  fileTypes: {
    allowed: ['.glb', '.webp', '.png', '.jpg', '.jpeg', '.js', '.css', '.json'],
    blocked: ['.tmp', '.temp', '.log', '.DS_Store', 'Thumbs.db']
  }
};
```

## 📊 监控

- GitHub Actions 运行状态
- Cloudflare R2 使用量
- 页面加载性能

## 🎯 项目结构

```
MGPIC-2025/
├── assets/                 # 游戏资源（会上传到 R2）
│   ├── copper/            # 铜偶角色
│   ├── enemy/             # 敌人模型
│   ├── structure/         # 建筑模型
│   ├── equipment/         # 装备图标
│   ├── resource/          # 游戏资源
│   ├── frontend_resource/ # 前端资源
│   └── img/               # 本地开发图片（不上传）
├── src/                   # Vue 前端代码
├── main/                  # MoonBit 游戏逻辑
├── scripts/               # 部署脚本
└── docs/                  # 文档
```

## 🚀 部署流程

1. **开发** → 修改代码和资源
2. **测试** → `npm run test:upload-config`
3. **部署** → `npm run deploy:full`
4. **推送** → `git push origin main`
5. **验证** → 访问 GitHub Pages 链接

---

**访问地址**: `https://yourusername.github.io/MGPIC-2025`
