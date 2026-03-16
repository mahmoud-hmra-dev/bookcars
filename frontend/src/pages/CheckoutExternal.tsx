import { useSearchParams } from 'react-router-dom'
import Error from '@/components/Error'
import Layout from '@/components/Layout'
import CheckoutStatus from '@/components/CheckoutStatus'
import { strings } from '@/lang/checkout'
import * as UserService from '@/services/UserService'

const CheckoutExternal = () => {
  const [searchParams] = useSearchParams()
  const bookingId = searchParams.get('bookingId') || ''
  const status = (searchParams.get('status') || 'error') as 'success' | 'error' | 'cancel'
  const currentUser = UserService.getCurrentUser()
  const language = currentUser?.language || UserService.getLanguage()

  const success = status === 'success'

  return (
    <Layout strict>
      {bookingId
        ? <CheckoutStatus bookingId={bookingId} language={language} status={success ? 'success' : 'error'} />
        : <Error message={strings.PAYMENT_FAILED} />}
    </Layout>
  )
}

export default CheckoutExternal
