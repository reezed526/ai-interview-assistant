import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/index.js'
import './assets/main.css'
import { useAuthStore } from '@/stores/auth.js'
import { useNotebookStore } from '@/stores/notebook.js'

async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)

  const authStore = useAuthStore(pinia)
  await authStore.restoreSession()

  const notebookStore = useNotebookStore(pinia)
  notebookStore.hydrate()

  app.use(router)

  app.config.errorHandler = (err, instance, info) => {
    console.error('[Vue Error]', info, err)
  }

  app.mount('#app')
}

bootstrap()
