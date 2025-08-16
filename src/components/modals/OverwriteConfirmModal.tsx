import React from 'react';
import { Modal } from '../ui/Modal';
import { AlertTriangle, Save } from 'lucide-react';

interface OverwriteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    projectName: string;
}

const OverwriteConfirmModal: React.FC<OverwriteConfirmModalProps> = ({
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
            title="Overwrite Project"
        >
            <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-orange)' + '20' }}>
                        <AlertTriangle className="w-6 h-6" style={{ color: 'var(--accent-orange)' }} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-heading)' }}>Project Already Exists</h3>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>This will replace the existing project.</p>
                    </div>
                </div>

                <div className="mb-6">
                    <p style={{ color: 'var(--text-primary)' }}>
                        A project named <span className="font-semibold" style={{ color: 'var(--text-heading)' }}>"{projectName}"</span> already exists.
                    </p>
                    <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                        Do you want to overwrite it? The existing project settings will be replaced.
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
                            background: 'var(--accent-blue)',
                            color: 'white'
                        }}
                    >
                        <Save className="w-4 h-4" />
                        Overwrite
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default OverwriteConfirmModal; 