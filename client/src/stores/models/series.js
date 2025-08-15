import { createEntityStore } from '@/stores/entityStore'

// 創建系列 store 實例
export const useSeriesStore = createEntityStore('series', { responseKey: 'seriesList' })
