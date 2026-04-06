<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe,transparent_40%),linear-gradient(180deg,#f8fbff_0%,#eef2ff_100%)] px-6 py-10">
    <div class="mx-auto max-w-5xl grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <section class="rounded-[32px] bg-slate-900 px-8 py-10 text-white shadow-[0_20px_80px_rgba(15,23,42,0.25)]">
        <div class="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm">
          <span class="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />
          AI 求职助手
        </div>

        <h1 class="mt-8 text-4xl font-bold leading-tight">
          登录后开始你的
          <br />
          模拟面试训练
        </h1>

        <p class="mt-4 max-w-xl text-sm leading-7 text-slate-300">
          当前版本已支持云端共享注册与登录。其他人访问你的 Cloudflare 站点，也可以创建自己的账号并登录使用。
        </p>

        <div class="mt-10 grid gap-4 sm:grid-cols-3">
          <div
            v-for="item in features"
            :key="item.title"
            class="rounded-3xl border border-white/10 bg-white/5 p-5"
          >
            <div class="text-2xl">{{ item.icon }}</div>
            <h2 class="mt-3 text-sm font-semibold">{{ item.title }}</h2>
            <p class="mt-2 text-xs leading-6 text-slate-300">{{ item.desc }}</p>
          </div>
        </div>
      </section>

      <section class="rounded-[32px] border border-white/60 bg-white/90 p-6 shadow-[0_20px_60px_rgba(148,163,184,0.18)] backdrop-blur">
        <div class="mb-6 flex rounded-2xl bg-slate-100 p-1">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            @click="switchMode(tab.value)"
            class="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
            :class="mode === tab.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'"
          >
            {{ tab.label }}
          </button>
        </div>

        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div v-if="mode === 'register'">
            <label class="mb-2 block text-sm font-medium text-slate-700">昵称</label>
            <input
              v-model.trim="form.name"
              type="text"
              maxlength="20"
              placeholder="例如：小张"
              class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700">邮箱</label>
            <input
              v-model.trim="form.email"
              type="email"
              autocomplete="username"
              placeholder="name@example.com"
              class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700">密码</label>
            <input
              v-model="form.password"
              type="password"
              autocomplete="current-password"
              placeholder="至少 6 位"
              class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div v-if="mode === 'register'">
            <label class="mb-2 block text-sm font-medium text-slate-700">确认密码</label>
            <input
              v-model="form.confirmPassword"
              type="password"
              autocomplete="new-password"
              placeholder="再次输入密码"
              class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div v-if="errorMessage" class="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {{ errorMessage }}
          </div>

          <button
            type="submit"
            :disabled="isSubmitting"
            class="flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {{ isSubmitting ? '提交中...' : mode === 'register' ? '注册并开始使用' : '登录' }}
          </button>
        </form>

        <p class="mt-5 text-center text-xs leading-6 text-slate-400">
          {{ mode === 'register' ? '已有账号？' : '还没有账号？' }}
          <button
            type="button"
            class="font-medium text-blue-600 hover:text-blue-700"
            @click="switchMode(mode === 'register' ? 'login' : 'register')"
          >
            {{ mode === 'register' ? '去登录' : '去注册' }}
          </button>
        </p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { useNotebookStore } from '@/stores/notebook.js'

const router = useRouter()
const authStore = useAuthStore()
const notebookStore = useNotebookStore()

const tabs = [
  { value: 'login', label: '登录' },
  { value: 'register', label: '注册' },
]

const features = [
  { icon: '云', title: '共享账号', desc: '账号注册信息保存在云端，其他人也可以直接创建和登录。' },
  { icon: '问', title: '智能面试', desc: '根据岗位和 JD 自动生成面试问题与追问。' },
  { icon: '评', title: '即时评估', desc: '在报告页生成分维度评分与逐题反馈。' },
]

const mode = ref('login')
const isSubmitting = ref(false)
const errorMessage = ref('')
const form = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
})

function switchMode(nextMode) {
  mode.value = nextMode
  errorMessage.value = ''
  form.password = ''
  form.confirmPassword = ''
}

function validateForm() {
  if (mode.value === 'register' && !form.name) {
    return '请输入昵称'
  }
  if (!form.email) {
    return '请输入邮箱'
  }
  if (!/^\S+@\S+\.\S+$/.test(form.email)) {
    return '邮箱格式不正确'
  }
  if (!form.password || form.password.length < 6) {
    return '密码至少需要 6 位'
  }
  if (mode.value === 'register' && form.password !== form.confirmPassword) {
    return '两次输入的密码不一致'
  }
  return ''
}

async function handleSubmit() {
  errorMessage.value = validateForm()
  if (errorMessage.value) return

  isSubmitting.value = true
  try {
    if (mode.value === 'register') {
      await authStore.register({
        name: form.name,
        email: form.email,
        password: form.password,
      })
    } else {
      await authStore.login({
        email: form.email,
        password: form.password,
      })
    }

    notebookStore.hydrate()
    router.replace('/')
  } catch (error) {
    errorMessage.value = error?.message || '操作失败，请稍后重试'
  } finally {
    isSubmitting.value = false
  }
}
</script>
