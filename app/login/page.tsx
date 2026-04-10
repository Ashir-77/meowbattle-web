import { Suspense } from 'react'
import LoginClientPage from './login-client'

function LoginFallback() {
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-6 text-3xl font-bold">Log in</h1>
      <p>Loading...</p>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginClientPage />
    </Suspense>
  )
}