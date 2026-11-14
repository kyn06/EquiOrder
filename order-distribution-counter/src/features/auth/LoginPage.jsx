import { useState } from 'react'

function LoginPage({ onAuthenticated, initialError = '' }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [error, setError] = useState(initialError)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isCreatingAccount = mode === 'register'

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/auth/${isCreatingAccount ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not sign in.')
      onAuthenticated(result.user)
    } catch (requestError) {
      setError(requestError.message || 'Could not connect to EquiOrder.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode)
    setError('')
    setPassword('')
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 text-[#102a5c]">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/90 bg-[#eaf2fc] neo-raised lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden min-h-[590px] flex-col justify-between overflow-hidden bg-linear-to-br from-blue-700 via-blue-800 to-slate-950 p-10 text-white lg:flex">
          <div className="absolute -right-24 -top-20 size-80 rounded-full border border-white/10" />
          <div className="absolute -bottom-40 -left-20 size-96 rounded-full border border-white/10" />
          <div className="relative flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-6">
                <path d="M4 7h16M4 12h10M4 17h16" /><circle cx="18" cy="12" r="2" />
              </svg>
            </span>
            <span className="text-xl font-extrabold tracking-tight">EquiOrder</span>
          </div>
          <div className="relative max-w-md">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200">Fair orders, smarter distribution</p>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight">Your team’s workday, in balance.</h1>
            <p className="mt-4 max-w-sm text-base leading-7 text-blue-100/80">Sign in to manage your team, share incoming orders fairly, and keep your notes close.</p>
          </div>
          <p className="relative text-xs font-medium text-blue-100/60">A calmer way to keep every order moving.</p>
        </section>

        <section className="flex min-h-[590px] flex-col justify-center p-6 sm:p-10 lg:p-12">
          <div className="mb-8 lg:hidden">
            <span className="text-sm font-extrabold tracking-tight text-blue-800">EquiOrder</span>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">{isCreatingAccount ? 'Get started' : 'Welcome back'}</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#102a5c]">{isCreatingAccount ? 'Create your account' : 'Sign in to EquiOrder'}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{isCreatingAccount ? 'Your new workspace starts with an empty team and no saved notes.' : 'Use your account email and password to continue.'}</p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="account-email" className="mb-2 block text-sm font-bold text-[#254779]">Email</label>
              <input
                id="account-email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="neo-inset min-h-12 w-full rounded-2xl border border-white/90 bg-[#eaf2fc] px-4 py-3 text-sm font-medium text-[#102a5c] outline-none placeholder:text-slate-500 focus-visible:ring-4 focus-visible:ring-blue-200"
              />
            </div>
            <div>
              <label htmlFor="account-password" className="mb-2 block text-sm font-bold text-[#254779]">Password</label>
              <div className="relative">
                <input
                  id="account-password"
                  type={isPasswordVisible ? 'text' : 'password'}
                  autoComplete={isCreatingAccount ? 'new-password' : 'current-password'}
                  required
                  minLength={isCreatingAccount ? 8 : undefined}
                  maxLength={128}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={isCreatingAccount ? 'At least 8 characters' : 'Enter your password'}
                  className="neo-inset min-h-12 w-full rounded-2xl border border-white/90 bg-[#eaf2fc] py-3 pl-4 pr-12 text-sm font-medium text-[#102a5c] outline-none placeholder:text-slate-500 focus-visible:ring-4 focus-visible:ring-blue-200"
                />
                <button
                  type="button"
                  onClick={() => setIsPasswordVisible((visible) => !visible)}
                  aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                  aria-pressed={isPasswordVisible}
                  className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-slate-600 transition-colors hover:bg-blue-100 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 dark:text-slate-300 dark:hover:bg-white/10"
                >
                  {isPasswordVisible ? (
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5">
                      <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                      <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5.2 0 8.6 4.5 9.5 6-.4.7-1.4 2-3 3.4M6.2 6.2C4.1 7.4 2.8 9.3 2.5 11c.4.7 1.3 1.9 2.8 3.2A10.4 10.4 0 0 0 12 17c.8 0 1.6-.1 2.3-.3" />
                    </svg>
                  ) : (
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5">
                      <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
                      <circle cx="12" cy="12" r="2.5" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</p>}

            <button type="submit" disabled={isSubmitting} className="button-primary min-h-12 w-full rounded-2xl px-5 py-3 text-sm font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-60">
              {isSubmitting ? 'Please wait…' : isCreatingAccount ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            {isCreatingAccount ? 'Already have an account?' : 'New to EquiOrder?'}{' '}
            <button type="button" onClick={() => changeMode(isCreatingAccount ? 'login' : 'register')} className="rounded font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
              {isCreatingAccount ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </section>
      </div>
    </main>
  )
}

export default LoginPage
