import React, { useEffect, useState } from 'react';
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
    const [isExiting, setIsExiting] = useState(false);
    const timerRef = React.useRef<NodeJS.Timeout | null>(null);
    const exitTimerRef = React.useRef<NodeJS.Timeout | null>(null);

    // 토스트가 마운트되면 개별 타이머 시작
    useEffect(() => {
        // 각 토스트마다 독립적인 타이머 생성
        timerRef.current = setTimeout(() => {
            setIsExiting(true);
            // 애니메이션 완료 후 제거
            exitTimerRef.current = setTimeout(() => {
                onClose(id);
            }, 300);
        }, duration);

        // 컴포넌트가 언마운트되거나 의존성이 변경될 때 타이머 정리
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            if (exitTimerRef.current) {
                clearTimeout(exitTimerRef.current);
                exitTimerRef.current = null;
            }
        };
    }, []); // 빈 의존성 배열로 마운트 시에만 실행

    const handleClose = () => {
        // 수동 닫기 시 기존 타이머 정리
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (exitTimerRef.current) {
            clearTimeout(exitTimerRef.current);
            exitTimerRef.current = null;
        }
        
        setIsExiting(true);
        exitTimerRef.current = setTimeout(() => {
            onClose(id);
        }, 300); // 애니메이션 완료 후 제거
    };

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
            className={`glass-strong rounded-xl border p-4 shadow-lg flex items-center gap-3 ${isExiting ? 'animate-slide-out' : 'animate-slide-in'} ${getBackgroundColor()}`}
        >
            {getIcon()}
            <div className="text-sm font-medium text-[#333] flex-1 break-all whitespace-pre-line">{message}</div>
            <button
                onClick={handleClose}
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

    // 토스트 추가 시 유니크 ID 생성
    const addToast = React.useCallback((type: ToastType, message: string, duration?: number) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newToast = { id, type, message, duration };
        
        setToasts(prev => {
            // 동일한 메시지의 토스트가 이미 있는지 확인 (중복 방지)
            const isDuplicate = prev.some(toast => 
                toast.message === message && toast.type === type
            );
            
            if (isDuplicate) {
                return prev; // 중복된 메시지는 추가하지 않음
            }
            
            // 최대 5개의 토스트만 유지 (메모리 누수 방지)
            const newToasts = [...prev, newToast];
            if (newToasts.length > 5) {
                return newToasts.slice(-5); // 가장 오래된 토스트 제거
            }
            
            return newToasts;
        });
    }, []);

    // 토스트 제거
    const removeToast = React.useCallback((id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    // 모든 토스트 제거
    const clearAllToasts = React.useCallback(() => {
        setToasts([]);
    }, []);

    const success = React.useCallback((message: string, duration?: number) => 
        addToast('success', message, duration), [addToast]);
    const error = React.useCallback((message: string, duration?: number) => 
        addToast('error', message, duration), [addToast]);
    const warning = React.useCallback((message: string, duration?: number) => 
        addToast('warning', message, duration), [addToast]);
    const info = React.useCallback((message: string, duration?: number) => 
        addToast('info', message, duration), [addToast]);

    return {
        toasts,
        success,
        error,
        warning,
        info,
        removeToast,
        clearAllToasts
    };
}; 