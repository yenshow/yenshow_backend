import { createEntityStore } from '@/stores/entityStore'

// 創建規格 store 實例
export const useSpecificationsStore = createEntityStore('specifications', {
  responseKey: 'specificationsList',
})
