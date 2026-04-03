import axios, { AxiosInstance } from 'axios'

let client: AxiosInstance | null = null
let authToken: string | null = null

export function getApiUrl(): string {
  return process.env.BC_API_URL || 'http://localhost:4002'
}

export function getClient(): AxiosInstance {
  if (!client) {
    client = axios.create({
      baseURL: getApiUrl(),
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    })

    client.interceptors.request.use((config) => {
      if (authToken) {
        config.headers['x-access-token'] = authToken
      }
      return config
    })
  }
  return client
}

export function setAuthToken(token: string) {
  authToken = token
}

export function getAuthToken(): string | null {
  return authToken
}

export async function api<T = unknown>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  data?: unknown,
): Promise<T> {
  const res = await getClient().request<T>({ method, url: path, data })
  return res.data
}
