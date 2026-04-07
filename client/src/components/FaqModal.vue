<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
    <div
      :class="[
        cardClass,
        'w-full max-w-3xl rounded-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto relative',
      ]"
      data-testid="faq-modal"
    >
      <button
        @click="closeModal"
        class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        title="關閉"
        data-testid="faq-modal-close"
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
        {{ isEditing ? '編輯常見問題' : '新增常見問題' }}
      </h2>

      <!-- 載入過渡（防止閃爍） -->
      <LoadingSpinner v-if="loading" container-class="text-center py-8" />

      <form
        v-else
        @submit.prevent="submitForm"
        class="space-y-[12px] lg:space-y-[24px]"
        data-testid="faq-form"
      >
        <!-- 頁籤導航 -->
        <div class="border-b" :class="conditionalClass('border-gray-700', 'border-gray-200')">
          <nav class="flex space-x-8" aria-label="表單步驟" role="tablist" data-testid="faq-step-tabs">
            <button
              v-for="tab in tabs"
              :key="tab.name"
              type="button"
              @click="currentTab = tab.name"
              role="tab"
              :aria-selected="currentTab === tab.name"
              :data-step="tab.name"
              :data-testid="`faq-step-tab-${tab.name}`"
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

        <div v-if="stepErrorGroups.length" class="space-y-2" data-testid="faq-validation-summary">
          <div class="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded-md">
            <p class="font-medium">請修正下列欄位後再送出</p>
            <div class="mt-2 space-y-2">
              <div v-for="group in stepErrorGroups" :key="group.step">
                <button
                  type="button"
                  class="text-sm underline underline-offset-2"
                  :data-testid="`faq-validation-jump-${group.step}`"
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
          data-testid="faq-form-error"
        >
          {{ formError }}
        </div>

        <!-- 頁籤內容 -->
        <div class="space-y-[12px] lg:space-y-[24px] overflow-y-auto flex-grow min-h-[400px]">
          <!-- 基本資料 -->
          <div v-show="currentTab === 'general'" data-testid="faq-step-general" data-step="general">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Author & IsActive -->
              <div>
                <label for="faqAuthor" class="block mb-3 theme-text">作者 *</label>
                <input
                  id="faqAuthor"
                  name="author"
                  data-testid="faq-author"
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
                <label for="faqIsActiveSelect" class="block mb-3 theme-text">發布狀態 *</label>
                <div v-if="isAdmin">
                  <select
                    id="faqIsActiveSelect"
                    name="publishStatus"
                    data-testid="faq-publish-status"
                    v-model="form.isActive"
                    :class="[inputClass]"
                  >
                    <option :value="false" class="text-black/70">待審查</option>
                    <option :value="true" class="text-black/70">已發布</option>
                  </select>
                </div>
                <div v-else-if="isEditing && !isAdmin">
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
              <!-- Category (Bilingual) -->
              <div>
                <label for="faqCategoryMainTW" class="block mb-3 theme-text">主分類 *</label>
                <select
                  id="faqCategoryMainTW"
                  name="mainCategory"
                  data-testid="faq-main-category"
                  v-model="form.category.main.TW"
                  :class="[
                    inputClass,
                    validationErrors['category.main.TW'] ? 'border-red-500' : '',
                  ]"
                >
                  <option value="" disabled class="text-black/70">請選擇主分類 (TW)</option>
                  <option
                    v-for="cat in faqCategoriesTW"
                    :key="`tw-${cat}`"
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
              <!-- 英文分類自動對應，不顯示於表單 -->

              <!-- 子分類 (可選，雙語，使用切換) -->
              <div class="space-y-2">
                <div class="flex justify-between items-center mb-2">
                  <label class="block theme-text">子分類</label>
                  <LanguageSwitcher
                    v-model="subLanguage"
                    :show-label="false"
                    data-test-id="faq-subcategory-lang"
                    aria-label="子分類語言切換"
                  />
                </div>
                <div v-show="subLanguage === 'TW'">
                  <input
                    id="faqCategorySubTW"
                    name="category.sub.tw"
                    data-testid="faq-subcategory-tw"
                    v-model="form.category.sub.TW"
                    type="text"
                    :class="[inputClass]"
                    placeholder="例如：安裝、設定"
                  />
                </div>
                <div v-show="subLanguage === 'EN'">
                  <input
                    id="faqCategorySubEN"
                    name="category.sub.en"
                    data-testid="faq-subcategory-en"
                    v-model="form.category.sub.EN"
                    type="text"
                    :class="[inputClass]"
                    placeholder="e.g., Installation, Setup"
                  />
                </div>
              </div>

              <!-- Publish Date -->
              <div>
                <label for="publishDate" class="block mb-3 theme-text">發布日期 *</label>
                <input
                  type="date"
                  id="publishDate"
                  name="publishDate"
                  data-testid="faq-publish-date"
                  v-model="form.publishDate"
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

              <!-- Product Model -->
              <div>
                <label for="faqProductModel" class="block mb-3 theme-text opacity-80"
                  >產品型號</label
                >
                <input
                  id="faqProductModel"
                  name="productModel"
                  data-testid="faq-product-model"
                  v-model="form.productModel"
                  type="text"
                  :class="[inputClass]"
                  placeholder="例如: XYZ-123"
                />
              </div>
            </div>
            <!-- 問題 -->
            <div class="space-y-3 mt-4">
              <div class="flex justify-between items-center mb-2">
                <label class="block theme-text">問題 *</label>
                <LanguageSwitcher
                  v-model="questionLanguage"
                  :show-label="false"
                  data-test-id="faq-question-lang"
                  aria-label="問題語言切換"
                />
              </div>
              <div v-show="questionLanguage === 'TW'">
                <textarea
                  id="faqQuestionTW"
                  name="question.tw"
                  data-testid="faq-question-tw"
                  v-model="form.question.TW"
                  rows="6"
                  :class="[inputClass, validationErrors['question.TW'] ? 'border-red-500' : '']"
                  placeholder="請輸入問題 (繁體中文)"
                ></textarea>
                <p v-if="validationErrors['question.TW']" class="text-red-500 text-xs mt-1">
                  {{ validationErrors['question.TW'] }}
                </p>
              </div>
              <div v-show="questionLanguage === 'EN'">
                <textarea
                  id="faqQuestionEN"
                  name="question.en"
                  data-testid="faq-question-en"
                  v-model="form.question.EN"
                  rows="6"
                  :class="[inputClass, validationErrors['question.EN'] ? 'border-red-500' : '']"
                  placeholder="請輸入問題 (English) - 用於產生路由"
                ></textarea>
                <p v-if="validationErrors['question.EN']" class="text-red-500 text-xs mt-1">
                  {{ validationErrors['question.EN'] }}
                </p>
              </div>
            </div>

            <!-- 摘要 -->
            <div class="space-y-3 mt-4">
              <div class="flex justify-between items-center mb-2">
                <label class="block theme-text">摘要 *</label>
                <LanguageSwitcher
                  v-model="summaryLanguage"
                  :show-label="false"
                  data-test-id="faq-summary-lang"
                  aria-label="摘要語言切換"
                />
              </div>
              <div v-show="summaryLanguage === 'TW'">
                <textarea
                  id="faqSummaryTW"
                  name="summary.tw"
                  data-testid="faq-summary-tw"
                  v-model="form.summary.TW"
                  rows="6"
                  :class="[inputClass, validationErrors['summary.TW'] ? 'border-red-500' : '']"
                  placeholder="請輸入摘要 (繁體中文)"
                ></textarea>
                <p v-if="validationErrors['summary.TW']" class="text-red-500 text-xs mt-1">
                  {{ validationErrors['summary.TW'] }}
                </p>
              </div>
              <div v-show="summaryLanguage === 'EN'">
                <textarea
                  id="faqSummaryEN"
                  name="summary.en"
                  data-testid="faq-summary-en"
                  v-model="form.summary.EN"
                  rows="6"
                  :class="[inputClass, validationErrors['summary.EN'] ? 'border-red-500' : '']"
                  placeholder="請輸入摘要 (English)"
                ></textarea>
                <p v-if="validationErrors['summary.EN']" class="text-red-500 text-xs mt-1">
                  {{ validationErrors['summary.EN'] }}
                </p>
              </div>
            </div>

            <!-- 關聯內容 -->
            <div class="space-y-3 mt-4">
              <div class="flex justify-between items-center mb-2">
                <label class="block theme-text">相關問題</label>
                <div class="flex items-center space-x-2">
                  <button
                    type="button"
                    @click="relatedFaqFilterCategory = null"
                    :class="[
                      !relatedFaqFilterCategory
                        ? 'bg-blue-500 text-white'
                        : conditionalClass(
                            'bg-gray-700 text-gray-300',
                            'bg-gray-200 text-gray-700',
                          ),
                      'px-3 py-1.5 text-xs rounded-md transition-colors',
                    ]"
                  >
                    全部分類
                  </button>
                  <button
                    v-for="cat in faqCategoriesTW"
                    :key="cat"
                    type="button"
                    @click="relatedFaqFilterCategory = cat"
                    :class="[
                      relatedFaqFilterCategory === cat
                        ? 'bg-blue-500 text-white'
                        : conditionalClass(
                            'bg-gray-700 text-gray-300',
                            'bg-gray-200 text-gray-700',
                          ),
                      'px-3 py-1.5 text-xs rounded-md transition-colors',
                    ]"
                  >
                    {{ cat }}
                  </button>
                </div>
              </div>
              <div
                class="max-h-48 overflow-y-auto rounded-md border p-3"
                :class="conditionalClass('border-gray-600', 'border-gray-300')"
                data-testid="faq-related-faqs"
              >
                <div v-if="filteredAllFaqs.length === 0" class="text-sm text-gray-500">
                  沒有其他問題可供關聯
                </div>
                <div
                  v-for="faq in filteredAllFaqs"
                  :key="faq._id"
                  class="flex items-center space-x-3 py-2"
                >
                  <input
                    :id="`faq-${faq._id}`"
                    type="checkbox"
                    :value="faq._id"
                    v-model="form.relatedFaqs"
                    name="relatedFaqs"
                    data-testid="faq-related-faq-item"
                    class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label :for="`faq-${faq._id}`" class="theme-text text-sm cursor-pointer">
                    {{ faq.question.TW }}
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- 主要內容 -->
          <div v-show="currentTab === 'mainContent'" data-testid="faq-step-mainContent" data-step="mainContent">
            <!-- 答案 -->
            <div class="space-y-3">
              <label class="block theme-text">答案 *</label>
              <RichTextBlockEditor
                :modelValue="form.answer"
                @update:modelValue="form.answer = $event"
                :initial-language="answerLanguage"
                data-test-id="faq-answer-editor"
                field-base="answer"
              />
              <p v-if="validationErrors.answer" class="text-red-500 text-xs mt-1">
                {{ validationErrors.answer }}
              </p>
            </div>
          </div>

          <!-- 附加檔案 -->
          <div v-show="currentTab === 'attachments'" data-testid="faq-step-attachments" data-step="attachments">
            <!-- 圖片上傳 -->
            <div class="mb-6">
              <label class="block mb-3 theme-text">圖片 (可上傳多張)</label>
              <div
                class="mt-1 relative px-6 pt-5 pb-6 border-2 border-dashed rounded-[10px] cursor-pointer hover:border-blue-400 h-[220px]"
                :class="conditionalClass('border-gray-600', 'border-gray-300')"
                role="button"
                tabindex="0"
                aria-label="上傳圖片，可點擊或拖曳檔案至此"
                @click="triggerImageInput"
                @keydown.enter.prevent="triggerImageInput"
                @keydown.space.prevent="triggerImageInput"
                @dragenter.prevent
                @dragover.prevent
                @drop.prevent="handleImageDrop"
                data-testid="faq-attachment-images-dropzone"
              >
                <div
                  v-if="form.imageUrl.length === 0 && imageFiles.length === 0"
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
                    class="flex text-sm"
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
                      v-for="(url, index) in form.imageUrl"
                      :key="`existing-${index}`"
                      class="relative rounded-md overflow-hidden border"
                      :class="conditionalClass('border-gray-600', 'border-gray-300')"
                    >
                      <img :src="url" alt="Existing image" class="w-full h-24 object-cover" />
                      <button
                        type="button"
                        @click.stop="removeExistingImage(index)"
                        class="absolute top-1 right-1 bg-red-600/80 text-white rounded px-1.5 py-0.5 text-xs"
                        aria-label="刪除"
                      >
                        ×
                      </button>
                    </div>
                    <div
                      v-for="(file, index) in imageFiles"
                      :key="`new-${index}`"
                      class="relative rounded-md overflow-hidden border"
                      :class="conditionalClass('border-gray-600', 'border-gray-300')"
                    >
                      <img
                        :src="file.previewUrl"
                        alt="New image"
                        class="w-full h-24 object-cover"
                      />
                      <button
                        type="button"
                        @click.stop="removeNewImage(index)"
                        class="absolute top-1 right-1 bg-red-600/80 text-white rounded px-1.5 py-0.5 text-xs"
                        aria-label="刪除"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
                <input
                  ref="imageInputRef"
                  id="faqAttachmentImages"
                  name="attachmentImages"
                  data-testid="faq-attachment-images"
                  type="file"
                  accept="image/*"
                  multiple
                  class="hidden"
                  @change="handleImageFiles"
                />
              </div>
            </div>

            <!-- 文件上傳 -->
            <div class="mb-6">
              <label class="block mb-3 theme-text">文件 (可上傳多個)</label>
              <div
                class="mt-1 relative px-6 pt-5 pb-6 border-2 border-dashed rounded-[10px] cursor-pointer hover:border-blue-400 h-[200px]"
                :class="conditionalClass('border-gray-600', 'border-gray-300')"
                role="button"
                tabindex="0"
                aria-label="上傳文件，可點擊或拖曳檔案至此"
                @click="triggerDocumentInput"
                @keydown.enter.prevent="triggerDocumentInput"
                @keydown.space.prevent="triggerDocumentInput"
                @dragenter.prevent
                @dragover.prevent
                @drop.prevent="handleDocumentDrop"
                data-testid="faq-attachment-documents-dropzone"
              >
                <div
                  v-if="form.documentUrl.length === 0 && documentFiles.length === 0"
                  class="space-y-1 text-center pointer-events-none flex flex-col items-center justify-center h-full"
                >
                  <!-- Icon for document -->
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
                    class="flex text-sm"
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
                    v-for="(url, index) in form.documentUrl"
                    :key="`existing-doc-${index}`"
                    class="flex items-center justify-between gap-2 p-2 rounded-md border"
                    :class="conditionalClass('border-gray-600', 'border-gray-300')"
                  >
                    <a
                      :href="url"
                      target="_blank"
                      class="text-sm truncate hover:underline"
                      @click.stop
                      >{{ getFileNameFromUrl(url) }}</a
                    >
                    <button
                      type="button"
                      @click.stop="removeExistingDocument(index)"
                      class="bg-red-600/80 text-white rounded px-1.5 py-0.5 text-xs"
                      aria-label="刪除"
                    >
                      ×
                    </button>
                  </div>
                  <div
                    v-for="(file, index) in documentFiles"
                    :key="`new-doc-${index}`"
                    class="flex items-center justify-between gap-2 p-2 rounded-md border"
                    :class="conditionalClass('border-gray-600', 'border-gray-300')"
                  >
                    <span class="text-sm truncate">{{ file.name }}</span>
                    <button
                      type="button"
                      @click.stop="removeNewDocument(index)"
                      class="bg-red-600/80 text-white rounded px-1.5 py-0.5 text-xs"
                      aria-label="刪除"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <input
                  ref="documentInputRef"
                  id="faqAttachmentDocuments"
                  name="attachmentDocuments"
                  data-testid="faq-attachment-documents"
                  type="file"
                  :accept="documentAccept"
                  multiple
                  class="hidden"
                  @change="handleDocumentFiles"
                />
              </div>
            </div>

            <!-- 影片上傳 -->
            <div class="mb-6">
              <label class="block mb-3 theme-text">影片 (可上傳多部)</label>
              <div
                class="mt-1 relative px-6 pt-5 pb-6 border-2 border-dashed rounded-[10px] cursor-pointer hover:border-blue-400 h-[240px]"
                :class="conditionalClass('border-gray-600', 'border-gray-300')"
                role="button"
                tabindex="0"
                aria-label="上傳影片，可點擊或拖曳檔案至此"
                @click="triggerVideoInput"
                @keydown.enter.prevent="triggerVideoInput"
                @keydown.space.prevent="triggerVideoInput"
                @dragenter.prevent
                @dragover.prevent
                @drop.prevent="handleVideoDrop"
                data-testid="faq-attachment-videos-dropzone"
              >
                <div
                  v-if="form.videoUrl.length === 0 && videoFiles.length === 0"
                  class="space-y-1 text-center pointer-events-none flex flex-col items-center justify-center h-full"
                >
                  <!-- Icon for video -->
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
                    class="flex text-sm"
                    :class="conditionalClass('text-gray-500', 'text-gray-400')"
                  >
                    <p class="pl-1">點擊或拖曳以上傳影片</p>
                  </div>
                  <p class="text-xs" :class="conditionalClass('text-gray-600', 'text-gray-500')">
                    MP4, WEBM, MOV
                  </p>
                </div>
                <div v-else class="absolute inset-3 overflow-y-auto">
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div
                      v-for="(url, index) in form.videoUrl"
                      :key="`existing-vid-${index}`"
                      class="relative rounded-md overflow-hidden border"
                      :class="conditionalClass('border-gray-600', 'border-gray-300')"
                    >
                      <video :src="url" class="w-full h-24 object-cover bg-black"></video>
                      <button
                        type="button"
                        @click.stop="removeExistingVideo(index)"
                        class="absolute top-1 right-1 bg-red-600/80 text-white rounded px-1.5 py-0.5 text-xs"
                        aria-label="刪除"
                      >
                        ×
                      </button>
                    </div>
                    <div
                      v-for="(file, index) in videoFiles"
                      :key="`new-vid-${index}`"
                      class="relative rounded-md overflow-hidden border"
                      :class="conditionalClass('border-gray-600', 'border-gray-300')"
                    >
                      <video
                        :src="file.previewUrl"
                        class="w-full h-24 object-cover bg-black"
                      ></video>
                      <button
                        type="button"
                        @click.stop="removeNewVideo(index)"
                        class="absolute top-1 right-1 bg-red-600/80 text-white rounded px-1.5 py-0.5 text-xs"
                        aria-label="刪除"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
                <input
                  ref="videoInputRef"
                  id="faqAttachmentVideos"
                  name="attachmentVideos"
                  data-testid="faq-attachment-videos"
                  type="file"
                  accept="video/*"
                  multiple
                  class="hidden"
                  @change="handleVideoFiles"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 按鈕 -->
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
              data-testid="faq-step-prev"
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
              data-testid="faq-step-next"
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
              data-testid="faq-save-draft"
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
            data-testid="faq-cancel"
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
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            data-testid="faq-final-submit"
          >
            <span v-if="isProcessing">
              <svg
                class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              處理中...
            </span>
            <span v-else>{{ isEditing ? '更新 FAQ' : '新增 FAQ' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount, defineAsyncComponent } from 'vue'
import { useFaqStore } from '@/stores/faqStore'
import { useNotifications } from '@/composables/notificationCenter'
import { useThemeClass } from '@/composables/useThemeClass'
import { useFormValidation } from '@/composables/useFormValidation'
import { useUserStore } from '@/stores/userStore'
import { useApi } from '@/composables/axios'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import LanguageSwitcher from '@/components/common/languageSwitcher.vue'

const RichTextBlockEditor = defineAsyncComponent(
  () => import('@/components/common/RichTextBlockEditor.vue'),
)

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  faqItem: {
    type: Object,
    default: null,
  },
  allFaqs: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:show', 'saved'])

const faqStore = useFaqStore()
const notify = useNotifications()
const { cardClass, inputClass: themeInputClass, conditionalClass } = useThemeClass()
const { errors: validationErrors, clearErrors, setError } = useFormValidation()
const userStore = useUserStore()

const inputClass = computed(() => [
  themeInputClass.value,
  'w-full rounded-[10px] ps-[12px] py-[8px] lg:ps-[16px] lg:py-[12px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
])

const loading = ref(false)
const formError = ref('')
const isProcessing = ref(false)
const isEditing = computed(() => !!props.faqItem?._id)
const isAdmin = computed(() => userStore.isAdmin)

const currentTab = ref('general')
const tabs = [
  { name: 'general', label: '基本資訊' },
  { name: 'mainContent', label: '主要內容' },
  { name: 'attachments', label: '附加檔案' },
]

const relatedFaqFilterCategory = ref(null)
const faqCategoriesTW = ref([])

const filteredAllFaqs = computed(() => {
  let faqs = props.allFaqs

  // 1. 編輯時，從列表中排除自己
  if (isEditing.value) {
    faqs = faqs.filter((faq) => faq._id !== props.faqItem._id)
  }
  faqs = faqs.filter((faq) => faq?.isActive)

  // 2. 根據分類篩選
  if (relatedFaqFilterCategory.value) {
    faqs = faqs.filter((faq) => {
      const main = faq.category?.main
      if (!main) return false
      if (typeof main === 'object') return main.TW === relatedFaqFilterCategory.value
      return main === relatedFaqFilterCategory.value
    })
  }

  return faqs
})

const questionLanguage = ref('TW')
const summaryLanguage = ref('TW')
const answerLanguage = ref('TW')
const subLanguage = ref('TW')

const stepLabelMap = {
  general: '基本資訊',
  mainContent: '主要內容',
  attachments: '附加檔案',
}

const fieldLabelMap = {
  author: '作者',
  'category.main.TW': '主分類',
  publishDate: '發布日期',
  productModel: '產品型號',
  'question.TW': '問題 (TW)',
  'question.EN': '問題 (EN)',
  'summary.TW': '摘要 (TW)',
  'summary.EN': '摘要 (EN)',
  answer: '答案',
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

// Image upload state
const imageFiles = ref([])
const imageInputRef = ref(null)

// Video upload state
const videoFiles = ref([])
const videoInputRef = ref(null)

// Document upload state
const documentFiles = ref([])
const documentInputRef = ref(null)

const documentAccept =
  '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain'

const triggerImageInput = () => imageInputRef.value?.click()
const triggerVideoInput = () => videoInputRef.value?.click()
const triggerDocumentInput = () => documentInputRef.value?.click()

const getFileNameFromUrl = (url) => {
  try {
    const decodedUrl = decodeURIComponent(url)
    return decodedUrl.substring(decodedUrl.lastIndexOf('/') + 1)
  } catch {
    return url.substring(url.lastIndexOf('/') + 1)
  }
}

const handleImageFiles = (event) => {
  const files = Array.from(event.target.files)
  files.forEach((file) => {
    const fileWithPreview = Object.assign(file, {
      previewUrl: URL.createObjectURL(file),
    })
    imageFiles.value.push(fileWithPreview)
  })
  if (imageInputRef.value) imageInputRef.value.value = ''
}

const handleImageDrop = (event) => {
  const files = Array.from(event.dataTransfer?.files || [])
  files.forEach((file) => {
    if (!file?.type?.startsWith('image/')) return
    const fileWithPreview = Object.assign(file, {
      previewUrl: URL.createObjectURL(file),
    })
    imageFiles.value.push(fileWithPreview)
  })
}

const handleVideoFiles = (event) => {
  const files = Array.from(event.target.files)
  files.forEach((file) => {
    const fileWithPreview = Object.assign(file, {
      previewUrl: URL.createObjectURL(file),
    })
    videoFiles.value.push(fileWithPreview)
  })
  if (videoInputRef.value) videoInputRef.value.value = ''
}

const handleVideoDrop = (event) => {
  const files = Array.from(event.dataTransfer?.files || [])
  files.forEach((file) => {
    if (!file?.type?.startsWith('video/')) return
    const fileWithPreview = Object.assign(file, {
      previewUrl: URL.createObjectURL(file),
    })
    videoFiles.value.push(fileWithPreview)
  })
}

const handleDocumentFiles = (event) => {
  const files = Array.from(event.target.files)
  documentFiles.value.push(...files)
  if (documentInputRef.value) documentInputRef.value.value = ''
}

const handleDocumentDrop = (event) => {
  const files = Array.from(event.dataTransfer?.files || [])
  documentFiles.value.push(...files)
}

const removeNewImage = (index) => {
  URL.revokeObjectURL(imageFiles.value[index].previewUrl)
  imageFiles.value.splice(index, 1)
}
const removeExistingImage = (index) => {
  form.value.imageUrl.splice(index, 1)
}

const removeNewVideo = (index) => {
  URL.revokeObjectURL(videoFiles.value[index].previewUrl)
  videoFiles.value.splice(index, 1)
}
const removeExistingVideo = (index) => {
  form.value.videoUrl.splice(index, 1)
}

const removeNewDocument = (index) => {
  documentFiles.value.splice(index, 1)
}
const removeExistingDocument = (index) => {
  form.value.documentUrl.splice(index, 1)
}

onBeforeUnmount(() => {
  // Revoke all object URLs when component is unmounted
  imageFiles.value.forEach((file) => URL.revokeObjectURL(file.previewUrl))
  videoFiles.value.forEach((file) => URL.revokeObjectURL(file.previewUrl))
})

const formatDateForInput = (dateStringOrDate) => {
  if (!dateStringOrDate) return ''
  try {
    const date = new Date(dateStringOrDate)
    const year = date.getFullYear()
    const month = ('0' + (date.getMonth() + 1)).slice(-2)
    const day = ('0' + date.getDate()).slice(-2)
    return `${year}-${month}-${day}`
  } catch {
    return ''
  }
}

const initialFormState = () => ({
  _id: null,
  question: { TW: '', EN: '' },
  answer: {
    TW: { type: 'doc', content: [{ type: 'paragraph' }] },
    EN: { type: 'doc', content: [{ type: 'paragraph' }] },
  },
  summary: { TW: '', EN: '' },
  category: { main: { TW: '', EN: '' }, sub: { TW: '', EN: '' } },
  author: '',
  publishDate: formatDateForInput(new Date()),
  productModel: '',
  isActive: false,
  imageUrl: [],
  videoUrl: [],
  documentUrl: [],
  relatedFaqs: [],
})
const form = ref(initialFormState())

const resetForm = () => {
  form.value = initialFormState()
  imageFiles.value = []
  videoFiles.value = []
  documentFiles.value = []

  if (imageInputRef.value) imageInputRef.value.value = ''
  if (videoInputRef.value) videoInputRef.value.value = ''
  if (documentInputRef.value) documentInputRef.value.value = ''

  clearErrors()
  formError.value = ''
  isProcessing.value = false
  questionLanguage.value = 'TW'
  summaryLanguage.value = 'TW'
  answerLanguage.value = 'TW'
  subLanguage.value = 'TW'
}

// 當 TW 類別變更時，自動同步 EN 類別（不顯示 EN 下拉）
watch(
  () => form.value.category.main.TW,
  (newTw) => {
    const mapping = {
      名詞解說: 'Glossary',
      產品介紹: 'Product Introduction',
      故障排除: 'Troubleshooting',
    }
    if (!form.value.category.main) form.value.category.main = { TW: '', EN: '' }
    form.value.category.main.EN = newTw ? mapping[newTw] || '' : ''
  },
)

watch(
  () => props.show,
  async (newVal) => {
    if (newVal) {
      resetForm()
      relatedFaqFilterCategory.value = null // 重置篩選器
      if (isEditing.value && props.faqItem?._id) {
        loading.value = true
        try {
          const faqData = props.faqItem
          form.value = {
            _id: faqData._id,
            question: {
              TW: faqData.question?.TW || '',
              EN: faqData.question?.EN || '',
            },
            summary: {
              TW: faqData.summary?.TW || '',
              EN: faqData.summary?.EN || '',
            },
            answer: {
              TW: faqData.answer?.TW || { type: 'doc', content: [{ type: 'paragraph' }] },
              EN: faqData.answer?.EN || { type: 'doc', content: [{ type: 'paragraph' }] },
            },
            category: {
              main:
                typeof faqData.category?.main === 'object'
                  ? { TW: faqData.category.main.TW || '', EN: faqData.category.main.EN || '' }
                  : { TW: faqData.category?.main || '', EN: '' },
              sub:
                typeof faqData.category?.sub === 'object'
                  ? { TW: faqData.category.sub.TW || '', EN: faqData.category.sub.EN || '' }
                  : { TW: faqData.category?.sub || '', EN: '' },
            },
            author: faqData.author || '',
            publishDate: formatDateForInput(faqData.publishDate),
            productModel: faqData.productModel || '',
            isActive: faqData.isActive,
            imageUrl: [...(faqData.imageUrl || [])],
            videoUrl: [...(faqData.videoUrl || [])],
            documentUrl: [...(faqData.documentUrl || [])],
            relatedFaqs: faqData.relatedFaqs?.map((faq) => faq._id || faq) || [],
          }

          questionLanguage.value = form.value.question.TW ? 'TW' : 'EN'
          answerLanguage.value = !isTiptapContentEmpty(form.value.answer.TW) ? 'TW' : 'EN'
        } catch (error) {
          console.error('Failed to load FAQ data for editing:', error)
          formError.value = `載入 FAQ 失敗: ${error.message}`
          notify.notifyError(formError.value)
        } finally {
          loading.value = false
        }
      } else {
        if (userStore.currentUser && !isAdmin.value) {
          form.value.author = userStore.currentUser.username || userStore.currentUser.name || ''
        }
      }
    }
  },
  { immediate: true },
)

const isTiptapContentEmpty = (content) => {
  if (!content || !content.content) {
    return true
  }
  if (content.content.length === 0) {
    return true
  }
  if (
    content.content.length === 1 &&
    content.content[0].type === 'paragraph' &&
    !content.content[0].content
  ) {
    return true
  }
  return false
}

const validateForm = () => {
  clearErrors()
  const errors = []
  const pushError = (step, field, message) => {
    errors.push({ step, field, message })
    setError(field, message)
  }
  let isValid = true
  if (!form.value.author?.trim()) {
    pushError('general', 'author', '作者為必填項')
    isValid = false
  }
  if (!form.value.category.main?.TW) {
    pushError('general', 'category.main.TW', '主分類 (TW) 為必填項')
    isValid = false
  }
  if (!form.value.question.TW?.trim() && !form.value.question.EN?.trim()) {
    pushError('general', 'question.TW', '至少需要一種語言的問題')
    isValid = false
  }
  if (!form.value.question.EN?.trim()) {
    pushError('general', 'question.EN', '英文問題為必填，用於產生語意化路由')
    isValid = false
  }

  if (!form.value.summary.TW?.trim()) {
    pushError('general', 'summary.TW', '摘要為必填項')
    isValid = false
  }
  if (!form.value.summary.EN?.trim()) {
    pushError('general', 'summary.EN', '摘要 (EN) 為必填項')
    isValid = false
  }

  if (!form.value.publishDate) {
    pushError('general', 'publishDate', '發布日期為必填項')
    isValid = false
  } else {
    const date = new Date(form.value.publishDate)
    if (isNaN(date.getTime())) {
      pushError('general', 'publishDate', '發布日期格式無效')
      isValid = false
    }
  }

  if (isTiptapContentEmpty(form.value.answer.TW) && isTiptapContentEmpty(form.value.answer.EN)) {
    pushError('mainContent', 'answer', '至少需要一種語言的答案')
    isValid = false
  }

  stepErrors.value = errors
  if (!isValid) {
    currentTab.value = errors[0]?.step || 'general'
    formError.value = ''
  } else {
    formError.value = ''
  }
  return isValid
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
  // 草稿：允許不通過完整驗證；強制 isActive=false
  isProcessing.value = true
  stepErrors.value = []
  formError.value = ''

  const formData = new FormData()
  const hasNewFiles =
    imageFiles.value.length > 0 || videoFiles.value.length > 0 || documentFiles.value.length > 0

  imageFiles.value.forEach((file) => {
    formData.append('faqImages', file)
  })
  videoFiles.value.forEach((file) => formData.append('faqVideos', file))
  documentFiles.value.forEach((file) => formData.append('faqDocuments', file))

  const faqDataPayload = {
    ...form.value,
    publishDate: form.value.publishDate ? new Date(form.value.publishDate).toISOString() : null,
    productModel: form.value.productModel || null,
    imageUrl: form.value.imageUrl,
    videoUrl: form.value.videoUrl,
    documentUrl: form.value.documentUrl,
    relatedFaqs: form.value.relatedFaqs,
    isActive: false,
  }

  const mapping = {
    名詞解說: 'Glossary',
    產品介紹: 'Product Introduction',
    故障排除: 'Troubleshooting',
  }
  if (faqDataPayload?.category?.main) {
    const tw = faqDataPayload.category.main.TW || ''
    if (tw && !faqDataPayload.category.main.EN) {
      faqDataPayload.category.main.EN = mapping[tw] || ''
    }
  }
  if (faqDataPayload.category?.main && !faqDataPayload.category.main.EN) {
    delete faqDataPayload.category.main.EN
  }

  if (!faqDataPayload.question.EN) delete faqDataPayload.question.EN
  if (isTiptapContentEmpty(faqDataPayload.answer.EN)) {
    delete faqDataPayload.answer.EN
  }

  delete faqDataPayload._id

  let submissionPayload
  if (hasNewFiles) {
    formData.append('faqDataPayload', JSON.stringify(faqDataPayload))
    submissionPayload = formData
  } else {
    submissionPayload = faqDataPayload
  }

  try {
    let result
    if (isEditing.value) {
      result = await faqStore.update(form.value._id, submissionPayload, hasNewFiles)
    } else {
      result = await faqStore.create(submissionPayload, hasNewFiles)
    }

    if (faqStore.error) {
      const errorMessage =
        typeof faqStore.error === 'string'
          ? faqStore.error
          : faqStore.error.response?.data?.message || faqStore.error.message || '操作失敗'
      throw new Error(errorMessage)
    }

    emit('saved', {
      faq: result || { _id: form.value._id || 'tempId', ...faqDataPayload },
      isNew: !isEditing.value,
    })
    closeModal()
  } catch (error) {
    formError.value = error.message || '操作失敗，請稍後再試。'
  } finally {
    isProcessing.value = false
  }
}

const submitForm = async () => {
  clearErrors() // Clear previous errors before validating again
  if (!validateForm()) return

  isProcessing.value = true
  formError.value = ''

  const formData = new FormData()
  const hasNewFiles =
    imageFiles.value.length > 0 || videoFiles.value.length > 0 || documentFiles.value.length > 0

  // Append new files
  imageFiles.value.forEach((file) => {
    formData.append('faqImages', file)
  })
  videoFiles.value.forEach((file) => formData.append('faqVideos', file))
  documentFiles.value.forEach((file) => formData.append('faqDocuments', file))

  const faqDataPayload = {
    ...form.value,
    publishDate: form.value.publishDate ? new Date(form.value.publishDate).toISOString() : null,
    productModel: form.value.productModel || null,
    imageUrl: form.value.imageUrl,
    videoUrl: form.value.videoUrl,
    documentUrl: form.value.documentUrl,
    relatedFaqs: form.value.relatedFaqs,
  }
  // 將 TW 自動對應 EN（若 EN 未填則用映射補齊）
  const mapping = {
    名詞解說: 'Glossary',
    產品介紹: 'Product Introduction',
    故障排除: 'Troubleshooting',
  }
  if (faqDataPayload?.category?.main) {
    const tw = faqDataPayload.category.main.TW || ''
    if (tw && !faqDataPayload.category.main.EN) {
      faqDataPayload.category.main.EN = mapping[tw] || ''
    }
  }
  // 若 EN 主分類為空字串，允許省略，後端會回退 TW
  if (faqDataPayload.category?.main && !faqDataPayload.category.main.EN) {
    delete faqDataPayload.category.main.EN
  }
  // Clean up empty EN fields
  if (!faqDataPayload.question.EN) delete faqDataPayload.question.EN
  if (isTiptapContentEmpty(faqDataPayload.answer.EN)) {
    delete faqDataPayload.answer.EN
  }
  if (!faqDataPayload.summary.TW) delete faqDataPayload.summary.TW
  if (!faqDataPayload.summary.EN) delete faqDataPayload.summary.EN
  if (Object.keys(faqDataPayload.summary).length === 0) {
    delete faqDataPayload.summary
  }

  // Remove fields that are handled by file uploads or shouldn't be in the JSON payload
  delete faqDataPayload._id

  let submissionPayload
  // Always use FormData if there are new files.
  if (hasNewFiles) {
    formData.append('faqDataPayload', JSON.stringify(faqDataPayload))
    submissionPayload = formData
  } else {
    // If no new files, just send JSON
    submissionPayload = faqDataPayload
  }

  try {
    let result
    if (isEditing.value) {
      result = await faqStore.update(form.value._id, submissionPayload, hasNewFiles)
    } else {
      result = await faqStore.create(submissionPayload, hasNewFiles)
    }

    if (faqStore.error) {
      const errorMessage =
        typeof faqStore.error === 'string'
          ? faqStore.error
          : faqStore.error.response?.data?.message || faqStore.error.message || '操作失敗'
      throw new Error(errorMessage)
    }

    emit('saved', {
      faq: result || { _id: form.value._id || 'tempId', ...faqDataPayload },
      isNew: !isEditing.value,
    })
    closeModal()
  } catch (error) {
    console.error('FAQ submission failed:', error)
    formError.value = error.message || '操作失敗，請稍後再試。'
  } finally {
    isProcessing.value = false
  }
}

const closeModal = () => {
  if (isProcessing.value) return
  emit('update:show', false)
  currentTab.value = 'general' // 關閉時重置 Tab
}

// 載入 FAQ 分類選項 (TW/EN)
;(async () => {
  try {
    const { entityApi } = useApi()
    const faqApi = entityApi('faqs', { responseKey: 'faqs' })
    faqCategoriesTW.value = await faqApi.getCategories()
  } catch (e) {
    console.warn('載入 FAQ 分類清單失敗', e?.message || e)
  }
})()
</script>
