import { defineConfig } from 'vite'
import { execSync } from 'child_process'
import { resolve } from 'path'
import { watch } from 'chokidar'

export default defineConfig({
  server: {
    port: 3000,
    open: true
  },
  plugins: [
    {
      name: 'moon build',
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
        
        const watcher = watch('main/main/**/*', {
          ignored: /node_modules/,
          persistent: true
        })
        
        watcher.on('change', (path) => {
          console.log(`MoonBit 文件变化: ${path}`)
          buildMoon()
        })
        
        watcher.on('add', (path) => {
          console.log(`新增 MoonBit 文件: ${path}`)
          buildMoon()
        })
      }
    }
  ]
})
