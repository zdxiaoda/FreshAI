<script setup>
import { ref, onMounted } from 'vue'
import { snackbar } from 'mdui/functions/snackbar.js'
import FileUploader from './components/FileUploader.vue'
import ConversionOptions from './components/ConversionOptions.vue'
import ResultDisplay from './components/ResultDisplay.vue'

// 主题
const isDark = ref(false)

// 当前年份（动态）
const currentYear = new Date().getFullYear()

// 文件状态
const fileName = ref('')
const fileExt = ref('')
const fileContent = ref('')
const docxBuffer = ref(null) // 保存原始 docx 数据

// 转换状态
const convertedText = ref('')
const isConverting = ref(false)

// 文件上传组件引用
const fileUploaderRef = ref(null)

// 切换主题
function toggleTheme() {
  isDark.value = !isDark.value
  document.body.classList.toggle('mdui-theme-dark', isDark.value)
  document.body.classList.toggle('mdui-theme-auto', !isDark.value)
}

// 初始化主题
onMounted(() => {
  document.body.classList.add('mdui-theme-auto')
})

// 文件加载完成
function handleFileLoaded(fileData) {
  fileName.value = fileData.name
  fileExt.value = fileData.ext
  fileContent.value = fileData.content
  docxBuffer.value = fileData.docxBuffer || null
  convertedText.value = ''
}

// 清除文件
function clearFile() {
  fileName.value = ''
  fileExt.value = ''
  fileContent.value = ''
  docxBuffer.value = null
  convertedText.value = ''
  if (fileUploaderRef.value) {
    fileUploaderRef.value.clearFile()
  }
}

// 执行转换
async function handleConvert(options) {
  if (!fileContent.value) {
    snackbar({ message: '请先上传文件' })
    return
  }

  isConverting.value = true
  await new Promise(resolve => setTimeout(resolve, 100))

  let text = fileContent.value

  // 转换省略号
  if (options.convertPeriods) {
    text = text.replace(/\.{3,}/g, '…')
  }

  // 转换引号
  if (options.convertQuotes) {
    let quoteCount = 0
    text = text.replace(/"/g, () => {
      quoteCount++
      return quoteCount % 2 === 1 ? '“' : '”'
    })
    quoteCount = 0
    text = text.replace(/'/g, () => {
      quoteCount++
      return quoteCount % 2 === 1 ? '‘' : '’'
    })
  }

  // 转换逗号
  if (options.convertCommas) {
    text = text.replace(/,/g, '，')
  }

  // 转换句号（排除小数点）
  if (options.convertPeriods) {
    text = text.replace(/(?<!\d)\.(?!\d)/g, (match, offset, str) => {
      const prev = offset > 0 ? str[offset - 1] : ''
      const next = offset < str.length - 1 ? str[offset + 1] : ''
      if (/\d/.test(prev) && /\d/.test(next)) return match
      return '。'
    })
  }

  // 转换其他标点
  if (options.convertOther) {
    text = text.replace(/;/g, '；')
    text = text.replace(/:/g, '：')
    text = text.replace(/\?/g, '？')
    text = text.replace(/!/g, '！')
    text = text.replace(/\(/g, '（')
    text = text.replace(/\)/g, '）')
    text = text.replace(/\[/g, '【')
    text = text.replace(/\]/g, '】')
  }

  convertedText.value = text
  isConverting.value = false
  snackbar({ message: '转换完成' })
}
</script>

<template>
  <div class="app-container">
    <!-- 顶部导航栏 -->
    <mdui-top-app-bar>
      <mdui-top-app-bar-title>
        <div class="app-title">
          <mdui-icon name="auto_fix_high"></mdui-icon>
          <span>中文标点符号修正器</span>
        </div>
      </mdui-top-app-bar-title>
      <div class="app-bar-actions">
        <mdui-button-icon
          :name="isDark ? 'light_mode' : 'dark_mode'"
          @click="toggleTheme"
        ></mdui-button-icon>
      </div>
    </mdui-top-app-bar>

    <!-- 主内容 -->
    <main class="main-content">
      <FileUploader
        ref="fileUploaderRef"
        @file-loaded="handleFileLoaded"
      />

      <ConversionOptions
        :has-file="!!fileContent"
        :is-converting="isConverting"
        @convert="handleConvert"
      />

      <ResultDisplay
        :original-text="fileContent"
        :converted-text="convertedText"
        :file-ext="fileExt"
        :file-name="fileName"
        :docx-buffer="docxBuffer"
      />
    </main>

    <!-- 底部 -->
    <footer class="app-footer">
      <p class="copyright">© {{ currentYear }} zd小达</p>
      <p class="description">中文标点符号修正器 - 将 AI 生成的半角标点转换为中文全角</p>
      <p class="disclaimer">免责声明：用户上传的内容与本站无关，本站不对用户内容承担任何责任</p>
    </footer>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-bar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.main-content {
  flex: 1;
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.app-footer {
  padding: 24px;
  text-align: center;
  border-top: 1px solid rgb(var(--mdui-color-outline-variant));
}

.app-footer p {
  margin: 0;
  font-size: 14px;
  color: rgb(var(--mdui-color-on-surface-variant));
}

@media (max-width: 768px) {
  .main-content {
    padding: 16px;
  }
}
</style>