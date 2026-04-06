import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router/index.js'
import App from './App.vue'
import './assets/main.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// 捕获所有 Vue 渲染/生命周期错误，防止白屏无提示
app.config.errorHandler = (err, instance, info) => {
  console.error('[Vue Error]', info, err)
}

app.mount('#app')
