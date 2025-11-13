import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { execSync } from 'child_process';
import { resolve } from 'path';
import { watch } from 'chokidar';

export default defineConfig(({ mode }) => ({
  // 使用相对路径，适用于任意部署路径
  base: './',
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
  define: {
    // 在构建时注入环境变量
    'import.meta.env.VITE_R2_PUBLIC_URL': JSON.stringify(
      process.env.VITE_R2_PUBLIC_URL ||
        'https://pub-6f9181bda40946ea92b5e87fe84e27d4.r2.dev'
    ),
  },
  plugins: [
    vue(),
    {
      name: 'moon build',
      watcher: null,
      buildStart() {
        const buildMoon = () => {
          try {
            console.log('开始构建 MoonBit 代码...');
            execSync('moon build --target js', {
              cwd: resolve(__dirname, 'main'),
              stdio: 'ignore',
            });
            execSync(
              'cp main/target/js/release/build/main/main.js src/main.js',
              {
                cwd: __dirname,
                stdio: 'inherit',
              }
            );
            console.log('MoonBit 构建完成');
          } catch (error) {
            console.log('MoonBit 构建失败:', error.message);
          }
        };

        buildMoon();

        this.watcher = watch('main/**/*', {
          persistent: true,
          ignoreInitial: true,
        });

        this.watcher.on('change', path => {
          if (!path.includes('target')) {
            console.log(`MoonBit 文件变化: ${path}`);
            buildMoon();
          }
        });

        this.watcher.on('add', path => {
          if (!path.includes('target')) {
            console.log(`新增 MoonBit 文件: ${path}`);
            buildMoon();
          }
        });
      },
    },
  ],
}));
