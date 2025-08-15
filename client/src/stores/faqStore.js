import { createEntityStore } from './entityStore'

export const useFaqStore = createEntityStore('faqs', { responseKey: 'faqs' })
