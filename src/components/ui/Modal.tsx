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
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
            onClick={onClose}
        >
            <div
                className={`bg-white rounded-2xl shadow-2xl border border-gray-200 ${maxWidth} ${maxHeight} overflow-hidden font-medium text-sm animate-fade-in`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="bg-gray-50 text-[#007AFF] p-4 border-b border-gray-200 rounded-t-2xl">
                    <div className="flex justify-between items-center">
                        <h2 className="text-base font-semibold text-[#007AFF]">{title}</h2>
                        <button
                            onClick={onClose}
                            className="text-[#007AFF] hover:text-[#0056CC] smooth-transition p-2 rounded-xl hover:bg-white/10"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Modal Content */}
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}; 