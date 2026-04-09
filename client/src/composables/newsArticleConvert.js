import { useApi } from '@/composables/axios'

/**
 * 呼叫後端將類 Markdown 純文字轉為 Tiptap JSON（最新消息 article 欄位）。
 * 需已登入（ADMIN / STAFF）。
 * @param {string} text
 * @param {{ format?: string }} [options]
 * @returns {Promise<object>} Tiptap doc JSON（type: "doc"）
 */
export const convertNewsArticleMarkdownToTiptap = async (text, options = {}) => {
  const { apiAuth, safeApiCall } = useApi()
  const format = options.format ?? 'markdown-like'
  const response = await safeApiCall(() =>
    apiAuth.post('/api/news/convert-article-text', { text, format }),
  )
  const content = response?.data?.result?.content
  if (!content || content.type !== 'doc') {
    throw new Error('轉換 API 回傳格式異常')
  }
  return content
}
