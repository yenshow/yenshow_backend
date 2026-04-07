<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
    <div
      :class="[
        cardClass,
        'w-full max-w-3xl rounded-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto relative',
      ]"
      data-testid="news-modal"
    >
      <button
        @click="closeModal"
        class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        title="關閉"
        data-testid="news-modal-close"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      <h2
        class="text-[16px] lg:text-[24px] font-bold text-center mb-[12px] lg:mb-[24px] theme-text"
      >
        {{ isEditing ? '編輯新聞' : '新增新聞' }}
      </h2>

      <LoadingSpinner v-if="loading" container-class="text-center py-8" />

      <form
        v-else
        @submit.prevent="submitForm"
        class="space-y-[12px] lg:space-y-[24px]"
        data-testid="news-form"
      >
        <div class="border-b" :class="conditionalClass('border-gray-700', 'border-gray-200')">
          <nav class="flex space-x-8" aria-label="表單步驟" role="tablist" data-testid="news-step-tabs">
            <button
              v-for="tab in tabs"
              :key="tab.name"
              type="button"
              @click="currentTab = tab.name"
              role="tab"
              :aria-selected="currentTab === tab.name"
              :data-step="tab.name"
              :data-testid="`news-step-tab-${tab.name}`"
              :class="[
                currentTab === tab.name
                  ? conditionalClass(
                      'border-blue-500 text-blue-400',
                      'border-blue-600 text-blue-700',
                    )
                  : conditionalClass(
                      'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500',
                      'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                    ),
                'pb-3 px-1 border-b-2 text-sm cursor-pointer',
              ]"
            >
              {{ tab.label }}
            </button>
          </nav>
        </div>

        <div v-if="stepErrorGroups.length" class="space-y-2" data-testid="news-validation-summary">
          <div class="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded-md">
            <p class="font-medium">請修正下列欄位後再送出</p>
            <div class="mt-2 space-y-2">
              <div v-for="group in stepErrorGroups" :key="group.step">
                <button
                  type="button"
                  class="text-sm underline underline-offset-2"
                  :data-testid="`news-validation-jump-${group.step}`"
                  @click="currentTab = group.step"
                >
                  {{ group.stepLabel }}
                </button>
                <ul class="mt-1 list-disc ps-5 text-sm space-y-0.5">
                  <li v-for="err in group.errors" :key="err.field">
                    <span class="opacity-90">{{ err.fieldLabel }}</span>
                    <span class="opacity-80"> — </span>
                    <span>{{ err.message }}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- 非欄位驗證錯誤（例如後端回傳、網路錯誤） -->
        <div
          v-else-if="formError"
          class="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded-md"
          data-testid="news-form-error"
        >
          {{ formError }}
        </div>

        <div class="space-y-[12px] lg:space-y-[24px] overflow-y-auto flex-grow min-h-[400px]">
          <!-- 基本資訊 -->
          <div v-show="currentTab === 'general'" data-testid="news-step-general" data-step="general">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label for="newsAuthor" class="block mb-3 theme-text">作者 *</label>
                <input
                  id="newsAuthor"
                  name="author"
                  data-testid="news-author"
                  v-model="form.author"
                  type="text"
                  :class="[inputClass, validationErrors.author ? 'border-red-500' : '']"
                  placeholder="請輸入作者名稱"
                />
                <p v-if="validationErrors.author" class="text-red-500 text-xs mt-1">
                  {{ validationErrors.author }}
                </p>
              </div>
              <div>
                <label for="newsIsActive" class="block mb-3 theme-text">發布狀態</label>
                <div v-if="isAdmin">
                  <select
                    id="newsIsActive"
                    name="publishStatus"
                    data-testid="news-publish-status"
                    v-model="form.isActive"
                    :class="[inputClass]"
                  >
                    <option :value="false" class="text-black/70">待審查</option>
                    <option :value="true" class="text-black/70">已發布</option>
                  </select>
                </div>
                <div v-else-if="isEditing">
                  <p :class="[inputClass, 'bg-opacity-50 cursor-not-allowed']">
                    {{ form.isActive ? '已發布' : '待審查' }}
                  </p>
                </div>
                <div v-else>
                  <p :class="[inputClass, 'bg-opacity-50 cursor-not-allowed']">
                    待審查 (提交後將由管理員審核)
                  </p>
                </div>
              </div>

              <div>
                <label for="newsCatMain" class="block mb-3 theme-text">主分類 *</label>
                <select
                  id="newsCatMain"
                  name="mainCategory"
                  data-testid="news-main-category"
                  v-model="form.category.main.TW"
                  :class="[
                    inputClass,
                    validationErrors['category.main.TW'] ? 'border-red-500' : '',
                  ]"
                >
                  <option value="" disabled class="text-black/70">請選擇主分類 (TW)</option>
                  <option
                    v-for="cat in newsCategoriesTW"
                    :key="cat"
                    :value="cat"
                    class="text-black/70"
                  >
                    {{ cat }}
                  </option>
                </select>
                <p v-if="validationErrors['category.main.TW']" class="text-red-500 text-xs mt-1">
                  {{ validationErrors['category.main.TW'] }}
                </p>
              </div>

              <div>
                <label for="publishDate" class="block mb-3 theme-text">發布日期 *</label>
                <input
                  id="publishDate"
                  name="publishDate"
                  data-testid="news-publish-date"
                  v-model="form.publishDate"
                  type="date"
                  :class="[
                    inputClass,
                    'pe-3',
                    validationErrors.publishDate ? 'border-red-500' : '',
                  ]"
                />
                <p v-if="validationErrors.publishDate" class="text-red-500 text-xs mt-1">
                  {{ validationErrors.publishDate }}
                </p>
              </div>
            </div>

            <div class="space-y-3 mt-4">
              <div class="flex justify-between items-center mb-2">
                <label class="block theme-text">標題 *</label>
                <LanguageSwitcher
                  v-model="titleLanguage"
                  :show-label="false"
                  data-test-id="news-title-lang"
                  aria-label="標題語言切換"
                />
              </div>
              <div v-show="titleLanguage === 'TW'">
                <input
                  id="newsTitleTW"
                  name="title.tw"
                  data-testid="news-title-tw"
                  v-model="form.title.TW"
                  type="text"
                  :class="[inputClass, validationErrors['title.TW'] ? 'border-red-500' : '']"
                  placeholder="繁體中文標題"
                />
                <p v-if="validationErrors['title.TW']" class="text-red-500 text-xs mt-1">
                  {{ validationErrors['title.TW'] }}
                </p>
              </div>
              <div v-show="titleLanguage === 'EN'">
                <input
                  id="newsTitleEN"
                  name="title.en"
                  data-testid="news-title-en"
                  v-model="form.title.EN"
                  type="text"
                  :class="[inputClass, validationErrors['title.EN'] ? 'border-red-500' : '']"
                  placeholder="English title (for slug)"
                />
                <p v-if="validationErrors['title.EN']" class="text-red-500 text-xs mt-1">
                  {{ validationErrors['title.EN'] }}
                </p>
              </div>
            </div>

            <div class="space-y-3 mt-4">
              <div class="flex justify-between items-center mb-2">
                <label class="block theme-text">摘要 *</label>
                <LanguageSwitcher
                  v-model="summaryLanguage"
                  :show-label="false"
                  data-test-id="news-summary-lang"
                  aria-label="摘要語言切換"
                />
              </div>
              <div v-show="summaryLanguage === 'TW'">
                <textarea
                  id="newsSummaryTW"
                  name="summary.tw"
                  data-testid="news-summary-tw"
                  v-model="form.summary.TW"
                  rows="6"
                  :class="[inputClass, validationErrors['summary.TW'] ? 'border-red-500' : '']"
                  placeholder="請輸入摘要 (繁體中文)"
                />
                <p v-if="validationErrors['summary.TW']" class="text-red-500 text-xs mt-1">
                  {{ validationErrors['summary.TW'] }}
                </p>
              </div>
              <div v-show="summaryLanguage === 'EN'">
                <textarea
                  id="newsSummaryEN"
                  name="summary.en"
                  data-testid="news-summary-en"
                  v-model="form.summary.EN"
                  rows="6"
                  :class="[inputClass, validationErrors['summary.EN'] ? 'border-red-500' : '']"
                  placeholder="Summary (English)"
                />
                <p v-if="validationErrors['summary.EN']" class="text-red-500 text-xs mt-1">
                  {{ validationErrors['summary.EN'] }}
                </p>
              </div>
            </div>

            <div class="space-y-3 mt-4">
              <div class="flex justify-between items-center mb-2">
                <label class="block theme-text">相關新聞</label>
                <div class="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    @click="relatedNewsFilterCategory = null"
                    :class="chipClass(!relatedNewsFilterCategory)"
                  >
                    全部分類
                  </button>
                  <button
                    v-for="cat in newsCategoriesTW"
                    :key="cat"
                    type="button"
                    @click="relatedNewsFilterCategory = cat"
                    :class="chipClass(relatedNewsFilterCategory === cat)"
                  >
                    {{ cat }}
                  </button>
                </div>
              </div>
              <div
                class="max-h-48 overflow-y-auto rounded-md border p-3"
                :class="conditionalClass('border-gray-600', 'border-gray-300')"
                data-testid="news-related-news"
              >
                <div v-if="filteredAllNews.length === 0" class="text-sm text-gray-500">
                  沒有其他新聞可供關聯
                </div>
                <div
                  v-for="news in filteredAllNews"
                  :key="news._id"
                  class="flex items-center space-x-3 py-2"
                >
                  <input
                    :id="`rn-${news._id}`"
                    name="relatedNews"
                    data-testid="news-related-news-item"
                    v-model="form.relatedNews"
                    type="checkbox"
                    :value="news._id"
                    class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label :for="`rn-${news._id}`" class="theme-text text-sm cursor-pointer">
                    {{ news.title?.TW }}
                  </label>
                </div>
              </div>
            </div>

            <!-- 封面（基本資訊底部） -->
            <div class="mt-6">
              <label class="block mb-3 theme-text">封面圖片 *</label>
              <div
                class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-[10px] cursor-pointer hover:border-blue-400 transition-colors"
                :class="conditionalClass('border-gray-600', 'border-gray-300')"
                role="button"
                tabindex="0"
                aria-label="上傳封面圖片，可點擊或拖曳檔案至此"
                @click="triggerCoverInput"
                @keydown.enter.prevent="triggerCoverInput"
                @keydown.space.prevent="triggerCoverInput"
                @dragenter.prevent
                @dragover.prevent
                @drop.prevent="onCoverDrop"
                data-testid="news-cover-dropzone"
              >
                <div class="space-y-2 text-center min-h-[110px]">
                  <img
                    v-if="imagePreview || form.coverImageUrl"
                    :src="imagePreview || form.coverImageUrl"
                    alt="封面預覽"
                    class="mx-auto max-h-40 rounded mb-2"
                  />
                  <div v-else class="space-y-1 pointer-events-none">
                    <svg
                      class="mx-auto h-12 w-12"
                      :class="conditionalClass('text-gray-500', 'text-gray-400')"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.5"
                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                      />
                    </svg>
                    <div
                      class="flex text-sm justify-center"
                      :class="conditionalClass('text-gray-500', 'text-gray-400')"
                    >
                      <p class="pl-1">點擊或拖曳以上傳封面</p>
                    </div>
                    <p class="text-xs" :class="conditionalClass('text-gray-600', 'text-gray-500')">
                      PNG, JPG, GIF, WEBP, SVG
                    </p>
                  </div>
                  <button
                    v-if="imagePreview || form.coverImageUrl"
                    type="button"
                    class="mt-2 text-xs text-red-500"
                    @click.stop="removeCover"
                  >
                    移除
                  </button>
                </div>
                <input
                  ref="coverInputRef"
                  id="newsCoverImage"
                  name="coverImage"
                  data-testid="news-cover-image"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleCoverChange"
                />
              </div>
              <p v-if="validationErrors.coverImageUrl" class="text-red-500 text-xs mt-1">
                {{ validationErrors.coverImageUrl }}
              </p>
            </div>
          </div>

          <!-- 主要內容 -->
          <div v-show="currentTab === 'mainContent'" data-testid="news-step-mainContent" data-step="mainContent">
            <label class="block theme-text mb-2">主要內容 *</label>
            <RichTextBlockEditor
              v-model="form.article"
              :initial-language="articleLanguage"
              data-test-id="news-article-editor"
              field-base="article"
            />
            <p v-if="validationErrors.article" class="text-red-500 text-xs mt-1">
              {{ validationErrors.article }}
            </p>
          </div>

          <!-- 附加檔案（版面對齊 FAQ：圖片 → 文件 → 影片） -->
          <div v-show="currentTab === 'attachments'" data-testid="news-step-attachments" data-step="attachments">
            <!-- 圖片（固定高度；預覽顯示在框內） -->
            <div class="mb-6">
              <label class="block mb-3 theme-text">圖片 (可上傳多張)</label>
              <div
                class="mt-1 relative px-6 pt-5 pb-6 border-2 border-dashed rounded-[10px] cursor-pointer hover:border-blue-400 transition-colors h-[220px]"
                :class="conditionalClass('border-gray-600', 'border-gray-300')"
                role="button"
                tabindex="0"
                aria-label="上傳圖片，可點擊或拖曳檔案至此"
                @click="triggerAttachImageInput"
                @keydown.enter.prevent="triggerAttachImageInput"
                @keydown.space.prevent="triggerAttachImageInput"
                @dragenter.prevent
                @dragover.prevent
                @drop.prevent="onAttachImagesDrop"
                data-testid="news-attachment-images-dropzone"
              >
                <div
                  v-if="form.attachmentImages.length === 0"
                  class="space-y-1 text-center pointer-events-none flex flex-col items-center justify-center h-full"
                >
                  <svg
                    class="mx-auto h-12 w-12"
                    :class="conditionalClass('text-gray-500', 'text-gray-400')"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.5"
                      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                    />
                  </svg>
                  <div
                    class="flex text-sm justify-center"
                    :class="conditionalClass('text-gray-500', 'text-gray-400')"
                  >
                    <p class="pl-1">點擊或拖曳以上傳圖片</p>
                  </div>
                  <p class="text-xs" :class="conditionalClass('text-gray-600', 'text-gray-500')">
                    PNG, JPG, GIF, WEBP, SVG
                  </p>
                </div>
                <div v-else class="absolute inset-3 overflow-y-auto">
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div
                      v-for="(row, idx) in form.attachmentImages"
                      :key="row._key"
                      class="relative rounded-md overflow-hidden border"
                      :class="conditionalClass('border-gray-600', 'border-gray-300')"
                    >
                      <img
                        v-if="row._preview || row.url"
                        :src="row._preview || row.url"
                        class="w-full h-24 object-cover"
                        alt=""
                      />
                      <div class="px-2 py-1 text-[11px] theme-text opacity-80 truncate">
                        {{ row._newFile?.name || getFileNameFromUrl(row.url) || '圖片' }}
                      </div>
                      <div class="absolute top-1 right-1 flex items-center gap-1">
                        <button
                          type="button"
                          class="bg-red-600/80 text-white text-xs rounded px-1.5 py-0.5"
                          aria-label="刪除"
                          @click.stop="removeAttachmentImage(idx)"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <input
                  ref="attachImageInputRef"
                  id="newsAttachmentImages"
                  name="attachmentImages"
                  data-testid="news-attachment-images"
                  type="file"
                  accept="image/*"
                  multiple
                  class="hidden"
                  @change="onAttachImagesSelected"
                />
              </div>
            </div>

            <!-- 文件（固定高度；清單顯示在框內） -->
            <div class="mb-6">
              <label class="block mb-3 theme-text">文件 (可上傳多個)</label>
              <div
                class="mt-1 relative px-6 pt-5 pb-6 border-2 border-dashed rounded-[10px] cursor-pointer hover:border-blue-400 transition-colors h-[200px]"
                :class="conditionalClass('border-gray-600', 'border-gray-300')"
                role="button"
                tabindex="0"
                aria-label="上傳文件，可點擊或拖曳檔案至此"
                @click="triggerAttachDocInput"
                @keydown.enter.prevent="triggerAttachDocInput"
                @keydown.space.prevent="triggerAttachDocInput"
                @dragenter.prevent
                @dragover.prevent
                @drop.prevent="onAttachDocsDrop"
                data-testid="news-attachment-documents-dropzone"
              >
                <div
                  v-if="form.attachmentDocuments.length === 0"
                  class="space-y-1 text-center pointer-events-none flex flex-col items-center justify-center h-full"
                >
                  <svg
                    class="mx-auto h-12 w-12"
                    :class="conditionalClass('text-gray-500', 'text-gray-400')"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.5"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                  <div
                    class="flex text-sm justify-center"
                    :class="conditionalClass('text-gray-500', 'text-gray-400')"
                  >
                    <p class="pl-1">點擊或拖曳以上傳文件</p>
                  </div>
                  <p class="text-xs" :class="conditionalClass('text-gray-600', 'text-gray-500')">
                    PDF, DOC, XLS, PPT, TXT
                  </p>
                </div>
                <div v-else class="absolute inset-3 overflow-y-auto space-y-2">
                  <div
                    v-for="(row, idx) in form.attachmentDocuments"
                    :key="row._key"
                    class="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                    :class="conditionalClass('border-gray-600', 'border-gray-300')"
                  >
                    <div class="min-w-0">
                      <a
                        v-if="row.url && !row._newFile"
                        :href="row.url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-sm text-blue-400 hover:underline block truncate"
                        @click.stop
                      >
                        {{ getFileNameFromUrl(row.url) }}
                      </a>
                      <p v-else class="text-sm theme-text truncate">
                        {{ row._newFile?.name || getFileNameFromUrl(row.url) || '文件' }}
                      </p>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        class="bg-red-600/80 text-white text-xs rounded px-1.5 py-0.5"
                        aria-label="刪除"
                        @click.stop="removeAttachmentDoc(idx)"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
                <input
                  ref="attachDocInputRef"
                  id="newsAttachmentDocuments"
                  name="attachmentDocuments"
                  data-testid="news-attachment-documents"
                  type="file"
                  :accept="documentAccept"
                  multiple
                  class="hidden"
                  @change="onAttachDocsSelected"
                />
              </div>
            </div>

            <!-- 影片（固定高度；預覽顯示在框內；嵌入列也在框內） -->
            <div class="mb-6">
              <label class="block mb-3 theme-text">影片 (可上傳多部)</label>
              <div
                class="mt-1 relative px-6 pt-5 pb-6 border-2 border-dashed rounded-[10px] cursor-pointer hover:border-blue-400 transition-colors h-[240px]"
                :class="conditionalClass('border-gray-600', 'border-gray-300')"
                role="button"
                tabindex="0"
                aria-label="上傳影片，可點擊或拖曳檔案至此"
                @click="triggerVideoUploadInput"
                @keydown.enter.prevent="triggerVideoUploadInput"
                @keydown.space.prevent="triggerVideoUploadInput"
                @dragenter.prevent
                @dragover.prevent
                @drop.prevent="onAttachVideosDrop"
                data-testid="news-attachment-videos-dropzone"
              >
                <div
                  v-if="form.attachmentVideos.length === 0"
                  class="space-y-1 text-center pointer-events-none flex flex-col items-center justify-center h-full"
                >
                  <svg
                    class="mx-auto h-12 w-12"
                    :class="conditionalClass('text-gray-500', 'text-gray-400')"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.5"
                      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M15.75 6v12m-3-10.5v9"
                    />
                  </svg>
                  <div
                    class="flex text-sm justify-center"
                    :class="conditionalClass('text-gray-500', 'text-gray-400')"
                  >
                    <p class="pl-1">點擊或拖曳以上傳影片</p>
                  </div>
                  <p class="text-xs" :class="conditionalClass('text-gray-600', 'text-gray-500')">
                    MP4, WEBM, MOV
                  </p>
                </div>
                <div v-else class="absolute inset-3 overflow-y-auto space-y-3">
                  <div
                    v-for="(row, idx) in form.attachmentVideos"
                    :key="row._key"
                    class="rounded-md border p-2"
                    :class="conditionalClass('border-gray-600', 'border-gray-300')"
                  >
                    <div class="flex items-center justify-between gap-2 mb-2">
                      <p class="text-xs theme-text opacity-80">
                        {{ row.source === 'embed' ? '嵌入' : '上傳' }}
                      </p>
                      <div class="flex items-center gap-1">
                        <button
                          type="button"
                          class="bg-red-600/80 text-white text-xs rounded px-1.5 py-0.5"
                          aria-label="刪除"
                          @click.stop="removeAttachmentVideo(idx)"
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    <template v-if="row.source === 'embed'">
                      <input
                        v-model="row.embedUrl"
                        :class="[inputClass]"
                        placeholder="影片嵌入 URL"
                        @click.stop
                        :data-testid="`news-attachment-video-embed-${idx}`"
                      />
                    </template>
                    <template v-else>
                      <video
                        v-if="row._preview || row.url"
                        :src="row._preview || row.url"
                        class="w-full max-h-32 rounded bg-black"
                        controls
                        @click.stop
                      />
                      <button
                        type="button"
                        class="text-xs text-blue-500 mt-2"
                        @click.stop="pickVideoForRow(idx)"
                      >
                        選擇或更換檔案
                      </button>
                    </template>
                  </div>
                </div>
                <input
                  ref="attachVideoInputRef"
                  id="newsAttachmentVideos"
                  name="attachmentVideos"
                  data-testid="news-attachment-videos"
                  type="file"
                  accept="video/*"
                  multiple
                  class="hidden"
                  @change="onAttachVideosSelected"
                />
              </div>
              <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <button type="button" class="text-sm text-blue-500" @click="addEmbedVideoRow">
                  + 新增嵌入影片
                </button>
                <span class="text-xs" :class="conditionalClass('text-gray-500', 'text-gray-500')">
                  YouTube、Vimeo 等公開連結
                </span>
              </div>
            </div>
          </div>
        </div>

        <div
          class="flex justify-end space-x-3 pt-4 border-t"
          :class="conditionalClass('border-gray-700', 'border-gray-200')"
        >
          <div class="flex-1 flex items-center gap-2">
            <button
              type="button"
              class="px-3 py-2 text-sm rounded-md transition-colors"
              :class="
                conditionalClass(
                  'bg-gray-700 hover:bg-gray-600 text-gray-200 disabled:opacity-50',
                  'bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50',
                )
              "
              :disabled="isProcessing || loading || currentTab === 'general'"
              data-testid="news-step-prev"
              @click="goToPrevStep"
            >
              上一步
            </button>
            <button
              type="button"
              class="px-3 py-2 text-sm rounded-md transition-colors"
              :class="
                conditionalClass(
                  'bg-gray-700 hover:bg-gray-600 text-gray-200 disabled:opacity-50',
                  'bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50',
                )
              "
              :disabled="isProcessing || loading || currentTab === 'attachments'"
              data-testid="news-step-next"
              @click="goToNextStep"
            >
              下一步
            </button>
            <button
              type="button"
              class="px-3 py-2 text-sm rounded-md transition-colors"
              :class="
                conditionalClass(
                  'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50',
                  'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50',
                )
              "
              :disabled="isProcessing || loading"
              data-testid="news-save-draft"
              @click="handleSaveDraft"
            >
              儲存草稿
            </button>
          </div>
          <button
            type="button"
            @click="closeModal"
            :disabled="isProcessing"
            class="px-4 py-2 text-sm font-medium rounded-md transition-colors"
            data-testid="news-cancel"
            :class="
              conditionalClass(
                'bg-gray-600 hover:bg-gray-500 text-gray-200',
                'bg-slate-200 hover:bg-slate-300 text-slate-700',
              )
            "
          >
            取消
          </button>
          <button
            type="submit"
            :disabled="isProcessing || loading"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            data-testid="news-final-submit"
          >
            {{ isProcessing ? '處理中…' : isEditing ? '更新新聞' : '新增新聞' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount, defineAsyncComponent } from 'vue'
import { useNewsStore } from '@/stores/newsStore'
import { useThemeClass } from '@/composables/useThemeClass'
import { useFormValidation } from '@/composables/useFormValidation'
import { useUserStore } from '@/stores/userStore'
import { useApi } from '@/composables/axios'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import LanguageSwitcher from '@/components/common/languageSwitcher.vue'

const RichTextBlockEditor = defineAsyncComponent(
  () => import('@/components/common/RichTextBlockEditor.vue'),
)

const NEWS_NEW_FILE_MARKER = '__NEWS_NEW_FILE__'

const props = defineProps({
  show: { type: Boolean, default: false },
  newsItem: { type: Object, default: null },
  allNews: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:show', 'saved'])

const newsStore = useNewsStore()
const userStore = useUserStore()
const { cardClass, inputClass: themeInputClass, conditionalClass } = useThemeClass()
const { errors: validationErrors, clearErrors, setError } = useFormValidation()

const isAdmin = computed(() => userStore.isAdmin)
const isEditing = computed(() => !!props.newsItem?._id)

const inputClass = computed(() => [
  themeInputClass.value,
  'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
])

const newsCategoriesTW = ref([])
const newsCategoryEnMap = {
  智慧方案: 'Smart Solutions',
  產品介紹: 'Product Introduction',
  品牌新聞: 'Brand News',
}

const loading = ref(false)
const formError = ref('')
const isProcessing = ref(false)
const currentTab = ref('general')
const tabs = [
  { name: 'general', label: '基本資訊' },
  { name: 'mainContent', label: '主要內容' },
  { name: 'attachments', label: '附加檔案' },
]

const titleLanguage = ref('TW')
const summaryLanguage = ref('TW')
const articleLanguage = ref('TW')
const relatedNewsFilterCategory = ref(null)

const coverInputRef = ref(null)
const attachImageInputRef = ref(null)
const attachVideoInputRef = ref(null)
const attachDocInputRef = ref(null)
const imageFile = ref(null)
const imagePreview = ref(null)
const videoRowPickingIndex = ref(null)

let rowKey = 0
const nextKey = () => `k-${++rowKey}`

const emptyDoc = () => ({ type: 'doc', content: [{ type: 'paragraph' }] })

const initialFormState = () => ({
  _id: null,
  title: { TW: '', EN: '' },
  summary: { TW: '', EN: '' },
  article: { TW: emptyDoc(), EN: emptyDoc() },
  category: { main: { TW: '', EN: '' } },
  attachmentImages: [],
  attachmentVideos: [],
  attachmentDocuments: [],
  author: '',
  coverImageUrl: null,
  publishDate: formatDateForInput(new Date()),
  isActive: false,
  relatedNews: [],
})

const form = ref(initialFormState())

const chipClass = (on) => [
  on
    ? 'bg-blue-500 text-white'
    : conditionalClass('bg-gray-700 text-gray-300', 'bg-gray-200 text-gray-700'),
  'px-3 py-1.5 text-xs rounded-md',
]

const stepLabelMap = {
  general: '基本資訊',
  mainContent: '主要內容',
  attachments: '附加檔案',
}

const fieldLabelMap = {
  author: '作者',
  'category.main.TW': '主分類',
  publishDate: '發布日期',
  'title.TW': '標題 (TW)',
  'title.EN': '標題 (EN)',
  'summary.TW': '摘要 (TW)',
  'summary.EN': '摘要 (EN)',
  article: '主要內容',
  coverImageUrl: '封面圖片',
}

const stepErrors = ref([])

const stepErrorGroups = computed(() => {
  if (!Array.isArray(stepErrors.value) || stepErrors.value.length === 0) return []
  const groups = []
  for (const step of ['general', 'mainContent', 'attachments']) {
    const errors = stepErrors.value.filter((e) => e.step === step)
    if (!errors.length) continue
    groups.push({
      step,
      stepLabel: stepLabelMap[step] || step,
      errors: errors.map((e) => ({
        field: e.field,
        fieldLabel: fieldLabelMap[e.field] || e.field,
        message: e.message,
      })),
    })
  }
  return groups
})

const filteredAllNews = computed(() => {
  if (!props.allNews?.length) return []
  let list = props.allNews.filter((n) => n._id !== form.value._id && n?.isActive)
  if (relatedNewsFilterCategory.value) {
    list = list.filter((n) => newsMainTw(n) === relatedNewsFilterCategory.value)
  }
  return list
})

function newsMainTw(news) {
  const c = news.category
  if (c && typeof c === 'object' && c.main) {
    return typeof c.main === 'object' ? c.main.TW : c.main
  }
  return typeof c === 'string' ? c : ''
}

watch(
  () => form.value.category.main.TW,
  (tw) => {
    if (!form.value.category.main) form.value.category.main = { TW: '', EN: '' }
    form.value.category.main.EN = tw ? newsCategoryEnMap[tw] || '' : ''
  },
)

const isTiptapEmpty = (doc) => {
  if (!doc?.content?.length) return true
  return doc.content.length === 1 && doc.content[0].type === 'paragraph' && !doc.content[0].content
}

const triggerCoverInput = () => coverInputRef.value?.click()
const handleCoverChange = (e) => {
  const file = e.target.files?.[0]
  if (!file?.type?.startsWith('image/')) {
    e.target.value = ''
    return
  }
  imageFile.value = file
  if (imagePreview.value?.startsWith('blob:')) URL.revokeObjectURL(imagePreview.value)
  imagePreview.value = URL.createObjectURL(file)
  form.value.coverImageUrl = '__NEW_COVER__'
  e.target.value = ''
}

const onCoverDrop = (e) => {
  const file = e.dataTransfer?.files?.[0]
  if (!file?.type?.startsWith('image/')) return
  imageFile.value = file
  if (imagePreview.value?.startsWith('blob:')) URL.revokeObjectURL(imagePreview.value)
  imagePreview.value = URL.createObjectURL(file)
  form.value.coverImageUrl = '__NEW_COVER__'
}

const removeCover = () => {
  if (imagePreview.value?.startsWith('blob:')) URL.revokeObjectURL(imagePreview.value)
  imageFile.value = null
  imagePreview.value = null
  form.value.coverImageUrl = null
}

const documentAccept =
  '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain'

const isAllowedDocumentFile = (file) => {
  const name = (file?.name || '').toLowerCase()
  const type = (file?.type || '').toLowerCase()

  if (type) {
    return [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
    ].includes(type)
  }

  return ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'].some((ext) =>
    name.endsWith(ext),
  )
}

const getFileNameFromUrl = (url) => {
  if (!url || typeof url !== 'string') return ''
  try {
    const decodedUrl = decodeURIComponent(url)
    return decodedUrl.substring(decodedUrl.lastIndexOf('/') + 1)
  } catch {
    return url.substring(url.lastIndexOf('/') + 1)
  }
}

const addNewsImageFiles = (fileList) => {
  for (const file of fileList) {
    if (!file?.type?.startsWith('image/')) continue
    form.value.attachmentImages.push({
      _key: nextKey(),
      url: NEWS_NEW_FILE_MARKER,
      _newFile: file,
      _preview: URL.createObjectURL(file),
    })
  }
}

const triggerAttachImageInput = () => attachImageInputRef.value?.click()
const onAttachImagesSelected = (e) => {
  addNewsImageFiles([...(e.target.files || [])])
  e.target.value = ''
}
const onAttachImagesDrop = (e) => {
  addNewsImageFiles([...(e.dataTransfer?.files || [])])
}

const removeAttachmentImage = (idx) => {
  const row = form.value.attachmentImages[idx]
  if (row._preview?.startsWith('blob:')) URL.revokeObjectURL(row._preview)
  form.value.attachmentImages.splice(idx, 1)
}

const addEmbedVideoRow = () => {
  form.value.attachmentVideos.push({
    _key: nextKey(),
    source: 'embed',
    url: '',
    embedUrl: '',
    _newFile: null,
    _preview: null,
  })
}

const pickVideoForRow = (idx) => {
  videoRowPickingIndex.value = idx
  attachVideoInputRef.value?.click()
}

const addNewsVideoUploadRows = (fileList) => {
  for (const file of fileList) {
    if (!file?.type?.startsWith('video/')) continue
    form.value.attachmentVideos.push({
      _key: nextKey(),
      source: 'upload',
      url: NEWS_NEW_FILE_MARKER,
      embedUrl: '',
      _newFile: file,
      _preview: URL.createObjectURL(file),
    })
  }
}

const triggerVideoUploadInput = () => {
  videoRowPickingIndex.value = null
  attachVideoInputRef.value?.click()
}

const onAttachVideosSelected = (e) => {
  const files = [...(e.target.files || [])]
  const idx = videoRowPickingIndex.value
  if (idx != null && files.length) {
    const file = files[0]
    const row = form.value.attachmentVideos[idx]
    if (row.source !== 'upload') {
      videoRowPickingIndex.value = null
      e.target.value = ''
      return
    }
    if (row._preview?.startsWith('blob:')) URL.revokeObjectURL(row._preview)
    row._newFile = file
    row.url = NEWS_NEW_FILE_MARKER
    row._preview = URL.createObjectURL(file)
  } else {
    addNewsVideoUploadRows(files)
  }
  videoRowPickingIndex.value = null
  e.target.value = ''
}

const onAttachVideosDrop = (e) => {
  videoRowPickingIndex.value = null
  addNewsVideoUploadRows([...(e.dataTransfer?.files || [])])
}

const removeAttachmentVideo = (idx) => {
  const row = form.value.attachmentVideos[idx]
  if (row._preview?.startsWith('blob:')) URL.revokeObjectURL(row._preview)
  form.value.attachmentVideos.splice(idx, 1)
}

const addNewsDocFiles = (fileList) => {
  for (const file of fileList) {
    if (!isAllowedDocumentFile(file)) continue
    form.value.attachmentDocuments.push({
      _key: nextKey(),
      url: NEWS_NEW_FILE_MARKER,
      _newFile: file,
    })
  }
}

const triggerAttachDocInput = () => attachDocInputRef.value?.click()
const onAttachDocsSelected = (e) => {
  addNewsDocFiles([...(e.target.files || [])])
  e.target.value = ''
}
const onAttachDocsDrop = (e) => {
  addNewsDocFiles([...(e.dataTransfer?.files || [])])
}

const removeAttachmentDoc = (idx) => {
  form.value.attachmentDocuments.splice(idx, 1)
}

const validateForm = () => {
  clearErrors()
  const errors = []
  const pushError = (step, field, message) => {
    errors.push({ step, field, message })
    setError(field, message)
  }

  const twIsEmpty = (v) => !v || !String(v).trim()

  if (!form.value.author?.trim()) {
    pushError('general', 'author', '作者為必填')
  }
  if (!form.value.category.main?.TW) {
    pushError('general', 'category.main.TW', '主分類為必填')
  }
  if (twIsEmpty(form.value.title.TW)) {
    pushError('general', 'title.TW', '繁體標題為必填')
  }
  if (twIsEmpty(form.value.title.EN)) {
    pushError('general', 'title.EN', '英文標題為必填')
  }
  if (twIsEmpty(form.value.summary.TW)) {
    pushError('general', 'summary.TW', '摘要 (TW) 為必填')
  }
  if (twIsEmpty(form.value.summary.EN)) {
    pushError('general', 'summary.EN', '摘要 (EN) 為必填')
  }
  if (!form.value.publishDate) {
    pushError('general', 'publishDate', '發布日期為必填')
  } else if (isNaN(new Date(form.value.publishDate).getTime())) {
    pushError('general', 'publishDate', '日期無效')
  }

  const twEmpty = isTiptapEmpty(form.value.article.TW)
  const enEmpty = isTiptapEmpty(form.value.article.EN)
  if (twEmpty && enEmpty) {
    pushError('mainContent', 'article', '主要內容至少填寫一種語言')
  }
  if (!form.value.coverImageUrl) {
    pushError('general', 'coverImageUrl', '請上傳封面')
  }

  form.value.attachmentImages.forEach((row, i) => {
    if (row.url === NEWS_NEW_FILE_MARKER && !row._newFile) {
      pushError('attachments', `attach_img_${i}`, '圖片檔案缺失')
    }
  })
  form.value.attachmentVideos.forEach((row, i) => {
    if (row.source === 'embed' && !row.embedUrl?.trim()) {
      pushError('attachments', `attach_vid_${i}`, '請填嵌入網址')
    }
    if (
      row.source === 'upload' &&
      (!row.url || row.url === NEWS_NEW_FILE_MARKER) &&
      !row._newFile
    ) {
      pushError('attachments', `attach_vid_${i}`, '請選擇影片檔')
    }
  })
  form.value.attachmentDocuments.forEach((row, i) => {
    if (row.url === NEWS_NEW_FILE_MARKER && !row._newFile) {
      pushError('attachments', `attach_doc_${i}`, '請選擇文件')
    }
  })

  stepErrors.value = errors
  if (!errors.length) return true

  const firstStep = errors[0].step || 'general'
  currentTab.value = firstStep
  return false
}

const goToPrevStep = () => {
  const order = ['general', 'mainContent', 'attachments']
  const idx = order.indexOf(currentTab.value)
  if (idx <= 0) return
  currentTab.value = order[idx - 1]
}

const goToNextStep = () => {
  const order = ['general', 'mainContent', 'attachments']
  const idx = order.indexOf(currentTab.value)
  if (idx < 0 || idx >= order.length - 1) return
  currentTab.value = order[idx + 1]
}

const handleSaveDraft = async () => {
  // 草稿：允許不通過完整驗證，但仍會走同一份 payload；強制 isActive=false
  isProcessing.value = true
  stepErrors.value = []
  formError.value = ''

  const newsDataPayload = buildPayload()
  newsDataPayload.isActive = false
  if (isEditing.value && form.value._id) {
    newsDataPayload._id = form.value._id
  }

  const hasFiles =
    !!imageFile.value ||
    form.value.attachmentImages.some((r) => r._newFile) ||
    form.value.attachmentVideos.some((r) => r._newFile) ||
    form.value.attachmentDocuments.some((r) => r._newFile)

  let submissionPayload
  if (hasFiles) {
    const fd = new FormData()
    fd.append('newsDataPayload', JSON.stringify(newsDataPayload))
    if (imageFile.value) fd.append('coverImage', imageFile.value)
    form.value.attachmentImages.forEach((r) => {
      if (r._newFile) fd.append('newsImages', r._newFile)
    })
    form.value.attachmentVideos.forEach((r) => {
      if (r.source === 'upload' && r._newFile) fd.append('newsVideos', r._newFile)
    })
    form.value.attachmentDocuments.forEach((r) => {
      if (r._newFile) fd.append('newsDocuments', r._newFile)
    })
    submissionPayload = fd
  } else {
    submissionPayload = newsDataPayload
  }

  try {
    let result
    if (isEditing.value) {
      result = await newsStore.update(form.value._id, submissionPayload)
    } else {
      result = await newsStore.create(submissionPayload)
    }
    if (newsStore.error) {
      throw new Error(
        newsStore.error.response?.data?.message || newsStore.error.message || '操作失敗',
      )
    }
    emit('saved', {
      news: result || { _id: form.value._id, ...newsDataPayload },
      isNew: !isEditing.value,
    })
    closeModal()
  } catch (e) {
    formError.value = e.message || '操作失敗'
  } finally {
    isProcessing.value = false
  }
}

const buildPayload = () => {
  const attachmentImages = form.value.attachmentImages.map((r) => ({
    ...(r._id ? { _id: r._id } : {}),
    url: r._newFile ? NEWS_NEW_FILE_MARKER : r.url,
  }))

  const attachmentVideos = form.value.attachmentVideos.map((r) => {
    if (r.source === 'embed') {
      return {
        ...(r._id ? { _id: r._id } : {}),
        source: 'embed',
        embedUrl: r.embedUrl || '',
        url: '',
      }
    }
    return {
      ...(r._id ? { _id: r._id } : {}),
      source: 'upload',
      url: r._newFile ? NEWS_NEW_FILE_MARKER : r.url || '',
      embedUrl: '',
    }
  })

  const attachmentDocuments = form.value.attachmentDocuments.map((r) => ({
    ...(r._id ? { _id: r._id } : {}),
    url: r._newFile ? NEWS_NEW_FILE_MARKER : r.url,
  }))

  return {
    title: form.value.title,
    summary: { ...form.value.summary },
    article: JSON.parse(JSON.stringify(form.value.article)),
    category: JSON.parse(JSON.stringify(form.value.category)),
    attachmentImages,
    attachmentVideos,
    attachmentDocuments,
    author: form.value.author,
    coverImageUrl: form.value.coverImageUrl,
    publishDate: form.value.publishDate ? new Date(form.value.publishDate).toISOString() : null,
    isActive: form.value.isActive,
    relatedNews: form.value.relatedNews,
  }
}

const submitForm = async () => {
  if (!validateForm()) return
  isProcessing.value = true
  formError.value = ''

  const newsDataPayload = buildPayload()
  if (isEditing.value && form.value._id) {
    newsDataPayload._id = form.value._id
  }

  const hasFiles =
    !!imageFile.value ||
    form.value.attachmentImages.some((r) => r._newFile) ||
    form.value.attachmentVideos.some((r) => r._newFile) ||
    form.value.attachmentDocuments.some((r) => r._newFile)

  let submissionPayload
  if (hasFiles) {
    const fd = new FormData()
    fd.append('newsDataPayload', JSON.stringify(newsDataPayload))
    if (imageFile.value) fd.append('coverImage', imageFile.value)
    form.value.attachmentImages.forEach((r) => {
      if (r._newFile) fd.append('newsImages', r._newFile)
    })
    form.value.attachmentVideos.forEach((r) => {
      if (r.source === 'upload' && r._newFile) fd.append('newsVideos', r._newFile)
    })
    form.value.attachmentDocuments.forEach((r) => {
      if (r._newFile) fd.append('newsDocuments', r._newFile)
    })
    submissionPayload = fd
  } else {
    submissionPayload = newsDataPayload
  }

  try {
    let result
    if (isEditing.value) {
      result = await newsStore.update(form.value._id, submissionPayload)
    } else {
      result = await newsStore.create(submissionPayload)
    }
    if (newsStore.error) {
      throw new Error(
        newsStore.error.response?.data?.message || newsStore.error.message || '操作失敗',
      )
    }
    emit('saved', {
      news: result || { _id: form.value._id, ...newsDataPayload },
      isNew: !isEditing.value,
    })
    closeModal()
  } catch (e) {
    formError.value = e.message || '操作失敗'
  } finally {
    isProcessing.value = false
  }
}

const closeModal = () => {
  if (isProcessing.value) return
  releaseBlobs()
  emit('update:show', false)
}

const releaseBlobs = () => {
  if (imagePreview.value?.startsWith('blob:')) URL.revokeObjectURL(imagePreview.value)
  form.value.attachmentImages.forEach((r) => {
    if (r._preview?.startsWith('blob:')) URL.revokeObjectURL(r._preview)
  })
  form.value.attachmentVideos.forEach((r) => {
    if (r._preview?.startsWith('blob:')) URL.revokeObjectURL(r._preview)
  })
}

function formatDateForInput(dateStringOrDate) {
  if (!dateStringOrDate) return ''
  try {
    const date = new Date(dateStringOrDate)
    const y = date.getFullYear()
    const m = ('0' + (date.getMonth() + 1)).slice(-2)
    const d = ('0' + date.getDate()).slice(-2)
    return `${y}-${m}-${d}`
  } catch {
    return ''
  }
}

function normalizeCategoryFromItem(category) {
  if (category && typeof category === 'object' && category.main) {
    return {
      main: {
        TW: category.main.TW || '',
        EN: category.main.EN || newsCategoryEnMap[category.main.TW] || '',
      },
    }
  }
  if (typeof category === 'string' && category) {
    return {
      main: { TW: category, EN: newsCategoryEnMap[category] || '' },
    }
  }
  return { main: { TW: '', EN: '' } }
}

const resetAndInitializeForm = async () => {
  loading.value = true
  formError.value = ''
  clearErrors()
  releaseBlobs()
  form.value = initialFormState()
  imageFile.value = null
  imagePreview.value = null
  titleLanguage.value = 'TW'
  summaryLanguage.value = 'TW'
  currentTab.value = 'general'
  relatedNewsFilterCategory.value = null

  if (props.newsItem?._id) {
    const item = props.newsItem
    form.value._id = item._id
    form.value.title = { TW: item.title?.TW || '', EN: item.title?.EN || '' }
    form.value.summary = { TW: item.summary?.TW || '', EN: item.summary?.EN || '' }
    form.value.author = item.author || ''
    form.value.category = normalizeCategoryFromItem(item.category)
    form.value.coverImageUrl = item.coverImageUrl || null
    form.value.publishDate = formatDateForInput(item.publishDate)
    form.value.isActive = !!item.isActive
    form.value.relatedNews = item.relatedNews?.map((n) => n._id || n) || []
    form.value.article = {
      TW: item.article?.TW || emptyDoc(),
      EN: item.article?.EN || emptyDoc(),
    }
    form.value.attachmentImages = (item.attachmentImages || []).map((r) => ({
      _key: nextKey(),
      _id: r._id,
      url: r.url,
    }))
    form.value.attachmentVideos = (item.attachmentVideos || []).map((r) => ({
      _key: nextKey(),
      _id: r._id,
      source: r.source || 'upload',
      url: r.url || '',
      embedUrl: r.embedUrl || '',
    }))
    form.value.attachmentDocuments = (item.attachmentDocuments || []).map((r) => ({
      _key: nextKey(),
      _id: r._id,
      url: r.url,
    }))
    if (form.value.coverImageUrl) imagePreview.value = form.value.coverImageUrl
  }
  loading.value = false
}

watch(
  () => props.show,
  (v) => {
    if (v) resetAndInitializeForm()
    else releaseBlobs()
  },
  { immediate: true },
)

onBeforeUnmount(() => releaseBlobs())
;(async () => {
  try {
    const { entityApi } = useApi()
    const api = entityApi('news', { responseKey: 'news' })
    newsCategoriesTW.value = await api.getCategories()
  } catch (e) {
    console.warn('載入新聞分類失敗', e?.message || e)
    newsCategoriesTW.value = Object.keys(newsCategoryEnMap)
  }
})()
</script>

<style>
.tiptap-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  padding: 0.5rem;
  border-bottom: 1px solid;
  gap: 0.5rem;
}
.toolbar-button {
  padding: 0.25rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s;
}
.toolbar-button:hover:not(.is-active) {
  background-color: rgba(128, 128, 128, 0.1);
}
.toolbar-button.is-active {
  background-color: #3b82f6;
  color: white;
}
html.dark .toolbar-button.is-active {
  background-color: #60a5fa;
  color: #1f2937;
}
.toolbar-button.remark-button.is-active {
  background-color: #a855f7;
}
html.dark .toolbar-button.remark-button.is-active {
  background-color: #c084fc;
}
.toolbar-color-input {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0;
  width: 2rem;
  height: 2rem;
  cursor: pointer;
}
.toolbar-divider {
  width: 1px;
  height: 1.25rem;
  background-color: #ccc;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
}
html.dark .toolbar-divider {
  background-color: #555;
}
.tiptap-editor-wrapper .prose {
  max-width: none;
  padding: 0.5rem;
}
.tiptap-editor-wrapper .prose,
.tiptap-editor-wrapper .prose p,
.tiptap-editor-wrapper .prose h1,
.tiptap-editor-wrapper .prose h2,
.tiptap-editor-wrapper .prose h3,
.tiptap-editor-wrapper .prose h4,
.tiptap-editor-wrapper .prose h5,
.tiptap-editor-wrapper .prose h6,
.tiptap-editor-wrapper .prose strong,
.tiptap-editor-wrapper .prose em {
  color: inherit;
}
.tiptap-editor-wrapper .prose [data-purpose='remark'] {
  font-size: 0.9em;
  opacity: 0.85;
  border-left: 3px solid;
  padding-left: 0.75em;
  margin-top: 0.8em;
  margin-bottom: 0.8em;
}
html:not(.dark) .tiptap-editor-wrapper .prose [data-purpose='remark'] {
  border-left-color: #a855f7;
}
html.dark .tiptap-editor-wrapper .prose [data-purpose='remark'] {
  border-left-color: #c084fc;
}
</style>
