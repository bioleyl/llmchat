import { createRouter, createWebHashHistory } from 'vue-router'
import Chat from '../components/Chat.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: Chat,
    }
  ],
})

export default router
