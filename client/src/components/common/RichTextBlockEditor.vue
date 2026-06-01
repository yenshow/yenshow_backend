<template>
  <div
    class="p-4 rich-text-block-editor rounded-md"
    :data-testid="dataTestId"
    :data-lang="currentEditingLanguage"
    :data-field="activeFieldName"
  >
    <div class="flex justify-between items-center mb-2">
      <p class="theme-text">內容區塊</p>
      <language-switcher
        v-model="currentEditingLanguage"
        :data-test-id="languageSwitcherTestId"
        aria-label="主要內容語言切換"
      />
    </div>

    <div
      class="rich-text-editor-body rounded-md"
      :class="conditionalClass('border border-gray-600', 'border border-gray-300')"
    >
      <div
        v-if="editor"
        class="tiptap-toolbar sticky top-0 z-10 grid grid-cols-1 sm:grid-cols-3 gap-x-2 gap-y-1 p-2 border-b shadow-sm backdrop-blur-sm"
        :class="conditionalClass('bg-gray-800/95 border-gray-600', 'bg-white/95 border-gray-300')"
      >
      <!-- Format Group -->
      <div class="toolbar-button-group flex flex-wrap items-center gap-1 text-[13px]">
        <label :class="['toolbar-label', conditionalClass('text-gray-400', 'text-gray-600')]">
          格式：
        </label>
        <button
          type="button"
          @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
          :class="['toolbar-button', isH1Active ? 'is-active' : defaultButtonClass]"
          title="標題 H1"
          aria-label="標題 H1"
        >
          H1
        </button>
        <button
          type="button"
          @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
          :class="['toolbar-button', isH2Active ? 'is-active' : defaultButtonClass]"
          title="標題 H2"
          aria-label="標題 H2"
        >
          H2
        </button>
        <button
          type="button"
          @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
          :class="['toolbar-button', isH3Active ? 'is-active' : defaultButtonClass]"
          title="標題 H3"
          aria-label="標題 H3"
        >
          H3
        </button>
        <button
          type="button"
          @click="editor.chain().focus().setParagraph().run()"
          :class="['toolbar-button', isParagraphActive ? 'is-active' : defaultButtonClass]"
          title="內文 (Paragraph)"
          aria-label="內文段落"
        >
          內文
        </button>
        <button
          type="button"
          @click="editor.chain().focus().toggleBulletList().run()"
          :class="['toolbar-button', isBulletListActive ? 'is-active' : defaultButtonClass]"
          title="項目符號清單"
          aria-label="項目符號清單"
        >
          • 清單
        </button>
        <button
          type="button"
          @click="editor.chain().focus().toggleOrderedList().run()"
          :class="['toolbar-button', isOrderedListActive ? 'is-active' : defaultButtonClass]"
          title="編號清單"
          aria-label="編號清單"
        >
          1. 清單
        </button>
        <button
          type="button"
          @click="editor.chain().focus().toggleBlockquote().run()"
          :class="['toolbar-button', isBlockquoteActive ? 'is-active-remark' : defaultButtonClass]"
          title="備註 (引用)"
          aria-label="備註引用"
        >
          備註
        </button>
      </div>

      <!-- Style Group -->
      <div class="toolbar-button-group flex items-center gap-1 text-[13px]">
        <label :class="['toolbar-label', conditionalClass('text-gray-400', 'text-gray-600')]">
          樣式：
        </label>
        <button
          type="button"
          @click="editor.chain().focus().toggleBold().run()"
          :disabled="!editor.can().chain().focus().toggleBold().run()"
          :class="['toolbar-button', editor.isActive('bold') ? 'is-active' : defaultButtonClass]"
          title="粗體"
          aria-label="粗體"
        >
          粗體
        </button>
        <button
          type="button"
          @click="editor.chain().focus().toggleItalic().run()"
          :disabled="!editor.can().chain().focus().toggleItalic().run()"
          :class="['toolbar-button', editor.isActive('italic') ? 'is-active' : defaultButtonClass]"
          title="斜體"
          aria-label="斜體"
        >
          斜體
        </button>
      </div>

      <!-- Color Group -->
      <div class="toolbar-button-group flex items-center gap-1 text-[13px]">
        <label :class="['toolbar-label', conditionalClass('text-gray-400', 'text-gray-600')]">
          顏色：
        </label>
        <input
          type="color"
          @input="editor.chain().focus().setColor($event.target.value).run()"
          :value="editor.getAttributes('textStyle').color || (isDark ? '#FFFFFF' : '#000000')"
          title="文字顏色"
          class="toolbar-button color-picker"
          :style="{
            backgroundColor:
              editor.getAttributes('textStyle').color || (isDark ? '#FFFFFF' : '#000000'),
          }"
        />
        <button
          type="button"
          @click="editor.chain().focus().unsetColor().run()"
          :class="['toolbar-button', defaultButtonClass]"
          title="清除顏色"
        >
          清除顏色
        </button>
      </div>

      <!-- Table Group -->
      <div class="toolbar-button-group flex flex-wrap items-center gap-1 text-[13px] col-span-full">
        <label :class="['toolbar-label', conditionalClass('text-gray-400', 'text-gray-600')]">
          表格：
        </label>
        <button
          type="button"
          @click="
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          "
          :class="['toolbar-button', defaultButtonClass]"
        >
          插入表格
        </button>
        <button
          type="button"
          @click="editor.chain().focus().toggleHeaderRow().run()"
          :class="['toolbar-button', defaultButtonClass]"
        >
          標題行
        </button>
        <button
          type="button"
          @click="editor.chain().focus().addColumnAfter().run()"
          :class="['toolbar-button', defaultButtonClass]"
        >
          右增列
        </button>
        <button
          type="button"
          @click="editor.chain().focus().deleteColumn().run()"
          :class="['toolbar-button', defaultButtonClass]"
        >
          刪除列
        </button>
        <button
          type="button"
          @click="editor.chain().focus().addRowAfter().run()"
          :class="['toolbar-button', defaultButtonClass]"
        >
          下增行
        </button>
        <button
          type="button"
          @click="editor.chain().focus().deleteRow().run()"
          :class="['toolbar-button', defaultButtonClass]"
        >
          刪除行
        </button>
        <button
          type="button"
          @click="editor.chain().focus().deleteTable().run()"
          :class="['toolbar-button', defaultButtonClass]"
        >
          刪除表格
        </button>
      </div>
      </div>
      <editor-content :editor="editor" class="tiptap-content-area" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted, computed } from 'vue'
