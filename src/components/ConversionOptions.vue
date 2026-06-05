<script setup>
import { ref } from 'vue'

const props = defineProps({
  hasFile: Boolean,
  isConverting: Boolean
})

const emit = defineEmits(['convert'])

const convertQuotes = ref(true)
const convertCommas = ref(true)
const convertPeriods = ref(true)
const convertOther = ref(true)

function handleConvert() {
  emit('convert', {
    convertQuotes: convertQuotes.value,
    convertCommas: convertCommas.value,
    convertPeriods: convertPeriods.value,
    convertOther: convertOther.value
  })
}
</script>

<template>
  <mdui-card class="options-card">
    <h3 class="card-title">
      <mdui-icon name="tune"></mdui-icon>
      转换选项
    </h3>

    <div class="options-grid">
      <div class="option-item">
        <mdui-checkbox
          :checked="convertQuotes"
          @change="convertQuotes = $event.target.checked"
        ></mdui-checkbox>
        <span class="option-label">转换引号</span>
        <span class="option-example">" " → " "</span>
      </div>

      <div class="option-item">
        <mdui-checkbox
          :checked="convertCommas"
          @change="convertCommas = $event.target.checked"
        ></mdui-checkbox>
        <span class="option-label">转换逗号</span>
        <span class="option-example">, → ，</span>
      </div>

      <div class="option-item">
        <mdui-checkbox
          :checked="convertPeriods"
          @change="convertPeriods = $event.target.checked"
        ></mdui-checkbox>
        <span class="option-label">转换句号</span>
        <span class="option-example">. → 。</span>
      </div>

      <div class="option-item">
        <mdui-checkbox
          :checked="convertOther"
          @change="convertOther = $event.target.checked"
        ></mdui-checkbox>
        <span class="option-label">转换其他标点</span>
        <span class="option-example">; : ? ! 等</span>
      </div>
    </div>

    <div class="convert-actions">
      <mdui-button
        :disabled="!hasFile || isConverting"
        @click="handleConvert"
      >
        <mdui-icon slot="icon" name="auto_fix_high"></mdui-icon>
        {{ isConverting ? '转换中...' : '开始转换' }}
      </mdui-button>
    </div>
  </mdui-card>
</template>

<style scoped>
.options-card {
  padding: 24px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 500;
  color: rgb(var(--mdui-color-on-surface));
}

.card-title mdui-icon {
  color: rgb(var(--mdui-color-primary));
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background-color: rgb(var(--mdui-color-surface-container-highest));
  border-radius: 12px;
}

.option-label {
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--mdui-color-on-surface));
}

.option-example {
  margin-left: auto;
  font-size: 12px;
  font-family: monospace;
  color: rgb(var(--mdui-color-on-surface-variant));
  background-color: rgb(var(--mdui-color-surface-container));
  padding: 2px 8px;
  border-radius: 4px;
}

.convert-actions {
  display: flex;
  justify-content: center;
}

@media (max-width: 768px) {
  .options-grid {
    grid-template-columns: 1fr;
  }
}
</style>