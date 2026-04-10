import { Suspense } from 'react'
import MfaClientPage from './mfa-client'

function MfaFallback() {
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-6 text-3xl font-bold">Multi-factor authentication</h1>
      <p>Loading...</p>
    </main>
  )
}

export default function MfaPage() {
  return (
    <Suspense fallback={<MfaFallback />}>
      <MfaClientPage />
    </Suspense>
  )
}