import { useThemeClass } from '@/composables/useThemeClass'
import { useDark } from '@vueuse/core'
import LanguageSwitcher from '@/components/common/languageSwitcher.vue'
import { getValidTiptapDoc } from '@/composables/tiptapDoc'

import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Table from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
    default: () => ({
      TW: { type: 'doc', content: [{ type: 'paragraph' }] },
      EN: { type: 'doc', content: [{ type: 'paragraph' }] },
    }),
  },
  initialLanguage: {
    type: String,
    default: 'TW',
  },
  dataTestId: {
    type: String,
    default: '',
  },
  fieldBase: {
    type: String,
    default: 'article',
  },
})

const emit = defineEmits(['update:modelValue'])
const { conditionalClass } = useThemeClass()
const isDark = useDark()

const currentEditingLanguage = ref(props.initialLanguage || 'TW')

const languageSwitcherTestId = computed(() => {
  if (!props.dataTestId) return ''
  return `${props.dataTestId}-lang`
})

const activeFieldName = computed(() => `${props.fieldBase}.${currentEditingLanguage.value}`)

const editor = useEditor({
  content: getValidTiptapDoc(props.modelValue[currentEditingLanguage.value]),
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
      codeBlock: false,
      horizontalRule: false,
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer nofollow' },
    }),
    TextStyle,
    Color,
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
  ],
  editable: true,
  onUpdate: ({ editor: updatedEditor }) => {
    const currentJson = updatedEditor.getJSON()
    const newModelData = {
      ...props.modelValue,
      [currentEditingLanguage.value]: currentJson,
    }
    emit('update:modelValue', newModelData)
  },
})

const createIsActive = (name, attributes) =>
  computed(() => {
    if (!editor.value) return false
    return attributes ? editor.value.isActive(name, attributes) : editor.value.isActive(name)
  })

const isH1Active = createIsActive('heading', { level: 1 })
const isH2Active = createIsActive('heading', { level: 2 })
const isH3Active = createIsActive('heading', { level: 3 })
const isParagraphActive = createIsActive('paragraph')
const isBulletListActive = createIsActive('bulletList')
const isOrderedListActive = createIsActive('orderedList')
const isBlockquoteActive = createIsActive('blockquote')

const defaultButtonClass = computed(() => {
  return conditionalClass(
    'bg-gray-500/30 hover:bg-gray-500/50 text-gray-200',
    'bg-gray-200/70 hover:bg-gray-300/70 text-gray-800',
  )
})

