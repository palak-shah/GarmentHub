import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const sendOtp = useMutation({
    mutationFn: () => authApi.sendOtp(phone),
    onSuccess: () => {
      setStep('otp');
      toast.success('OTP sent! (Use 123456)');
    },
    onError: () => toast.error('Failed to send OTP'),
  });

  const verifyOtp = useMutation({
    mutationFn: () => authApi.verifyOtp(phone, code),
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

        <div className="rounded-2xl bg-white p-6 shadow-xl">
          {step === 'phone' ? (
            <>
              <h2 className="mb-1 text-lg font-semibold">Login</h2>
              <p className="mb-6 text-sm text-gray-500">Enter your phone number to get started</p>
              <Input
                label="Phone Number"
                type="tel"
                placeholder="e.g. 9999900003"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoFocus
              />
              <Button
                className="mt-4 w-full"
                onClick={() => sendOtp.mutate()}
                loading={sendOtp.isPending}
                disabled={phone.length < 10}
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
                Enter the code sent to <strong>{phone}</strong>
              </p>
              <Input
                label="OTP Code"
                type="text"
                inputMode="numeric"
                placeholder="123456"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
              />
              <Button
                className="mt-4 w-full"
                onClick={() => verifyOtp.mutate()}
                loading={verifyOtp.isPending}
                disabled={code.length !== 6}
              >
                Verify & Login
              </Button>
              <button
                onClick={() => { setStep('phone'); setCode(''); }}
                className="mt-3 w-full text-center text-sm text-primary-600 hover:underline"
              >
                Change phone number
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
