<template>
  <div class="p-4 rich-text-block-editor rounded-md">
    <div class="flex justify-between items-center mb-2">
      <p class="theme-text">內容區塊</p>
      <language-switcher v-model="currentEditingLanguage" />
    </div>

    <div
      v-if="editor"
      class="tiptap-toolbar grid grid-cols-1 sm:grid-cols-3 gap-x-2 gap-y-1 p-2 rounded-t-md border-b"
      :class="conditionalClass('bg-gray-700/20 border-gray-600', 'bg-gray-100/80 border-gray-300')"
    >
      <!-- Format Group -->
      <div class="toolbar-button-group flex items-center gap-1 text-[13px]">
        <label :class="['toolbar-label', conditionalClass('text-gray-400', 'text-gray-600')]">
          格式：
        </label>
        <button
          type="button"
          @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
          :class="['toolbar-button', isHeadingActive ? 'is-active' : defaultButtonClass]"
          title="標題 (H2)"
        >
          標題
        </button>
        <button
          type="button"
          @click="editor.chain().focus().setParagraph().run()"
          :class="['toolbar-button', isParagraphActive ? 'is-active' : defaultButtonClass]"
          title="內文 (Paragraph)"
        >
          內文
        </button>
        <button
          type="button"
          @click="editor.chain().focus().toggleBlockquote().run()"
          :class="['toolbar-button', isBlockquoteActive ? 'is-active' : defaultButtonClass]"
          title="備註 (引用)"
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
        >
          粗體
        </button>
        <button
          type="button"
          @click="editor.chain().focus().toggleItalic().run()"
          :disabled="!editor.can().chain().focus().toggleItalic().run()"
          :class="['toolbar-button', editor.isActive('italic') ? 'is-active' : defaultButtonClass]"
          title="斜體"
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
</template>

<script setup>
import { ref, watch, onUnmounted, onMounted, computed } from 'vue'
import { useThemeClass } from '@/composables/useThemeClass'
import { useDark } from '@vueuse/core'
import LanguageSwitcher from '@/components/common/languageSwitcher.vue'

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
})

const emit = defineEmits(['update:modelValue'])
const { conditionalClass } = useThemeClass()
const isDark = useDark()

const currentEditingLanguage = ref(props.initialLanguage || 'TW')

const defaultEmptyContent = () => ({ type: 'doc', content: [{ type: 'paragraph' }] })

// --- 幫助函數，用於確保傳入的內容是有效的 Tiptap 文檔物件 ---
const getValidTiptapContent = (contentInput) => {
  if (
    contentInput &&
    typeof contentInput === 'object' &&
    contentInput.type === 'doc' &&
    Array.isArray(contentInput.content)
  ) {
    // 如果 contentInput.content 為空陣列，ProseMirror 可能仍會報錯，
    // Tiptap 通常期望至少有一個 paragraph。
    if (contentInput.content.length === 0) {
      // console.warn("Tiptap content was empty, ensuring default paragraph.");
      return { ...contentInput, content: [{ type: 'paragraph' }] }
    }
    return contentInput // 看起來是個有效的 Tiptap JSON 文檔
  }
  // console.warn("Invalid Tiptap content detected, falling back to default empty content.", contentInput);
  return defaultEmptyContent() // 否則返回預設的空文檔
}
// --- 結束幫助函數 ---

