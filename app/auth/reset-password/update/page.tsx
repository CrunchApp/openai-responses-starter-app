'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function ResetPasswordUpdatePage() {
  const [password, setPassword]         = useState('')
  const [confirm, setConfirm]           = useState('')
  const [error, setError]               = useState<string|null>(null)
  const [success, setSuccess]           = useState(false)
  const [loading, setLoading]           = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password/confirm', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ password }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Unknown error')
      setSuccess(true)
      setTimeout(() => router.push('/auth/login'), 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Alert>
        <AlertDescription>Password updated — redirecting to login…</AlertDescription>
      </Alert>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
      )}
      <div>
        <Label htmlFor="password">New Password</Label>
        <Input id="password" type="password"
               value={password}
               onChange={e => setPassword(e.target.value)}
               required/>
      </div>
      <div>
        <Label htmlFor="confirm">Confirm Password</Label>
        <Input id="confirm" type="password"
               value={confirm}
               onChange={e => setConfirm(e.target.value)}
               required/>
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Updating…' : 'Update Password'}
      </Button>
    </form>
  )
}
