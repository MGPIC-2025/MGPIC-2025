# MGPIC-2025 Assets 资源分支

这个分支专门用于管理和上传游戏资源文件到 Cloudflare R2。

## 目录结构

```
assets-resources/
├── assets/                    # 游戏资源文件（模型、贴图等）
├── scripts/                   # 部署脚本
│   ├── asset-management/     # 资源管理脚本
│   └── deploy/               # R2 上传脚本
├── .github/workflows/        # GitHub Actions 工作流
│   └── upload-assets.yml     # 自动上传资源的工作流
├── package.json              # 依赖配置
└── env.example               # 环境变量示例

```

## 使用方法

### 1. 环境配置

复制 `env.example` 为 `.env` 并填入你的 Cloudflare R2 凭据：

```bash
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_key
CLOUDFLARE_R2_BUCKET_NAME=your_bucket_name
```

### 2. 安装依赖

```bash
npm install
```

### 3. 上传资源

#### 智能上传（推荐）
只上传修改过的文件：
```bash
npm run deploy:assets:smart
```

#### 完整上传
上传所有资源文件：
```bash
npm run deploy:assets
```

### 4. 自动上传

当推送到 `assets-resources` 分支时，GitHub Actions 会自动触发上传流程。

## 注意事项

- 这个分支只包含资源文件和部署脚本
- 应用代码在 `main` 分支
- 修改资源后推送到此分支会自动上传到 R2
- GitHub Secrets 需要配置相应的 Cloudflare R2 凭据

