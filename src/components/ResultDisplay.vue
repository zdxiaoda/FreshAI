<script setup>
import { ref, computed } from 'vue'
import { marked } from 'marked'
import { snackbar } from 'mdui/functions/snackbar.js'

const props = defineProps({
  originalText: String,
  convertedText: String,
  fileExt: String,
  fileName: String,
  docxBuffer: ArrayBuffer // 原始 docx 文件数据
})

const previewMode = ref('text')

const hasConverted = computed(() => !!props.convertedText)

const changeCount = computed(() => {
  if (!props.originalText || !props.convertedText) return 0
  let count = 0
  const orig = props.originalText
  const conv = props.convertedText
  for (let i = 0; i < Math.max(orig.length, conv.length); i++) {
    if (orig[i] !== conv[i]) count++
  }
  return count
})

const highlightedText = computed(() => {
  if (!props.originalText || !props.convertedText) return ''
  let result = ''
  const orig = props.originalText
  const conv = props.convertedText
  let i = 0
  let inHighlight = false

  while (i < Math.max(orig.length, conv.length)) {
    if (orig[i] !== conv[i]) {
      if (!inHighlight) {
        result += '<span class="highlight">'
        inHighlight = true
      }
      result += escapeHtml(conv[i] || '')
    } else {
      if (inHighlight) {
        result += '</span>'
        inHighlight = false
      }
      result += escapeHtml(conv[i] || '')
    }
    i++
  }
  if (inHighlight) result += '</span>'
  return result
})

const isMarkdown = computed(() => {
  return props.fileExt === '.md' || props.fileExt === '.markdown'
})

const isDocx = computed(() => {
  return props.fileExt === '.docx'
})

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function renderMarkdown(text) {
  return marked(text)
}

async function copyResult() {
  if (!props.convertedText) return
  try {
    await navigator.clipboard.writeText(props.convertedText)
    snackbar({ message: '已复制到剪贴板' })
  } catch {
    snackbar({ message: '复制失败' })
  }
}

async function downloadResult() {
  if (!props.convertedText) return

  const baseName = props.fileName.replace(/\.[^/.]+$/, '')
  const ext = props.fileExt

  if (ext === '.docx' && props.docxBuffer) {
    await downloadDocxPreserveFormat(baseName)
  } else if (ext === '.docx') {
    await downloadDocxNew(baseName)
  } else {
    downloadText(baseName, ext)
  }
}

function downloadText(baseName, ext) {
  const blob = new Blob([props.convertedText], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = baseName + '_converted' + ext
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 100)
  snackbar({ message: '下载成功' })
}

// 保持原始格式的 docx 下载
async function downloadDocxPreserveFormat(baseName) {
  try {
    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(props.docxBuffer)

    // 读取 word/document.xml
    let docXml = await zip.file('word/document.xml').async('string')

    // 在 XML 中替换文本内容
    // docx 的文本在 <w:t> 标签中
    docXml = replaceTextInXml(docXml)

    // 更新 document.xml
    zip.file('word/document.xml', docXml)

    // 生成新的 docx 文件
    const blob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    })

    // 下载
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = baseName + '_converted.docx'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 100)
    snackbar({ message: '下载成功，已保留原始格式' })
  } catch (err) {
    console.error('DOCX 处理失败:', err)
    snackbar({ message: 'DOCX 处理失败，请重试' })
  }
}

// 在 XML 中替换文本
function replaceTextInXml(xml) {
  // 匹配 <w:t> 标签中的文本
  const wtRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g

  // 需要替换的字符映射
  const charMap = {
    '"': ['"', '"'],
    "'": ["'", "'"],
    ',': '，',
    '.': '。',
    ';': '；',
    ':': '：',
    '?': '？',
    '!': '！',
    '(': '（',
    ')': '）',
    '[': '【',
    ']': '】'
  }

  // 引号计数器
  let doubleQuoteCount = 0
  let singleQuoteCount = 0

  // 替换 XML 中的文本
  return xml.replace(wtRegex, (match, textContent) => {
    let newText = textContent

    // 替换省略号
    newText = newText.replace(/\.{3,}/g, '…')

    // 替换双引号
    newText = newText.replace(/"/g, () => {
      doubleQuoteCount++
      return doubleQuoteCount % 2 === 1 ? '"' : '"'
    })

    // 替换单引号
    newText = newText.replace(/'/g, () => {
      singleQuoteCount++
      return singleQuoteCount % 2 === 1 ? '‘' : '’'
    })

    // 替换逗号
    newText = newText.replace(/,/g, '，')

    // 替换句号（排除小数点）
    newText = newText.replace(/(?<!\d)\.(?!\d)/g, (m, offset, str) => {
      const prev = offset > 0 ? str[offset - 1] : ''
      const next = offset < str.length - 1 ? str[offset + 1] : ''
      if (/\d/.test(prev) && /\d/.test(next)) return m
      return '。'
    })

    // 替换其他标点
    newText = newText.replace(/;/g, '；')
    newText = newText.replace(/:/g, '：')
    newText = newText.replace(/\?/g, '？')
    newText = newText.replace(/!/g, '！')
    newText = newText.replace(/\(/g, '（')
    newText = newText.replace(/\)/g, '）')
    newText = newText.replace(/\[/g, '【')
    newText = newText.replace(/\]/g, '】')

    return match.replace(textContent, newText)
  })
}