watch(currentEditingLanguage, (newLang, oldLang) => {
  if (editor.value && newLang !== oldLang) {
    editor.value.commands.setContent(getValidTiptapDoc(props.modelValue[newLang]), false)
  }
})

watch(
  () => props.modelValue,
  (newVal) => {
    if (editor.value) {
      const editorContentJson = JSON.stringify(editor.value.getJSON())
      const newContentForLangJson = JSON.stringify(
        getValidTiptapDoc(newVal[currentEditingLanguage.value]),
      )

      if (editorContentJson !== newContentForLangJson) {
        editor.value.commands.setContent(JSON.parse(newContentForLangJson), false)
      }
    }
  },
  { deep: true },
)

watch(
  () => props.initialLanguage,
  (newVal) => {
    if (newVal && newVal !== currentEditingLanguage.value) {
      currentEditingLanguage.value = newVal
    }
  },
)

onUnmounted(() => {
  if (editor.value) {
    editor.value.destroy()
  }
})

/** 供父層或自動化腳本寫入已轉換之 Tiptap JSON（不經由 API 時仍可用） */
const setContentFromTiptapDoc = (docJson, emitUpdate = true) => {
  if (!editor.value || !docJson) {
    return
  }
  const valid = getValidTiptapDoc(docJson)
  editor.value.commands.setContent(valid, emitUpdate)
}

defineExpose({
  setContentFromTiptapDoc,
  getEditor: () => editor.value,
})
</script>

<style>
/* 樣式皆限於 .rich-text-block-editor，避免污染全域 ProseMirror */
.rich-text-block-editor .toolbar-label {
  font-size: 0.8125rem;
  font-weight: 500;
  margin-right: 0.25rem;
  white-space: nowrap;
}

.rich-text-block-editor .tiptap-toolbar button.toolbar-button,
.rich-text-block-editor .tiptap-toolbar input.toolbar-button {
  padding: 0.2rem 0.5rem;
  border-radius: 0.375rem;
  border: 1px solid transparent;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.4;
  transition:
    background-color 0.2s ease-in-out,
    border-color 0.2s ease-in-out;
}

.rich-text-block-editor .tiptap-toolbar button.toolbar-button:not(.is-active):not(.is-active-remark) {
  border-color: #e2e8f0;
}
html.dark .rich-text-block-editor .tiptap-toolbar button.toolbar-button:not(.is-active):not(.is-active-remark) {
  border-color: #4a5568;
}

.rich-text-block-editor .tiptap-toolbar button.toolbar-button.is-active {
  background-color: #3b82f6 !important;
  color: white !important;
  border-color: #3b82f6 !important;
}
html.dark .rich-text-block-editor .tiptap-toolbar button.toolbar-button.is-active {
  background-color: #60a5fa !important;
  color: #1f2937 !important;
  border-color: #60a5fa !important;
}

.rich-text-block-editor .tiptap-toolbar button.toolbar-button.is-active-remark {
  background-color: #a855f7 !important;
  color: white !important;
  border-color: #a855f7 !important;
}
html.dark .rich-text-block-editor .tiptap-toolbar button.toolbar-button.is-active-remark {
  background-color: #c084fc !important;
  color: #1f2937 !important;
  border-color: #c084fc !important;
}

.rich-text-block-editor .tiptap-toolbar .color-picker {
  width: 1.6rem;
  height: 1.6rem;
  padding: 0.1rem;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  vertical-align: middle;
  appearance: none;
  background-color: transparent;
  border-radius: 0.25rem;
}
html.dark .rich-text-block-editor .tiptap-toolbar .color-picker {
  border-color: #4a5568;
}

.rich-text-block-editor .tiptap-toolbar .color-picker::-webkit-color-swatch-wrapper {
  padding: 0;
}
.rich-text-block-editor .tiptap-toolbar .color-picker::-webkit-color-swatch,
.rich-text-block-editor .tiptap-toolbar .color-picker::-moz-color-swatch {
  border: none;
  border-radius: 0.125rem;
}

