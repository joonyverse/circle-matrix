import React from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidth?: string;
    maxHeight?: string;
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    maxWidth = 'w-96',
    maxHeight = 'max-h-[80vh]'
}) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in modal-backdrop"
            onClick={onClose}
        >
            <div
                className={`rounded-2xl shadow-2xl border ${maxWidth} ${maxHeight} overflow-hidden font-medium text-sm animate-fade-in`}
                style={{
                    background: 'var(--modal-bg)',
                    borderColor: 'var(--modal-border)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="p-4 border-b rounded-t-2xl" style={{
                    background: 'var(--modal-header-bg)',
                    borderColor: 'var(--modal-border)',
                    color: 'var(--text-heading)'
                }}>
                    <div className="flex justify-between items-center">
                        <h2 className="text-base font-semibold" style={{ color: 'var(--text-heading)' }}>{title}</h2>
                        <button
                            onClick={onClose}
                            className="smooth-transition p-2 rounded-xl hover:bg-white/10"
                            style={{ color: 'var(--text-heading)' }}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Modal Content */}
                <div className="p-6" style={{ color: 'var(--text-primary)' }}>
                    {children}
                </div>
            </div>
        </div>
    );
}; 