import { SignupForm } from '@/app/components/auth/SignupForm'

export const metadata = {
  title: 'Sign Up | Vista Education Adviser',
  description: 'Create a new Vista Education Adviser account'
}

export default function SignupPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Create an account</h1>
          <p className="text-muted-foreground mt-2">
            Join Vista Education Adviser to find your perfect study program
          </p>
        </div>
        <SignupForm />
      </div>
    </div>
  )
} 