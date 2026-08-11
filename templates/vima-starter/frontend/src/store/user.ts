import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as loginApi, logout as logoutApi, getUserInfo } from '@/api/auth'
import { storage } from '@/utils/storage'
import router from '@/router'

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(storage.get('token') || '')
  const userInfo = ref<any>(storage.get('userInfo') || null)

  const isLoggedIn = computed(() => !!token.value)
  const username = computed(() => userInfo.value?.username || '')
  const realName = computed(() => userInfo.value?.realName || '')
  const roles = computed(() => userInfo.value?.roles || [])
  const permissions = computed(() => userInfo.value?.permissions || [])

  async function login(username: string, password: string) {
    const res: any = await loginApi({ username, password })
    token.value = res.data.token
    storage.set('token', res.data.token)
    await fetchUserInfo()
  }

  async function fetchUserInfo() {
    const res: any = await getUserInfo()
    userInfo.value = res.data
    storage.set('userInfo', res.data)
  }

  async function logout() {
    try {
      await logoutApi()
    } finally {
      resetState()
      router.push('/login')
    }
  }

  function resetState() {
    token.value = ''
    userInfo.value = null
    storage.remove('token')
    storage.remove('userInfo')
  }

  function hasRole(role: string) {
    return roles.value.includes(role) || roles.value.includes('admin')
  }

  function hasPermission(permission: string) {
    return permissions.value.includes('*:*:*') || permissions.value.includes(permission)
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    username,
    realName,
    roles,
    permissions,
    login,
    fetchUserInfo,
    logout,
    resetState,
    hasRole,
    hasPermission,
  }
})
