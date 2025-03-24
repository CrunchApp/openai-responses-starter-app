import { LoginForm } from '@/app/components/auth/LoginForm'

export const metadata = {
  title: 'Login | Vista Education Adviser',
  description: 'Login to your Vista Education Adviser account'
}

export default function LoginPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground mt-2">
            Login to your Vista Education Adviser account
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
} 