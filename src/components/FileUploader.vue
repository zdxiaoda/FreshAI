<script setup>
import { ref } from 'vue'
import { snackbar } from 'mdui/functions/snackbar.js'

const emit = defineEmits(['file-loaded'])

const loading = ref(false)
const currentFile = ref(null)
const fileName = ref('')
const fileExt = ref('')
const fileSize = ref('')

const hasFile = ref(false)

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function handleFileSelect(event) {
  const file = event.target.files[0]
  if (file) processFile(file)
}

function handleDrop(event) {
  event.preventDefault()
  event.stopPropagation()
  const file = event.dataTransfer.files[0]
  if (file) processFile(file)
}

function handleDragOver(event) {
  event.preventDefault()
  event.stopPropagation()
}

async function processFile(file) {
  const validTypes = ['.txt', '.md', '.markdown', '.docx']
  const ext = '.' + file.name.split('.').pop().toLowerCase()

  if (!validTypes.includes(ext)) {
    snackbar({ message: '不支持的文件格式，请上传 TXT、Markdown 或 DOCX 文件' })
    return
  }

  if (file.size > 10 * 1024 * 1024) {
    snackbar({ message: '文件大小不能超过 10MB' })
    return
  }

  loading.value = true
  currentFile.value = file
  fileName.value = file.name
  fileExt.value = ext
  fileSize.value = formatFileSize(file.size)
  hasFile.value = true

  try {
    let content = ''
    let docxBuffer = null

    if (ext === '.docx') {
      const mammoth = await import('mammoth')
      docxBuffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ arrayBuffer: docxBuffer })
      content = result.value
    } else {
      content = await file.text()
    }

    emit('file-loaded', {
      name: file.name,
      ext: ext,
      size: fileSize.value,
      content: content,
      docxBuffer: docxBuffer // 保存原始 docx 数据
    })

    snackbar({ message: '文件加载成功' })
  } catch (err) {
    snackbar({ message: '文件解析失败' })
    clearFile()
  } finally {
    loading.value = false
  }
}

function clearFile() {
  currentFile.value = null
  fileName.value = ''
  fileExt.value = ''
  fileSize.value = ''
  hasFile.value = false
  document.getElementById('fileInput').value = ''
}

function triggerFileInput() {
  document.getElementById('fileInput').click()
}

defineExpose({ clearFile })
</script>

<template>
  <mdui-card class="upload-card">
    <div
      class="upload-area"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @click="triggerFileInput"
    >
      <input
        id="fileInput"
        type="file"
        accept=".txt,.md,.markdown,.docx"
        @change="handleFileSelect"
        style="display: none"
      >

      <template v-if="loading">
        <mdui-circular-progress></mdui-circular-progress>
        <p class="upload-text">正在加载文件...</p>
      </template>

      <template v-else-if="hasFile">
        <mdui-icon name="description" class="file-icon"></mdui-icon>
        <p class="file-name">{{ fileName }}</p>
        <p class="file-size">{{ fileSize }}</p>
        <mdui-button variant="text" @click.stop="clearFile">
          <mdui-icon slot="icon" name="close"></mdui-icon>
          清除文件
        </mdui-button>
      </template>

      <template v-else>
        <mdui-icon name="cloud_upload" class="upload-icon"></mdui-icon>
        <p class="upload-title">拖拽文件到此处或点击选择</p>
        <p class="upload-hint">支持 TXT、Markdown、DOCX 格式</p>
      </template>
    </div>
  </mdui-card>
</template>

<style scoped>
.upload-card {
  overflow: hidden;
}

.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  min-height: 200px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.upload-area:hover {
  background-color: rgba(var(--mdui-color-primary), 0.05);
}

.upload-icon {
  font-size: 64px;
  color: rgb(var(--mdui-color-primary));
  margin-bottom: 16px;
}

.upload-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 500;
  color: rgb(var(--mdui-color-on-surface));
}

.upload-hint {
  margin: 0;
  font-size: 14px;
  color: rgb(var(--mdui-color-on-surface-variant));
}

.upload-text {
  margin: 16px 0 0 0;
  font-size: 14px;
  color: rgb(var(--mdui-color-on-surface-variant));
}

.file-icon {
  font-size: 48px;
  color: rgb(var(--mdui-color-primary));
  margin-bottom: 12px;
}

.file-name {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 500;
  color: rgb(var(--mdui-color-on-surface));
  word-break: break-all;
}

.file-size {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: rgb(var(--mdui-color-on-surface-variant));
}
</style>