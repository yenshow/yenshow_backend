import { createEntityStore } from './entityStore'

export const useNewsStore = createEntityStore('news', { responseKey: 'news' })
