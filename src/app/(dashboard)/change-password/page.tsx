'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Lock, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { passwordSchema, getPasswordStrength } from '@/lib/auth/password';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export default function ChangePasswordPage() {
  const router = useRouter();
  const { update, data: session } = useSession();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPassword = form.watch('newPassword');
  const passwordStrength = newPassword ? getPasswordStrength(newPassword) : null;

  const onSubmit = async (data: ChangePasswordForm) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to change password');
      }

      toast.success('Password changed successfully', {
        description: 'You can now login with your new password',
      });

      // Sign out and redirect to login
      await fetch('/api/auth/signout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold">Change Password</h1>
          <p className="text-muted-foreground">
            {session?.user?.mustChangePassword
              ? 'You must change your password before continuing'
              : 'Update your password to keep your account secure'}
          </p>
        </div>

        {session?.user?.mustChangePassword && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Password change required. You cannot access the system until you change your password.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Enter your current password and choose a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrent ? 'text' : 'password'}
                    placeholder="Enter current password"
                    {...form.register('currentPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {form.formState.errors.currentPassword && (
                  <p className="text-sm text-destructive">{form.formState.errors.currentPassword.message}</p>
                )}
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNew ? 'text' : 'password'}
                    placeholder="Enter new password"
                    {...form.register('newPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {newPassword && passwordStrength && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Password strength:</span>
                      <span className={`font-medium ${
                        passwordStrength.score <= 1 ? 'text-red-500' :
                        passwordStrength.score <= 2 ? 'text-orange-500' :
                        passwordStrength.score <= 3 ? 'text-yellow-500' :
                        'text-green-500'
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${(passwordStrength.score + 1) * 20}%` }}
                      />
                    </div>
                  </div>
                )}

                {form.formState.errors.newPassword && (
                  <p className="text-sm text-destructive">{form.formState.errors.newPassword.message}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    {...form.register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {form.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Password Requirements */}
              <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted rounded-md">
                <p className="font-medium">Password requirements:</p>
                <ul className="space-y-1 ml-4">
                  <li className={newPassword && newPassword.length >= 12 ? 'text-green-600' : ''}>
                    {newPassword && newPassword.length >= 12 ? '✓' : '•'} At least 12 characters
                  </li>
                  <li className={newPassword && /[A-Z]/.test(newPassword) ? 'text-green-600' : ''}>
                    {newPassword && /[A-Z]/.test(newPassword) ? '✓' : '•'} One uppercase letter
                  </li>
                  <li className={newPassword && /[a-z]/.test(newPassword) ? 'text-green-600' : ''}>
                    {newPassword && /[a-z]/.test(newPassword) ? '✓' : '•'} One lowercase letter
                  </li>
                  <li className={newPassword && /[0-9]/.test(newPassword) ? 'text-green-600' : ''}>
                    {newPassword && /[0-9]/.test(newPassword) ? '✓' : '•'} One number
                  </li>
                  <li className={newPassword && /[^A-Za-z0-9]/.test(newPassword) ? 'text-green-600' : ''}>
                    {newPassword && /[^A-Za-z0-9]/.test(newPassword) ? '✓' : '•'} One special character
                  </li>
                </ul>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Changing password...' : 'Change Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
