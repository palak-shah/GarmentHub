import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

function normalizePhone(v: string) {
  return v.replace(/\s/g, '');
}

function normalizeOtp(v: string) {
  return v.replace(/\s/g, '').replace(/\D/g, '').slice(0, 6);
}

export default function Login() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const navigate = useNavigate();
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
      toast.success('OTP sent! (Use 123456)');
    },
    onError: () => toast.error('Failed to send OTP'),
  });

  const verifyOtp = useMutation({
    mutationFn: () => authApi.verifyOtp(phoneClean, code),
    onSuccess: (data) => {
      setAuth(data.token, data.user);
      toast.success('Welcome to GarmentHub!');
      const role = data.user.role;
      if (role === 'VENDOR') navigate('/vendor', { replace: true });
      else if (role === 'ADMIN') navigate('/admin', { replace: true });
      else navigate('/', { replace: true });
    },
    onError: () => toast.error('Invalid OTP'),
  });

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (step === 'phone') phoneRef.current?.focus();
      else codeRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [step]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const ae = document.activeElement;
      if (ae instanceof HTMLInputElement || ae instanceof HTMLTextAreaElement) return;
      if (ae instanceof HTMLButtonElement || ae instanceof HTMLSelectElement) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const pClean = normalizePhone(phone);
      const sendOk = pClean.length >= 10;
      const verifyOk = code.length === 6;

      if (e.key === 'Enter') {
        e.preventDefault();
        if (step === 'phone' && sendOk && !sendOtp.isPending) sendOtp.mutate();
        else if (step === 'otp' && verifyOk && !verifyOtp.isPending) verifyOtp.mutate();
        return;
      }

      if (e.key.length !== 1) return;

      if (step === 'phone' && /\d/.test(e.key)) {
        e.preventDefault();
        phoneRef.current?.focus();
        setPhone((prev) => normalizePhone(prev + e.key).slice(0, 15));
        return;
      }

      if (step === 'otp' && /\d/.test(e.key)) {
        e.preventDefault();
        codeRef.current?.focus();
        setCode((prev) => normalizeOtp(prev + e.key));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [step, phone, code, sendOtp.isPending, verifyOtp.isPending, sendOtp, verifyOtp]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 text-2xl font-bold text-white shadow-lg">
            G
          </div>
          <h1 className="text-2xl font-bold text-gray-900">GarmentHub</h1>
          <p className="mt-1 text-sm text-gray-600">B2B Garment Trading Platform</p>
        </div>

        <form
          className="rounded-2xl bg-white p-6 shadow-xl"
          onSubmit={(e) => {
            e.preventDefault();
            if (step === 'phone') {
              if (canSendOtp && !sendOtp.isPending) sendOtp.mutate();
            } else if (canVerify && !verifyOtp.isPending) {
              verifyOtp.mutate();
            }
          }}
        >
          {step === 'phone' ? (
            <>
              <h2 className="mb-1 text-lg font-semibold">Login</h2>
              <p className="mb-6 text-sm text-gray-500">Enter your phone number to get started</p>
              <Input
                ref={phoneRef}
                label="Phone Number"
                type="tel"
                placeholder="e.g. 9999900003"
                value={phone}
                onChange={(e) => setPhone(normalizePhone(e.target.value).slice(0, 15))}
                autoComplete="tel"
                autoFocus
              />
              <Button
                type="submit"
                className="mt-4 w-full"
                loading={sendOtp.isPending}
                disabled={!canSendOtp}
              >
                Send OTP
              </Button>
              <div className="mt-4 rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
                <strong>Demo accounts:</strong><br />
                Customer: 9999900003 / 9999900004<br />
                Vendor: 9999900001 / 9999900002<br />
                Admin: 9999900000<br />
                OTP for all: 123456
              </div>
            </>
          ) : (
            <>
              <h2 className="mb-1 text-lg font-semibold">Verify OTP</h2>
              <p className="mb-6 text-sm text-gray-500">
                Enter the code sent to <strong>{phoneClean}</strong>
              </p>
              <Input
                ref={codeRef}
                label="OTP Code"
                type="text"
                inputMode="numeric"
                placeholder="123456"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(normalizeOtp(e.target.value))}
                autoComplete="one-time-code"
                autoFocus
              />
              <Button
                type="submit"
                className="mt-4 w-full"
                loading={verifyOtp.isPending}
                disabled={!canVerify}
              >
                Verify & Login
              </Button>
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setCode('');
                }}
                className="mt-3 w-full text-center text-sm text-primary-600 hover:underline"
              >
                Change phone number
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