// 创建新的 docx（备用方案）
async function downloadDocxNew(baseName) {
  try {
    const docx = await import('docx')
    const { Document, Packer, Paragraph, TextRun } = docx

    const lines = props.convertedText.split('\n')

    const paragraphs = lines.map(line => {
      if (!line.trim()) {
        return new Paragraph({ children: [] })
      }
      return new Paragraph({
        children: [
          new TextRun({
            text: line,
            font: 'SimSun',
            size: 24
          })
        ],
        spacing: { after: 200 }
      })
    })

    const doc = new Document({
      creator: '中文标点符号修正器',
      title: baseName,
      sections: [{
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        children: paragraphs
      }]
    })

    const blob = await Packer.toBlob(doc)

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = baseName + '_converted.docx'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 100)
    snackbar({ message: '下载成功' })
  } catch (err) {
    console.error('DOCX 生成失败:', err)
    snackbar({ message: 'DOCX 生成失败，请重试' })
  }
}
</script>

<template>
  <mdui-card class="result-card" v-if="hasConverted">
    <div class="result-header">
      <h3 class="card-title">
        <mdui-icon name="compare_arrows"></mdui-icon>
        转换结果
      </h3>

      <div class="result-stats">
        <mdui-icon name="swap_horiz"></mdui-icon>
        <span>修改了 <strong>{{ changeCount }}</strong> 处</span>
      </div>

      <div class="preview-toggle" v-if="isMarkdown">
        <mdui-button
          :variant="previewMode === 'text' ? 'filled' : 'outlined'"
          @click="previewMode = 'text'"
        >
          <mdui-icon slot="icon" name="code"></mdui-icon>
          源码
        </mdui-button>
        <mdui-button
          :variant="previewMode === 'markdown' ? 'filled' : 'outlined'"
          @click="previewMode = 'markdown'"
        >
          <mdui-icon slot="icon" name="visibility"></mdui-icon>
          预览
        </mdui-button>
      </div>

      <div class="result-actions">
        <mdui-button variant="outlined" @click="copyResult">
          <mdui-icon slot="icon" name="content_copy"></mdui-icon>
          复制
        </mdui-button>
        <mdui-button variant="outlined" @click="downloadResult">
          <mdui-icon slot="icon" name="download"></mdui-icon>
          下载
        </mdui-button>
      </div>
    </div>

    <!-- DOCX 格式保留提示 -->
    <div class="docx-notice" v-if="isDocx && docxBuffer">
      <mdui-icon name="info"></mdui-icon>
      <span>下载时将保留原始 Word 格式（字体、样式、排版等）</span>
    </div>

    <div class="comparison-container">
      <!-- 原文 -->
      <div class="comparison-panel">
        <div class="panel-header">
          <span class="panel-label">原文</span>
          <span class="panel-count">{{ originalText.length }} 字符</span>
        </div>
        <div class="panel-content">
          <template v-if="previewMode === 'markdown' && isMarkdown">
            <div class="markdown-preview" v-html="renderMarkdown(originalText)"></div>
          </template>
          <template v-else>
            <pre class="text-content">{{ originalText }}</pre>
          </template>
        </div>
      </div>

      <!-- 分隔线 -->
      <div class="comparison-divider">
        <mdui-icon name="arrow_forward"></mdui-icon>
      </div>

      <!-- 转换后 -->
      <div class="comparison-panel">
        <div class="panel-header">
          <span class="panel-label converted">转换后</span>
          <span class="panel-count">{{ convertedText.length }} 字符</span>
        </div>
        <div class="panel-content">
          <template v-if="previewMode === 'markdown' && isMarkdown">
            <div class="markdown-preview" v-html="renderMarkdown(convertedText)"></div>
          </template>
          <template v-else>
            <pre class="text-content converted" v-html="highlightedText"></pre>
          </template>
        </div>
      </div>
    </div>
  </mdui-card>
</template>

<style scoped>
.result-card {
  overflow: hidden;
}

.result-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid rgb(var(--mdui-color-outline-variant));
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: rgb(var(--mdui-color-on-surface));
}

