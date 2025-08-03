import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
    onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ id, type, message, duration = 3000, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(id);
        }, duration);

        return () => clearTimeout(timer);
    }, [id, duration, onClose]);

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle className="w-5 h-5 text-[#34C759]" />;
            case 'error':
                return <AlertCircle className="w-5 h-5 text-[#FF3B30]" />;
            case 'warning':
                return <AlertCircle className="w-5 h-5 text-[#FF9500]" />;
            case 'info':
                return <Info className="w-5 h-5 text-[#007AFF]" />;
            default:
                return <Info className="w-5 h-5 text-[#007AFF]" />;
        }
    };

    const getBackgroundColor = () => {
        switch (type) {
            case 'success':
                return 'bg-[#34C759]/10 border-[#34C759]/20';
            case 'error':
                return 'bg-[#FF3B30]/10 border-[#FF3B30]/20';
            case 'warning':
                return 'bg-[#FF9500]/10 border-[#FF9500]/20';
            case 'info':
                return 'bg-[#007AFF]/10 border-[#007AFF]/20';
            default:
                return 'bg-[#007AFF]/10 border-[#007AFF]/20';
        }
    };

    return (
        <div
            className={`glass-strong rounded-xl border p-4 shadow-lg flex items-center gap-3 animate-slide-in ${getBackgroundColor()}`}
        >
            {getIcon()}
            <div className="text-sm font-medium text-[#333] flex-1 break-all whitespace-pre-line">{message}</div>
            <button
                onClick={() => onClose(id)}
                className="text-[#666] hover:text-[#333] smooth-transition p-1 rounded-lg hover:bg-white/20"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

interface ToastContainerProps {
    toasts: Array<{
        id: string;
        type: ToastType;
        message: string;
        duration?: number;
    }>;
    onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
    return (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    id={toast.id}
                    type={toast.type}
                    message={toast.message}
                    duration={toast.duration}
                    onClose={onClose}
                />
            ))}
        </div>
    );
};

// Toast 관리 훅
export const useToast = () => {
    const [toasts, setToasts] = React.useState<Array<{
        id: string;
        type: ToastType;
        message: string;
        duration?: number;
    }>>([]);

    const addToast = (type: ToastType, message: string, duration?: number) => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, type, message, duration }]);
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    const success = (message: string, duration?: number) => addToast('success', message, duration);
    const error = (message: string, duration?: number) => addToast('error', message, duration);
    const warning = (message: string, duration?: number) => addToast('warning', message, duration);
    const info = (message: string, duration?: number) => addToast('info', message, duration);

    return {
        toasts,
        success,
        error,
        warning,
        info,
        removeToast
    };
}; 