import axios from 'axios'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://web.lweb.ch/oferto/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Accept': 'application/json' },
})

api.interceptors.response.use(
  res => res,
  err => {
    const msg = err.response?.data?.message ?? err.message ?? 'Network error'
    return Promise.reject(new Error(msg))
  }
)
