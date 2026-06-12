import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
const SIZE_CLASSES = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
};
export function Modal({ open, onClose, title, children, size = 'md' }) {
    const ref = useRef(null);
    useEffect(() => {
        if (!open)
            return;
        const handleKey = (e) => { if (e.key === 'Escape')
            onClose(); };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [open, onClose]);
    if (!open)
        return null;
    return (_jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center", children: [_jsx("div", { className: "fixed inset-0 bg-black/40 backdrop-blur-sm", onClick: onClose }), _jsxs("div", { ref: ref, className: clsx('relative bg-white rounded-2xl shadow-2xl w-full mx-4 max-h-[90vh] overflow-y-auto', SIZE_CLASSES[size]), children: [title && (_jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900", children: title }), _jsx("button", { onClick: onClose, className: "p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600", children: _jsx(X, { size: 18 }) })] })), _jsx("div", { className: "p-6", children: children })] })] }));
}
export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger }) {
    return (_jsxs(Modal, { open: open, onClose: onClose, title: title, size: "sm", children: [_jsx("p", { className: "text-gray-600 mb-6", children: message }), _jsxs("div", { className: "flex gap-3 justify-end", children: [_jsx("button", { onClick: onClose, className: "px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200", children: "Cancel" }), _jsx("button", { onClick: () => { onConfirm(); onClose(); }, className: clsx('px-4 py-2 rounded-lg font-medium text-white', danger ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-500 hover:bg-brand-600'), children: confirmLabel })] })] }));
}
