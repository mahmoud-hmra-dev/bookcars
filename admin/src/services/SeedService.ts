import axiosInstance from './axiosInstance'

/**
 * Trigger the Lebanon demo data seed via the backend API.
 * Returns { success, log, message? }
 */
export const seedLebanon = async (): Promise<{ success: boolean; log: string[]; message?: string }> => {
  const { data } = await axiosInstance.post('/api/seed-lebanon', null, { withCredentials: true })
  return data
}
