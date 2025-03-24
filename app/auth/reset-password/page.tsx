import { ResetPasswordForm } from '@/app/components/auth/ResetPasswordForm'

export const metadata = {
  title: 'Reset Password | Vista Education Adviser',
  description: 'Reset your Vista Education Adviser account password'
}

export default function ResetPasswordPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Reset Password</h1>
          <p className="text-muted-foreground mt-2">
            Enter your email to receive a password reset link
          </p>
        </div>
        <ResetPasswordForm />
      </div>
    </div>
  )
} 