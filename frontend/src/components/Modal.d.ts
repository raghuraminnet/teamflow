interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}
export declare function Modal({ open, onClose, title, children, size }: ModalProps): import("react").JSX.Element | null;
interface ConfirmModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
}
export declare function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel, danger }: ConfirmModalProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=Modal.d.ts.map