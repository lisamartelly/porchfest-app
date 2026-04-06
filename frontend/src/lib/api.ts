const API_URL = import.meta.env.VITE_API_URL ?? ''

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function throwIfNotOk(res: Response) {
  if (!res.ok) throw new ApiError(res.status, await res.text())
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const api = {
  get: async (endpoint: string) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: authHeaders(),
    })
    await throwIfNotOk(res)
    return res.json()
  },

  post: async (endpoint: string, data: unknown) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    })
    await throwIfNotOk(res)
    return res.json()
  },

  patch: async (endpoint: string, data: unknown) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    })
    await throwIfNotOk(res)
    return res.json()
  },

  delete: async (endpoint: string) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    await throwIfNotOk(res)
    return res.json()
  },
}
