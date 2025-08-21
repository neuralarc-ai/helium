'use client';

import Link from 'next/link';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import GoogleSignIn from '@/components/GoogleSignIn';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useState, useEffect, Suspense } from 'react';
import { signIn, signUp, forgotPassword } from './actions';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  X,
  CheckCircle,
  AlertCircle,
  MailCheck,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useAuthMethodTracking } from '@/lib/stores/auth-tracking';
import { toast } from 'sonner';
import { useFeatureFlag } from '@/lib/feature-flags';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import GitHubSignIn from '@/components/GithubSignIn';
import { HeliumLogo } from '@/components/sidebar/helium-logo';
import Image from 'next/image';
import { ReleaseBadge } from '@/components/auth/release-badge';
import LoginFooter from './login-footer/login-footer';
import { motion } from 'framer-motion';

// Helper function to check if we're in production mode
const isProductionMode = (): boolean => {
  const envMode = process.env.NEXT_PUBLIC_ENV_MODE?.toLowerCase();
  return envMode === 'production';
};

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const mode = searchParams.get('mode');
  const returnUrl = searchParams.get('returnUrl');
  const message = searchParams.get('message');
  const { enabled: customAgentsEnabled } = useFeatureFlag('custom_agents');

  const isSignUp = mode === 'signup';
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [mounted, setMounted] = useState(false);
  const isProduction = isProductionMode();

  const { wasLastMethod: wasEmailLastMethod, markAsUsed: markEmailAsUsed } =
    useAuthMethodTracking('email');

  useEffect(() => {
    if (!isLoading && user) {
      router.push(returnUrl || '/dashboard');
    }
  }, [user, isLoading, router, returnUrl]);

  const isSuccessMessage =
    message &&
    (message.includes('Check your email') ||
      message.includes('Account created') ||
      message.includes('success'));

  // Registration success state
  const [registrationSuccess, setRegistrationSuccess] =
    useState(!!isSuccessMessage);
  const [registrationEmail, setRegistrationEmail] = useState('');

  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordStatus, setForgotPasswordStatus] = useState<{
    success?: boolean;
    message?: string;
  }>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isSuccessMessage) {
      setRegistrationSuccess(true);
    }
  }, [isSuccessMessage]);

  const handleSignIn = async (prevState: any, formData: FormData) => {
    markEmailAsUsed();

    if (returnUrl) {
      formData.append('returnUrl', returnUrl);
    } else {
      formData.append('returnUrl', '/dashboard');
    }
    const result = await signIn(prevState, formData);

    if (
      result &&
      typeof result === 'object' &&
      'success' in result &&
      result.success &&
      'redirectTo' in result
    ) {
      window.location.href = result.redirectTo as string;
      return null;
    }

    if (result && typeof result === 'object' && 'message' in result) {
      toast.error('Login failed', {
        description: result.message as string,
        duration: 5000,
      });
      return {};
    }

    return result;
  };

  const handleSignUp = async (prevState: any, formData: FormData) => {
    markEmailAsUsed();

    const email = formData.get('email') as string;
    setRegistrationEmail(email);

    if (returnUrl) {
      formData.append('returnUrl', returnUrl);
    }

    // Add origin for email redirects
    formData.append('origin', window.location.origin);

    const result = await signUp(prevState, formData);

    // Check for success and redirectTo properties (direct login case)
    if (
      result &&
      typeof result === 'object' &&
      'success' in result &&
      result.success &&
      'redirectTo' in result
    ) {
      // Use window.location for hard navigation to avoid stale state
      window.location.href = result.redirectTo as string;
      return null; // Return null to prevent normal form action completion
    }

    // Check if registration was successful but needs email verification
    if (result && typeof result === 'object' && 'message' in result) {
      const resultMessage = result.message as string;
      if (resultMessage.includes('Check your email')) {
        setRegistrationSuccess(true);

        // Update URL without causing a refresh
        const params = new URLSearchParams(window.location.search);
        params.set('message', resultMessage);

        const newUrl =
          window.location.pathname +
          (params.toString() ? '?' + params.toString() : '');

        window.history.pushState({ path: newUrl }, '', newUrl);

        return result;
      } else {
        toast.error('Sign up failed', {
          description: resultMessage,
          duration: 5000,
        });
        return {};
      }
    }

    return result;
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setForgotPasswordStatus({});

    if (!forgotPasswordEmail || !forgotPasswordEmail.includes('@')) {
      setForgotPasswordStatus({
        success: false,
        message: 'Please enter a valid email address',
      });
      return;
    }

    const formData = new FormData();
    formData.append('email', forgotPasswordEmail);
    formData.append('origin', window.location.origin);

    const result = await forgotPassword(null, formData);

    setForgotPasswordStatus(result);
  };

  const resetRegistrationSuccess = () => {
    setRegistrationSuccess(false);
    // Remove message from URL and set mode to signin
    const params = new URLSearchParams(window.location.search);
    params.delete('message');
    params.set('mode', 'signin');

    const newUrl =
      window.location.pathname +
      (params.toString() ? '?' + params.toString() : '');

    window.history.pushState({ path: newUrl }, '', newUrl);

    router.refresh();
  };

  // Show loading spinner while checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Registration success view
  if (registrationSuccess) {
    return (
      <div className="min-h-screen bg-[#EDEDED] flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center">
            <div className="bg-green-50 dark:bg-green-950/20 rounded-full p-4 mb-6 inline-flex">
              <MailCheck className="h-12 w-12 text-green-500 dark:text-green-400" />
            </div>

            <h1 className="text-3xl font-semibold text-foreground mb-4">
              Check your email
            </h1>

            <p className="text-muted-foreground mb-2">
              We've sent a confirmation link to:
            </p>

            <p className="text-lg font-medium mb-6">
              {registrationEmail || 'your email address'}
            </p>

            <div className="bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/50 rounded-lg p-4 mb-8">
              <p className="text-sm text-green-800 dark:text-green-400">
                Click the link in the email to activate your account. If you
                don't see the email, check your spam folder.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Link
                href="/"
                className="flex h-11 items-center justify-center px-6 text-center rounded-lg border border-border bg-background hover:bg-accent transition-colors"
              >
                Return to home
              </Link>
              <button
                onClick={resetRegistrationSuccess}
                className="flex h-11 items-center justify-center px-6 text-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Back to sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EDEDED] relative">
      <div className="flex min-h-screen items-center justify-center gap-8 px-4 sm:px-6 lg:px-0">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.6,
            ease: [0.4, 0, 0.2, 1],
            delay: 1.0,
          }}
          className="hidden lg:flex items-center justify-center relative overflow-hidden h-[600px] w-[600px]"
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src="/auth/login.png"
              alt="Login illustration"
              width={500}
              height={600}
              className="object-contain max-w-full h-full"
              priority
            />
          </div>
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 flex flex-col items-center z-10">
            <motion.div
              initial={{ opacity: 0, rotate: -10 }}
              animate={{ opacity: 1, rotate: 0 }}
              transition={{
                duration: 0.6,
                ease: [0.4, 0, 0.2, 1],
                delay: 1.2,
              }}
            >
              <Image
                src="/helium-agent.png"
                alt="Helium Logo"
                width={40}
                height={40}
                className="mb-2"
              />
            </motion.div>
            <motion.p
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.6,
                ease: [0.4, 0, 0.2, 1],
                delay: 1.4,
              }}
              className="text-[42px] text-white mb-1"
            >
              Helium
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                ease: [0.4, 0, 0.2, 1],
                delay: 1.6,
              }}
              className="text-[12px] text-white/90"
            >
              Autonomous Intelligence
            </motion.p>
          </div>
        </motion.div>
        <div className="flex flex-col items-center justify-center h-[600px] w-full max-w-[500px]">
          {/* Mobile Header - Only shows below 1024px */}
          <Link href="/">
            <div className="lg:hidden w-full mb-6 flex justify-center cursor-pointer">
              <div className="flex items-center gap-2">
                <Image
                  src="/helium-logo.png"
                  alt="Helium Logo"
                  width={40}
                  height={40}
                  className="mb-0"
                />
                {/* <p className="text-xl text-black">Helium</p> */}
              </div>
            </div>
          </Link>

          {/* Desktop Back Button - Only shows on 1024px and above */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.6,
              ease: [0.4, 0, 0.2, 1],
              delay: 1.6,
            }}
            className="hidden lg:block mb-6 w-full text-center"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-black transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.8,
              ease: [0.4, 0, 0.2, 1],
              delay: 0.8,
            }}
            layout
            className="w-full bg-white/77 rounded-[24px] p-6 sm:p-8"
          >
            <form className="space-y-3 mb-4">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-black"
                >
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Email address"
                  className="h-14 py-3 rounded-lg dark:bg-transparent dark:border-black/20 text-black placeholder:text-black/70"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-black"
                  >
                    Password
                  </label>
                  {!isSignUp && !isProduction && (
                    <button
                      type="button"
                      onClick={() => setForgotPasswordOpen(true)}
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Password"
                  className="h-14 py-3 rounded-lg dark:bg-transparent dark:border-black/20 text-black placeholder:text-black/70"
                  required
                />
              </div>
              {isSignUp && (
                <div className="space-y-2">
                  <label
                    htmlFor="confirmPassword"
                    className="text-sm font-medium text-black"
                  >
                    Confirm Password
                  </label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm password"
                    className="h-12 sm:h-14 py-3 rounded-lg dark:bg-transparent text-black placeholder:text-black/70 text-sm sm:text-base"
                    required
                  />
                </div>
              )}
              <div className="pt-2">
                <div className="relative">
                  <SubmitButton
                    formAction={isSignUp ? handleSignUp : handleSignIn}
                    className="w-full h-11 sm:h-12 bg-gradient-to-r from-helium-pink to-helium-teal text-white hover:opacity-90 transition-opacity rounded-lg text-sm sm:text-base"
                    pendingText={
                      isSignUp ? 'Creating account...' : 'Initiating...'
                    }
                  >
                    {isSignUp
                      ? 'Create account'
                      : 'Ready to Initiate Intelligence'}
                  </SubmitButton>
                  {/* {wasEmailLastMethod && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-black rounded-full border-2 border-background shadow-sm">
                      <div className="w-full h-full bg-black rounded-full animate-pulse" />
                    </div>
                  )} */}
                </div>
              </div>
            </form>

            {/* Social login section - only show if not in production */}
            {!isProduction && (
              <>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2  text-muted-foreground">
                      or continue with
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <GoogleSignIn returnUrl={returnUrl || undefined} />
                  <GitHubSignIn returnUrl={returnUrl || undefined} />
                </div>
              </>
            )}

            {/* Sign up/Sign in link - only show if not in production */}
            {!isProduction && (
              <div className="mt-4 text-center text-sm">
                <Link
                  href={
                    isSignUp
                      ? `/auth${returnUrl ? `?returnUrl=${returnUrl}` : ''}`
                      : `/auth?mode=signup${returnUrl ? `&returnUrl=${returnUrl}` : ''}`
                  }
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isSignUp
                    ? 'Already have an account? Sign in'
                    : "Don't have an account? Sign up"}
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      </div>
      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Reset Password</DialogTitle>
            </div>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your
              password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <Input
              id="forgot-password-email"
              type="email"
              placeholder="Email address"
              value={forgotPasswordEmail}
              onChange={(e) => setForgotPasswordEmail(e.target.value)}
              className="h-12 py-3 rounded-xl"
              required
            />
            {forgotPasswordStatus.message && (
              <div
                className={`p-3 rounded-md flex items-center gap-3 ${
                  forgotPasswordStatus.success
                    ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 text-green-800 dark:text-green-400'
                    : 'bg-destructive/10 border border-destructive/20 text-destructive'
                }`}
              >
                {forgotPasswordStatus.success ? (
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                )}
                <span className="text-sm">{forgotPasswordStatus.message}</span>
              </div>
            )}
            <DialogFooter className="gap-2">
              <button
                type="button"
                onClick={() => setForgotPasswordOpen(false)}
                className="h-10 px-4 border border-border bg-background hover:bg-accent transition-colors rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-md"
              >
                Send Reset Link
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <LoginFooter />
    </div>
  );
}

export default function Login() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
