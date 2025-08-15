import { createEntityStore } from '@/stores/entityStore'

// 創建類別 store 實例
export const useCategoriesStore = createEntityStore('categories', { responseKey: 'categoriesList' })
