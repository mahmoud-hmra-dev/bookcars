import axios from 'axios'

export interface CreatePaymentLinkPayload {
  project_id: string
  project_name: string
  prodact_id: string
  user_id: string
  firstName: string
  lastName: string
  email: string
  price: number
  currency: string
  successCallback: string
  cancelCallback: string
  errorCallback: string
}

export const createPaymentLink = async (apiHost: string, payload: CreatePaymentLinkPayload): Promise<string> => {
  const response = await axios.post(
    `${apiHost.replace(/\/$/, '')}/api/makeHash`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
      },
      responseType: 'text',
    }
  )

  return String(response.data)
}
