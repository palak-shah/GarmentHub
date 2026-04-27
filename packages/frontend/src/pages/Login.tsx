import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Store, UserCheck, ShoppingBag } from 'lucide-react';
import { authApi } from '@/api/auth.api';
import { networkApi } from '@/api/network.api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

function normalizePhone(v: string) {
  return v.replace(/\s/g, '');
}

function normalizeOtp(v: string) {
  return v.replace(/\s/g, '').replace(/\D/g, '').slice(0, 6);
}

type SelectedRole = 'CUSTOMER' | 'VENDOR' | 'TRADER';

const ROLES: { value: SelectedRole; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: 'CUSTOMER', label: 'Buyer', desc: 'I buy garments', icon: <ShoppingBag className="h-7 w-7" /> },
  { value: 'TRADER', label: 'Trader', desc: 'I trade garments', icon: <UserCheck className="h-7 w-7" /> },
  { value: 'VENDOR', label: 'Supplier', desc: 'I supply garments', icon: <Store className="h-7 w-7" /> },
];

export default function Login() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp' | 'role'>('phone');
  const [selectedRole, setSelectedRole] = useState<SelectedRole>('CUSTOMER');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('invite');
  const setAuth = useAuthStore((s) => s.setAuth);
  const phoneRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  const phoneClean = normalizePhone(phone);
  const canSendOtp = phoneClean.length >= 10;
  const canVerify = code.length === 6;

  const sendOtp = useMutation({
    mutationFn: () => authApi.sendOtp(phoneClean),
    onSuccess: () => {
      setStep('otp');
      toast.success('OTP sent!');
    },
    onError: () => toast.error('Failed to send OTP'),
  });

  const verifyOtp = useMutation({
    mutationFn: (vars: { role?: SelectedRole } = {}) => authApi.verifyOtp(phoneClean, code, vars.role),
    onSuccess: async (data) => {
      if (data.isNewUser && step === 'otp') {
        setStep('role');
        return;
      }
      setAuth(data.token, data.user);

      // Auto-connect via invite code if present
      if (inviteCode) {
        try {
          const connected = await networkApi.connectViaInvite(inviteCode);
          toast.success(`Connected with ${connected.businessName || connected.name}!`);
        } catch {
          // Silently ignore if invite code is invalid/expired
        }
      }

      toast.success('Welcome!');
      const r = data.user.role;
      if (r === 'VENDOR') navigate('/vendor', { replace: true });
      else if (r === 'ADMIN') navigate('/admin', { replace: true });
      else navigate('/', { replace: true });
    },
    onError: () => toast.error('Invalid OTP'),
  });

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (step === 'phone') phoneRef.current?.focus();
      else if (step === 'otp') codeRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [step]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 text-2xl font-bold text-white shadow-lg">
            G
          </div>
          <h1 className="text-2xl font-bold text-gray-900">GarmentHub</h1>
        </div>

        <form
          className="rounded-2xl bg-white p-6 shadow-xl"
          onSubmit={(e) => {
            e.preventDefault();
            if (step === 'phone' && canSendOtp && !sendOtp.isPending) sendOtp.mutate();
            else if (step === 'otp' && canVerify && !verifyOtp.isPending) verifyOtp.mutate({});
          }}
        >
          {step === 'phone' && (
            <>
              <h2 className="mb-6 text-center text-lg font-semibold">Enter your phone number</h2>
              <Input
                ref={phoneRef}
                type="tel"
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(normalizePhone(e.target.value).slice(0, 15))}
                autoComplete="tel"
                autoFocus
              />
              <Button
                type="submit"
                className="mt-4 w-full"
                size="lg"
                loading={sendOtp.isPending}
                disabled={!canSendOtp}
              >
                Get OTP
              </Button>
              {inviteCode && (
                <div className="mt-4 rounded-lg bg-primary-50 border border-primary-200 p-3 text-xs text-primary-700">
                  You've been invited! Sign in to connect automatically.
                </div>
              )}
              <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
                <strong>Try:</strong> Buyer 9999900003 · Vendor 9999900001 · Trader 9999900005 · OTP: 123456
              </div>
            </>
          )}

          {step === 'otp' && (
            <>
              <h2 className="mb-2 text-center text-lg font-semibold">Enter OTP</h2>
              <p className="mb-6 text-center text-sm text-gray-500">{phoneClean}</p>
              <Input
                ref={codeRef}
                type="text"
                inputMode="numeric"
                placeholder="6-digit code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(normalizeOtp(e.target.value))}
                autoComplete="one-time-code"
                autoFocus
              />
              <Button
                type="submit"
                className="mt-4 w-full"
                size="lg"
                loading={verifyOtp.isPending}
                disabled={!canVerify}
              >
                Login
              </Button>
              <button
                type="button"
                onClick={() => { setStep('phone'); setCode(''); }}
                className="mt-3 w-full text-center text-sm text-gray-500 active:text-primary-600 min-h-[44px]"
              >
                Change number
              </button>
            </>
          )}

          {step === 'role' && (
            <>
              <h2 className="mb-5 text-center text-lg font-semibold">I am a...</h2>
              <div className="space-y-3">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setSelectedRole(r.value)}
                    className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 min-h-[72px] text-left ${
                      selectedRole === r.value
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className={selectedRole === r.value ? 'text-primary-600' : 'text-gray-400'}>
                      {r.icon}
                    </div>
                    <div>
                      <p className="text-base font-bold text-gray-900">{r.label}</p>
                      <p className="text-sm text-gray-500">{r.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              <Button
                type="button"
                className="mt-5 w-full"
                size="lg"
                loading={verifyOtp.isPending}
                onClick={() => verifyOtp.mutate({ role: selectedRole })}
              >
                Continue
              </Button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
