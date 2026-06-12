interface FieldProps {
    label: string;
    error?: string;
    required?: boolean;
    children: React.ReactNode;
    hint?: string;
}
export declare function Field({ label, error, required, children, hint }: FieldProps): import("react").JSX.Element;
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: boolean;
}
export declare function Input({ className, error, ...props }: InputProps): import("react").JSX.Element;
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    error?: boolean;
    options: {
        value: string;
        label: string;
    }[];
    placeholder?: string;
}
export declare function Select({ className, error, options, placeholder, ...props }: SelectProps): import("react").JSX.Element;
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    error?: boolean;
}
export declare function Textarea({ className, error, ...props }: TextareaProps): import("react").JSX.Element;
export declare function Button({ children, className, variant, size, loading, ...props }: {
    children: React.ReactNode;
    className?: string;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>): import("react").JSX.Element;
export {};
//# sourceMappingURL=FormFields.d.ts.map