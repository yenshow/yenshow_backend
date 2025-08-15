import { createEntityStore } from '@/stores/entityStore'

// 創建子類別 store 實例
export const useSubCategoriesStore = createEntityStore('subCategories', {
  responseKey: 'subCategoriesList',
})
