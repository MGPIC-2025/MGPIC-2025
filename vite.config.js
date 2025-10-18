import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { execSync } from 'child_process'
import { resolve } from 'path'
import { watch } from 'chokidar'

export default defineConfig(({ mode }) => ({
    // base 中路径 "./" 是开发环境所用 "/" 才是生产环境
    // GitHub Pages 需要设置为仓库名路径
  base: mode === 'production' ? '/MGPIC-2025/' : '/',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three']
        }
      }
    }
  },
  define: {
    // 在构建时注入环境变量
    'import.meta.env.VITE_R2_PUBLIC_URL': JSON.stringify(process.env.VITE_R2_PUBLIC_URL || 'https://pub-6f9181bda40946ea92b5e87fe84e27d4.r2.dev'),
  },
  plugins: [
    vue(),
    {
      name: 'moon build',
      watcher: null,
      buildStart() {
        const buildMoon = () => {
          try {
            console.log('开始构建 MoonBit 代码...')
            execSync('moon build --target js', { 
              cwd: resolve(__dirname, 'main'),
              stdio: 'inherit'
            })
            execSync('cp main/target/js/release/build/main/main.js src/main.js', {
              cwd: __dirname,
              stdio: 'inherit'
            })
            console.log('MoonBit 构建完成')
          } catch (error) {
            console.error('MoonBit 构建失败:', error.message)
          }
        }
        
        buildMoon()
        
        // 只在开发模式下启用文件监听
        if (process.env.NODE_ENV !== 'production') {
          this.watcher = watch('main/main/**/*', {
            ignored: /node_modules/,
            persistent: true
          })
          
          this.watcher.on('change', (path) => {
            console.log(`MoonBit 文件变化: ${path}`)
            buildMoon()
          })
          
          this.watcher.on('add', (path) => {
            console.log(`新增 MoonBit 文件: ${path}`)
            buildMoon()
          })
        }
      },
      buildEnd() {
        // 构建完成后清理文件监听器
        if (this.watcher) {
          this.watcher.close()
          this.watcher = null
          console.log('MoonBit 文件监听器已关闭')
        }
      },
      closeBundle() {
        // 确保在插件关闭时清理资源
        if (this.watcher) {
          this.watcher.close()
          this.watcher = null
        }
      }
    }
  ]
}))
