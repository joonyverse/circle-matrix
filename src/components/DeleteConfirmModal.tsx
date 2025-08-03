import React from 'react';
import { Modal } from './ui/Modal';
import { Trash2, AlertTriangle } from 'lucide-react';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    projectName: string;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    projectName
}) => {
    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Delete Project"
        >
            <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-red)' + '20' }}>
                        <AlertTriangle className="w-6 h-6" style={{ color: 'var(--accent-red)' }} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-heading)' }}>Delete Project</h3>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>This action cannot be undone.</p>
                    </div>
                </div>

                <div className="mb-6">
                    <p style={{ color: 'var(--text-primary)' }}>
                        Are you sure you want to delete <span className="font-semibold" style={{ color: 'var(--text-heading)' }}>"{projectName}"</span>?
                    </p>
                    <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                        All project settings and data will be permanently removed.
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 rounded-xl glass smooth-transition font-medium"
                        style={{ color: 'var(--text-heading)' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-1 px-4 py-2 rounded-xl smooth-transition font-medium flex items-center justify-center gap-2"
                        style={{
                            background: 'var(--accent-red)',
                            color: 'white'
                        }}
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default DeleteConfirmModal; 