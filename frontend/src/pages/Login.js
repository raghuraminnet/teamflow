import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Button, Field, Input } from '@/components/FormFields';
import { CheckSquare } from 'lucide-react';
export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { setAuth } = useAuthStore();
    const navigate = useNavigate();
    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await api.login({ email, password });
            setAuth(data.user, data.accessToken, data.refreshToken);
            navigate(data.user.role === 'admin' ? '/admin' : '/team');
        }
        catch (err) {
            setError(err.message ?? 'Login failed');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: "min-h-screen bg-gray-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "w-full max-w-sm", children: [_jsxs("div", { className: "text-center mb-8", children: [_jsx("div", { className: "inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-500 mb-4", children: _jsx(CheckSquare, { size: 22, className: "text-white" }) }), _jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "TeamFlow" }), _jsx("p", { className: "text-gray-500 text-sm mt-1", children: "Sign in to your workspace" })] }), _jsxs("form", { onSubmit: handleLogin, className: "bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4", children: [error && (_jsx("div", { className: "bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-lg", children: error })), _jsx(Field, { label: "Email", required: true, children: _jsx(Input, { type: "email", value: email, onChange: e => setEmail(e.target.value), placeholder: "you@example.com", required: true }) }), _jsx(Field, { label: "Password", required: true, children: _jsx(Input, { type: "password", value: password, onChange: e => setPassword(e.target.value), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", required: true }) }), _jsx(Button, { type: "submit", loading: loading, className: "w-full justify-center", children: "Sign in" })] })] }) }));
}
