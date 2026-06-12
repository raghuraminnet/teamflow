import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { clsx } from 'clsx';
export function Field({ label, error, required, children, hint }) {
    return (_jsxs("div", { className: "space-y-1.5", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: [label, required && _jsx("span", { className: "text-red-500 ml-0.5", children: "*" })] }), children, hint && !error && _jsx("p", { className: "text-xs text-gray-400", children: hint }), error && _jsx("p", { className: "text-xs text-red-500", children: error })] }));
}
export function Input({ className, error, ...props }) {
    return (_jsx("input", { ...props, className: clsx('w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors', error
            ? 'border-red-300 bg-red-50 focus:border-red-500'
            : 'border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100', className) }));
}
export function Select({ className, error, options, placeholder, ...props }) {
    return (_jsxs("select", { ...props, className: clsx('w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors appearance-none bg-white', error
            ? 'border-red-300 bg-red-50 focus:border-red-500'
            : 'border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100', className), children: [placeholder && _jsx("option", { value: "", children: placeholder }), options.map(o => _jsx("option", { value: o.value, children: o.label }, o.value))] }));
}
export function Textarea({ className, error, ...props }) {
    return (_jsx("textarea", { ...props, rows: props.rows ?? 3, className: clsx('w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors resize-none', error
            ? 'border-red-300 bg-red-50 focus:border-red-500'
            : 'border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100', className) }));
}
export function Button({ children, className, variant = 'primary', size = 'md', loading, ...props }) {
    const variants = {
        primary: 'bg-brand-500 hover:bg-brand-600 text-white shadow-sm',
        secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm',
        danger: 'bg-red-500 hover:bg-red-600 text-white shadow-sm',
        ghost: 'hover:bg-gray-100 text-gray-600',
    };
    const sizes = {
        sm: 'px-3 py-1.5 text-sm rounded-lg',
        md: 'px-4 py-2 text-sm rounded-lg',
        lg: 'px-5 py-2.5 text-base rounded-xl',
    };
    return (_jsxs("button", { ...props, disabled: loading || props.disabled, className: clsx('font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2', variants[variant], sizes[size], className), children: [loading && (_jsxs("svg", { className: "animate-spin h-4 w-4", viewBox: "0 0 24 24", fill: "none", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" })] })), children] }));
}
