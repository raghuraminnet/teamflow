import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Button, Field, Input } from '@/components/FormFields';
import { CheckSquare } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.register({ name, email, password });
      setAuth(data.user, data.accessToken, data.refreshToken);
      navigate(data.user.role === 'admin' ? '/admin' : '/team');
    } catch (err: any) {
      setError(err.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-500 mb-4">
            <CheckSquare size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">TeamFlow</h1>
          <p className="text-gray-500 text-sm mt-1">Create your workspace</p>
        </div>
        <form onSubmit={handleRegister} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-lg">{error}</div>}
          <Field label="Full Name" required><Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required /></Field>
          <Field label="Email" required><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required /></Field>
          <Field label="Password" required><Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" required /></Field>
          <Button type="submit" loading={loading} className="w-full justify-center">Create Account</Button>
        </form>
      </div>
    </div>
  );
}