/** 空 Tiptap 文檔（單一段落） */
export const emptyTiptapDoc = () => ({
  type: 'doc',
  content: [{ type: 'paragraph' }],
})

/**
 * 正規化為可載入編輯器的 Tiptap doc；無效時回傳空文檔。
 * @param {unknown} contentInput
 */
export const getValidTiptapDoc = (contentInput) => {
  if (
    contentInput &&
    typeof contentInput === 'object' &&
    contentInput.type === 'doc' &&
    Array.isArray(contentInput.content)
  ) {
    if (contentInput.content.length === 0) {
      return { ...contentInput, content: [{ type: 'paragraph' }] }
    }
    return contentInput
  }
  return emptyTiptapDoc()
}

/** 是否為空文檔（無內容或僅空段落） */
export const isTiptapDocEmpty = (doc) => {
  if (!doc?.content?.length) return true
  return (
    doc.content.length === 1 &&
    doc.content[0].type === 'paragraph' &&
    !doc.content[0].content
  )
}
