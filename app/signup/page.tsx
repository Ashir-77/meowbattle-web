import { Suspense } from 'react'
import SignupClientPage from './signup-client'

function SignupFallback() {
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-6 text-3xl font-bold">Create account</h1>
      <p>Loading...</p>
    </main>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupFallback />}>
      <SignupClientPage />
    </Suspense>
  )
}