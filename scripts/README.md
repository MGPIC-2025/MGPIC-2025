# Scripts 目录说明

这个目录放了项目用到的各种构建和部署脚本，按功能分了几个文件夹，方便管理。

## 目录结构

```
scripts/
├── asset-management/        资源管理相关
│   └── generate-asset-list.js
├── deploy/                  部署上传相关
│   ├── upload-assets.js
│   ├── smart-upload.js
│   ├── upload-config.js
│   └── test-upload-config.js
├── shared/                  公共工具
│   └── utils.js
└── README.md
```

## 各个文件的作用

### shared/ - 公共工具

**utils.js** - 工具函数库
所有脚本都会用到的工具函数，包括：
- 读取环境变量
- 连接 S3 客户端
- 处理文件（获取文件类型、计算哈希、格式化大小等）
- 日志输出
- 进度条显示

### asset-management/ - 资源管理

**generate-asset-list.js** - 自动生成资源列表
这个脚本会：
- 扫描 assets 目录下的所有文件
- 根据重要程度分成高中低三个优先级
- 生成一个 JSON 文件给前端用，告诉前端哪些资源需要预加载

### deploy/ - 部署上传

**upload-assets.js** - 简单粗暴版上传
把 assets 目录下的东西全部上传到 R2，适合第一次部署或者想完全同步的时候用。

**smart-upload.js** - 智能版上传（推荐）
只上传有变化的文件，更高效：
- 通过文件哈希判断文件是否改过
- 支持按文件大小和类型过滤
- 遵循配置文件的规则

**upload-config.js** - 上传配置
定义上传规则，比如：
- 哪些目录要上传，哪些要跳过
- 缓存策略怎么设置
- 文件大小限制

**test-upload-config.js** - 测试工具
不实际上传，只是预览一下：
- 会上传哪些文件
- 会跳过哪些文件，为什么跳过
- 统计信息

## 怎么用

### 第一步：配置环境变量

创建一个 `.env.local` 文件，内容如下：

```bash
CLOUDFLARE_ACCOUNT_ID=你的账号ID
CLOUDFLARE_R2_ACCESS_KEY_ID=你的访问密钥ID
CLOUDFLARE_R2_SECRET_ACCESS_KEY=你的访问密钥
CLOUDFLARE_R2_BUCKET_NAME=你的存储桶名称
```

### 常用命令

```bash
# 生成资源列表（构建前必须执行）
npm run generate:assets

# 看看哪些文件会被上传（不实际上传）
npm run test:upload-config

# 完整上传所有资源
npm run deploy:assets

# 智能上传（只传改过的文件，推荐用这个）
npm run deploy:assets:smart

# 完整构建并部署
npm run deploy:full
```

如果你想直接执行脚本，也可以这样：

```bash
node scripts/asset-management/generate-asset-list.js
node scripts/deploy/test-upload-config.js
node scripts/deploy/upload-assets.js
node scripts/deploy/smart-upload.js
```

## 脚本之间的依赖关系

所有脚本都依赖 `shared/utils.js` 这个工具库。

上传相关的脚本（`smart-upload.js` 和 `test-upload-config.js`）还依赖 `upload-config.js` 的配置。

```
shared/utils.js
    ├── asset-management/generate-asset-list.js
    ├── deploy/upload-assets.js
    ├── deploy/smart-upload.js
    └── deploy/test-upload-config.js

deploy/upload-config.js
    ├── deploy/smart-upload.js
    └── deploy/test-upload-config.js
```

## 配置说明

### 上传配置（upload-config.js）

可以配置这些东西：

- **include**: 要上传哪些目录，比如 `['copper', 'enemy', 'structure']`
- **exclude**: 要排除哪些目录
- **fileTypes**: 
  - allowed: 允许哪些文件类型，比如 `['.glb', '.webp', '.png']`
  - blocked: 禁止哪些文件类型，比如 `['.tmp', '.log']`
- **settings**:
  - cacheControl: 缓存策略，默认 `'public, max-age=31536000'`（缓存一年）
  - maxFileSize: 单个文件最大多少 MB，默认 50MB

### 资源优先级配置（generate-asset-list.js）

资源分三个级别：

- **高优先级**: 首屏必须要的，比如 Logo、主界面图片
- **中优先级**: 常用的，比如装备图标、游戏资源图标
- **低优先级**: 可以后面再加载的，比如大的 3D 模型文件

前端会根据这个优先级决定预加载哪些资源。

## 输出示例

运行智能上传脚本后，你会看到类似这样的输出：

```
[INFO] 开始智能资源上传...
[INFO] 存储桶: your-bucket
[INFO] 处理目录: copper
[SUCCESS] 上传: copper/arcanist/bubble/bubble.webp (45.2 KB)
[INFO] 跳过 (未变化): copper/arcanist/bubble/bubble.glb
...
============================================================
[SUCCESS] 上传完成
============================================================
[INFO] 成功上传: 12 个文件
[INFO] 跳过: 127 个文件
[INFO] 失败: 0 个文件
[INFO] 总大小: 2.3 MB
[INFO] 耗时: 8.5秒
============================================================
```

## 注意事项

### 安全相关

- 别把 `.env.local` 提交到 Git 里，里面有敏感信息
- 环境变量要保管好

### 上传策略建议

- 第一次部署用 `upload-assets.js` 全量上传
- 平时更新用 `smart-upload.js` 增量上传
- 上传前先用 `test-upload-config.js` 看看会传什么

### 性能优化

- 增量上传可以节省很多时间，尤其是资源多的时候
- 合理设置优先级，不要所有资源都预加载，会拖慢首屏加载
- 有条件的话配个自定义域名，访问会快一些

### 调试技巧

如果想看详细的日志输出，可以设置 `DEBUG=1`：

```bash
DEBUG=1 npm run deploy:assets:smart
```

## 常见问题

### 环境变量加载不了

- 检查 `.env.local` 文件是不是存在
- 看看文件内容格式对不对
- 确认文件名没打错（注意是 `.env.local` 不是 `.env`）

### 上传失败

- 先检查网络是不是通的
- 确认 R2 的凭证（Account ID、Access Key 等）填对了
- 看看文件是不是太大了，超过限制了

### 资源列表生成失败

- 确认 `assets` 目录存在
- 检查是不是有文件权限问题
- 看看是不是路径配置错了