.rich-text-block-editor .tiptap-content-area {
  max-height: min(50vh, 28rem);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.rich-text-block-editor .tiptap-content-area .ProseMirror {
  min-height: 150px;
  padding: 0.75rem;
  outline: none;
}

html.dark .rich-text-block-editor .tiptap-content-area .ProseMirror {
  color: #d1d5db;
  background-color: #1f2937;
}

html:not(.dark) .rich-text-block-editor .tiptap-content-area .ProseMirror {
  color: #1f2937;
  background-color: white;
}

.rich-text-block-editor .tiptap-content-area .ProseMirror h1 {
  font-size: 1.5em;
  font-weight: 700;
  margin: 0.5em 0 0.25em;
  line-height: 1.3;
}

.rich-text-block-editor .tiptap-content-area .ProseMirror h2 {
  font-size: 1.25em;
  font-weight: 600;
  margin: 0.5em 0 0.25em;
}

.rich-text-block-editor .tiptap-content-area .ProseMirror h3 {
  font-size: 1.1em;
  font-weight: 600;
  margin: 0.5em 0 0.25em;
}

.rich-text-block-editor .tiptap-content-area .ProseMirror p {
  margin-bottom: 0.5em;
  line-height: 1.6;
}

/* Tailwind preflight 會將 ul/ol 的 list-style 設為 none */
.rich-text-block-editor .tiptap-content-area .ProseMirror ul,
.rich-text-block-editor .tiptap-content-area .ProseMirror ol {
  margin: 0.35em 0 0.5em;
  padding-left: 1.5rem;
  list-style-position: outside;
}

.rich-text-block-editor .tiptap-content-area .ProseMirror ul {
  list-style-type: disc;
}

.rich-text-block-editor .tiptap-content-area .ProseMirror ol {
  list-style-type: decimal;
}

.rich-text-block-editor .tiptap-content-area .ProseMirror ul ul {
  list-style-type: circle;
}

.rich-text-block-editor .tiptap-content-area .ProseMirror ul ul ul {
  list-style-type: square;
}

.rich-text-block-editor .tiptap-content-area .ProseMirror li {
  display: list-item;
  margin-bottom: 0.25em;
  line-height: 1.6;
}

.rich-text-block-editor .tiptap-content-area .ProseMirror li > p {
  margin: 0;
}

.rich-text-block-editor .tiptap-content-area .ProseMirror blockquote {
  border-left: 4px solid;
  margin: 0.75em 0;
  padding: 0.5rem 0 0.5rem 1rem;
  font-style: italic;
}

html:not(.dark) .rich-text-block-editor .tiptap-content-area .ProseMirror blockquote {
  border-left-color: #a855f7;
  color: #4b5563;
  background-color: rgba(168, 85, 247, 0.06);
}

html.dark .rich-text-block-editor .tiptap-content-area .ProseMirror blockquote {
  border-left-color: #c084fc;
  color: #d1d5db;
  background-color: rgba(192, 132, 252, 0.1);
}

.rich-text-block-editor .tiptap-content-area .ProseMirror a {
  color: #3b82f6;
  text-decoration: underline;
  cursor: pointer;
}

html.dark .rich-text-block-editor .tiptap-content-area .ProseMirror a {
  color: #60a5fa;
}

.rich-text-block-editor .tiptap-content-area .ProseMirror table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
  table-layout: fixed;
}

.rich-text-block-editor .tiptap-content-area .ProseMirror th,
.rich-text-block-editor .tiptap-content-area .ProseMirror td {
  border: none;
  border-bottom: 1px solid;
  padding: 0.5rem;
  vertical-align: top;
  position: relative;
  text-align: left;
}

.rich-text-block-editor .tiptap-content-area .ProseMirror th {
  border-bottom-width: 3px;
  font-weight: 500;
}

html:not(.dark) .rich-text-block-editor .tiptap-content-area .ProseMirror th,
html:not(.dark) .rich-text-block-editor .tiptap-content-area .ProseMirror td {
  border-color: #e5e7eb;
}

html:not(.dark) .rich-text-block-editor .tiptap-content-area .ProseMirror th {
  color: #6b7280;
}

html.dark .rich-text-block-editor .tiptap-content-area .ProseMirror th,
html.dark .rich-text-block-editor .tiptap-content-area .ProseMirror td {
  border-color: #4b5563;
}

html.dark .rich-text-block-editor .tiptap-content-area .ProseMirror th {
  color: #9ca3af;
}

.rich-text-block-editor .tiptap-content-area .ProseMirror .selectedCell:after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(96, 165, 250, 0.2);
  pointer-events: none;
}

.rich-text-block-editor .tiptap-content-area .ProseMirror .column-resize-handle {
  position: absolute;
  right: -2px;
  top: 0;
  bottom: 0;
  width: 4px;
  background-color: #60a5fa;
  pointer-events: none;
}
</style>
