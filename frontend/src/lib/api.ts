// Placeholder - will be replaced with self-hosted DB client
// For now, we'll use the backend API for all data operations

const API_URL = import.meta.env.VITE_API_URL ?? ''

export const api = {
  get: async (endpoint: string) => {
    const token = localStorage.getItem('auth_token')
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
  
  post: async (endpoint: string, data: unknown) => {
    const token = localStorage.getItem('auth_token')
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
  
  patch: async (endpoint: string, data: unknown) => {
    const token = localStorage.getItem('auth_token')
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
}
