import { Suspense } from 'react'
import MfaClientPage from './mfa-client'

function MfaFallback() {
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-6 text-3xl font-bold">Two-factor authentication</h1>
      <p className="text-gray-600">Loading...</p>
    </main>
  )
}

export default function MFAPage() {
  return (
    <Suspense fallback={<MfaFallback />}>
      <MfaClientPage />
    </Suspense>
  )
}