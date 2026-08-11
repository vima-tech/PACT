import request from '@/utils/request'

export interface LoginParams {
  username: string
  password: string
}

export interface UserInfo {
  id: number
  username: string
  realName: string
  avatar?: string
  roles: string[]
  permissions: string[]
}

export function login(data: LoginParams) {
  return request.post('/auth/login', data)
}

export function logout() {
  return request.post('/auth/logout')
}

export function getUserInfo() {
  return request.get('/auth/user-info')
}

export function changePassword(data: { oldPassword: string; newPassword: string }) {
  return request.post('/auth/change-password', data)
}
