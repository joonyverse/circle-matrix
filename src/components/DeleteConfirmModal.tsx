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
                    <div className="flex-shrink-0 w-12 h-12 bg-[#FF3B30]/10 rounded-full flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-[#FF3B30]" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-[#333]">Delete Project</h3>
                        <p className="text-sm text-[#666]">This action cannot be undone.</p>
                    </div>
                </div>

                <div className="mb-6">
                    <p className="text-[#333]">
                        Are you sure you want to delete <span className="font-semibold text-[#007AFF]">"{projectName}"</span>?
                    </p>
                    <p className="text-sm text-[#666] mt-2">
                        All project settings and data will be permanently removed.
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 rounded-xl glass text-[#007AFF] hover:bg-white/15 smooth-transition font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-1 px-4 py-2 rounded-xl bg-[#FF3B30] text-white hover:bg-[#D70015] smooth-transition font-medium flex items-center justify-center gap-2"
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