const editor = useEditor({
  content: getValidTiptapContent(props.modelValue[currentEditingLanguage.value]),
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [2],
      },
      bulletList: false,
      orderedList: false,
      listItem: false,
      codeBlock: false,
      hardBreak: false,
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

// Computed properties for button active states
const isHeadingActive = computed(() => {
  return editor.value ? editor.value.isActive('heading', { level: 2 }) : false
})

const isBlockquoteActive = computed(() => {
  // Active if it's a blockquote.
  return editor.value ? editor.value.isActive('blockquote') : false
})

const isParagraphActive = computed(() => {
  // Active if it's a paragraph.
  return editor.value ? editor.value.isActive('paragraph') : false
})

const defaultButtonClass = computed(() => {
  return conditionalClass(
    'bg-gray-500/30 hover:bg-gray-500/50 text-gray-200',
    'bg-gray-200/70 hover:bg-gray-300/70 text-gray-800',
  )
})

watch(currentEditingLanguage, (newLang, oldLang) => {
  if (editor.value && newLang !== oldLang) {
    editor.value.commands.setContent(getValidTiptapContent(props.modelValue[newLang]), false)
  }
})

watch(
  () => props.modelValue,
  (newVal) => {
    if (editor.value) {
      const editorContentJson = JSON.stringify(editor.value.getJSON())
      const newContentForLangJson = JSON.stringify(
        getValidTiptapContent(newVal[currentEditingLanguage.value]),
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

onMounted(() => {
  if (editor.value) {
    const initialContent = getValidTiptapContent(props.modelValue[currentEditingLanguage.value])
    if (JSON.stringify(editor.value.getJSON()) !== JSON.stringify(initialContent)) {
      editor.value.commands.setContent(initialContent, false)
    }
  }
})

onUnmounted(() => {
  if (editor.value) {
    editor.value.destroy()
  }
})
</script>

<style>
.toolbar-label {
  font-size: 0.8125rem;
  font-weight: 500;
  margin-right: 0.25rem;
  white-space: nowrap;
  color: var(--toolbar-label-color, #4a5568);
}
html.dark .toolbar-label {
  color: var(--toolbar-label-color-dark, #a0aec0);
}

.tiptap-toolbar button.toolbar-button,
.tiptap-toolbar input.toolbar-button {
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

.tiptap-toolbar button.toolbar-button:not(.is-active) {
  border-color: var(--button-default-border-color, #e2e8f0);
}
html.dark .tiptap-toolbar button.toolbar-button:not(.is-active) {
  border-color: var(--button-default-border-color-dark, #4a5568);
}

.tiptap-toolbar button.toolbar-button.is-active {
  background-color: #3b82f6 !important;
  color: white !important;
  border-color: #3b82f6 !important;
}
html.dark .tiptap-toolbar button.toolbar-button.is-active {
  background-color: #60a5fa !important;
  color: #1f2937 !important;
  border-color: #60a5fa !important;
}

.tiptap-toolbar .color-picker {
  width: 1.6rem;
  height: 1.6rem;
  padding: 0.1rem;
  border: 1px solid;
  cursor: pointer;
  vertical-align: middle;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-color: transparent;
  border-radius: 0.25rem;
}

html.dark .tiptap-toolbar .color-picker {
  border-color: var(--button-default-border-color-dark, #4a5568);
}
html:not(.dark) .tiptap-toolbar .color-picker {
  border-color: var(--button-default-border-color, #e2e8f0);
}

.tiptap-toolbar .color-picker::-webkit-color-swatch-wrapper {
  padding: 0;
}
.tiptap-toolbar .color-picker::-webkit-color-swatch {
  border: none;
  border-radius: 0.125rem;
}
.tiptap-toolbar .color-picker::-moz-color-swatch {
  border: none;
  border-radius: 0.125rem;
}

.tiptap-content-area .ProseMirror {
  min-height: 150px;
  padding: 0.75rem;
  border: 1px solid;
  border-radius: 0 0 0.375rem 0.375rem;
  outline: none;
  margin-top: -1px;
}

html.dark .tiptap-content-area .ProseMirror {
  border-color: #4a5568;
  color: #d1d5db;
  background-color: #1f2937;
}

html:not(.dark) .tiptap-content-area .ProseMirror {
  border-color: #d1d5db;
  color: #1f2937;
  background-color: white;
}

.ProseMirror h2 {
  font-size: 1.25em;
  font-weight: 600;
  margin-top: 0.5em;
  margin-bottom: 0.25em;
}
.ProseMirror p {
  margin-bottom: 0.5em;
  line-height: 1.6;
}
.ProseMirror blockquote {
  border-left: 3px solid;
  margin-left: 1rem;
  padding-left: 1rem;
  font-style: italic;
}
html:not(.dark) .ProseMirror blockquote {
  border-left-color: #cbd5e1;
  color: #4b5563;
}
html.dark .ProseMirror blockquote {
  border-left-color: #4b5563;
  color: #9ca3af;
}

/* Table styles */
.ProseMirror table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
  table-layout: fixed;
}

.ProseMirror th,
.ProseMirror td {
  border: none;
  border-bottom: 1px solid;
  padding: 0.5rem;
  vertical-align: top;
  position: relative;
  text-align: left;
}

.ProseMirror th {
  border-bottom-width: 3px;
}

/* Light mode styles */
html:not(.dark) .ProseMirror th,
html:not(.dark) .ProseMirror td {
  border-color: #e5e7eb;
}

html:not(.dark) .ProseMirror th {
  font-weight: 500;
  color: #6b7280;
  background-color: transparent;
}

/* Dark mode styles */
html.dark .ProseMirror th,
html.dark .ProseMirror td {
  border-color: #4b5563;
}

html.dark .ProseMirror th {
  font-weight: 500;
  color: #9ca3af;
  background-color: transparent;
}

.ProseMirror .selectedCell:after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(96, 165, 250, 0.2);
  pointer-events: none;
}

.ProseMirror .column-resize-handle {
  position: absolute;
  right: -2px;
  top: 0;
  bottom: 0;
  width: 4px;
  background-color: #60a5fa;
  pointer-events: none;
}
</style>
