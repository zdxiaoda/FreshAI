import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // 告诉 Vue 编译器 MDUI 组件是自定义元素
          isCustomElement: (tag) => tag.startsWith('mdui-')
        }
      }
    })
  ],
})