.card-title mdui-icon {
  color: rgb(var(--mdui-color-primary));
}

.result-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  padding: 8px 16px;
  background-color: rgb(var(--mdui-color-primary-container));
  border-radius: 20px;
  font-size: 14px;
  color: rgb(var(--mdui-color-on-primary-container));
}

.result-stats strong {
  font-weight: 600;
}

.result-stats mdui-icon {
  font-size: 18px;
}

.result-actions {
  display: flex;
  gap: 8px;
}

.preview-toggle {
  display: flex;
  gap: 4px;
}

.preview-toggle mdui-button {
  min-width: 80px;
}

.docx-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background-color: rgb(var(--mdui-color-surface-container-high));
  font-size: 13px;
  color: rgb(var(--mdui-color-on-surface-variant));
}

.docx-notice mdui-icon {
  font-size: 18px;
  color: rgb(var(--mdui-color-primary));
}

.comparison-container {
  display: flex;
  min-height: 400px;
}

.comparison-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgb(var(--mdui-color-outline-variant));
  background-color: rgb(var(--mdui-color-surface-container-low));
}

.panel-label {
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--mdui-color-on-surface));
}

.panel-label.converted {
  color: rgb(var(--mdui-color-primary));
}

.panel-count {
  font-size: 12px;
  color: rgb(var(--mdui-color-on-surface-variant));
}

.panel-content {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.text-content {
  margin: 0;
  font-family: 'Courier New', Courier, monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  color: rgb(var(--mdui-color-on-surface));
}

.text-content.converted :deep(.highlight) {
  background-color: rgb(var(--mdui-color-tertiary-container));
  color: rgb(var(--mdui-color-on-tertiary-container));
  padding: 2px 4px;
  border-radius: 4px;
}

/* Markdown 预览样式 */
.markdown-preview {
  line-height: 1.8;
  color: rgb(var(--mdui-color-on-surface));
}

.markdown-preview :deep(h1),
.markdown-preview :deep(h2),
.markdown-preview :deep(h3),
.markdown-preview :deep(h4),
.markdown-preview :deep(h5),
.markdown-preview :deep(h6) {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  font-weight: 600;
}

.markdown-preview :deep(h1) {
  font-size: 2em;
  border-bottom: 1px solid rgb(var(--mdui-color-outline-variant));
  padding-bottom: 0.3em;
}

.markdown-preview :deep(h2) {
  font-size: 1.5em;
  border-bottom: 1px solid rgb(var(--mdui-color-outline-variant));
  padding-bottom: 0.3em;
}

.markdown-preview :deep(p) {
  margin: 0.5em 0;
}

.markdown-preview :deep(ul),
.markdown-preview :deep(ol) {
  padding-left: 2em;
  margin: 0.5em 0;
}

.markdown-preview :deep(li) {
  margin: 0.25em 0;
}

.markdown-preview :deep(code) {
  background-color: rgb(var(--mdui-color-surface-container-highest));
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.9em;
}

.markdown-preview :deep(pre) {
  background-color: rgb(var(--mdui-color-surface-container-highest));
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
}

.markdown-preview :deep(pre code) {
  background: none;
  padding: 0;
}

.markdown-preview :deep(blockquote) {
  border-left: 4px solid rgb(var(--mdui-color-primary));
  padding-left: 16px;
  margin: 1em 0;
  color: rgb(var(--mdui-color-on-surface-variant));
}

.markdown-preview :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

.markdown-preview :deep(th),
.markdown-preview :deep(td) {
  border: 1px solid rgb(var(--mdui-color-outline-variant));
  padding: 8px 12px;
  text-align: left;
}

.markdown-preview :deep(th) {
  background-color: rgb(var(--mdui-color-surface-container-highest));
  font-weight: 600;
}

.markdown-preview :deep(a) {
  color: rgb(var(--mdui-color-primary));
  text-decoration: none;
}

.markdown-preview :deep(a:hover) {
  text-decoration: underline;
}

.markdown-preview :deep(img) {
  max-width: 100%;
  border-radius: 8px;
}

.markdown-preview :deep(hr) {
  border: none;
  border-top: 1px solid rgb(var(--mdui-color-outline-variant));
  margin: 2em 0;
}

@media (max-width: 768px) {
  .comparison-container {
    flex-direction: column;
  }

  .comparison-divider {
    width: 100%;
    height: 48px;
  }

  .comparison-divider mdui-icon {
    transform: rotate(90deg);
  }

  .result-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .result-stats {
    margin-left: 0;
  }

  .preview-toggle {
    width: 100%;
  }

  .preview-toggle mdui-button {
    flex: 1;
  }

  .result-actions {
    width: 100%;
  }

  .result-actions mdui-button {
    flex: 1;
  }
}
</style>