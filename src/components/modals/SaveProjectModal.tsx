import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import OverwriteConfirmModal from './OverwriteConfirmModal';

interface SaveProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string) => void;
    existingProjects: string[];
}

const SaveProjectModal: React.FC<SaveProjectModalProps> = ({
    isOpen,
    onClose,
    onSave,
    existingProjects
}) => {
    const [projectName, setProjectName] = useState('');
    const [error, setError] = useState('');
    const [showOverwriteModal, setShowOverwriteModal] = useState(false);
    const [pendingSave, setPendingSave] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setProjectName('');
            setError('');
            setShowOverwriteModal(false);
            setPendingSave(false);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    const handleSave = () => {
        if (!projectName.trim()) {
            setError('Please enter a project name.');
            return;
        }

        if (existingProjects.includes(projectName.trim())) {
            setShowOverwriteModal(true);
            setPendingSave(true);
            return;
        }

        onSave(projectName.trim());
        onClose();
    };

    const handleOverwriteConfirm = () => {
        onSave(projectName.trim());
        setShowOverwriteModal(false);
        setPendingSave(false);
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title="Save Project"
            >
                <div className="mb-6">
                    <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-heading)' }}>Project Name:</label>
                    <input
                        type="text"
                        value={projectName}
                        onChange={(e) => {
                            setProjectName(e.target.value);
                            setError('');
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter project name"
                        className="w-full input-glass focus:outline-none"
                        style={{
                            borderColor: 'var(--accent-blue)',
                            color: 'var(--text-primary)'
                        }}
                        autoFocus
                    />
                    {error && (
                        <p className="text-sm mt-2 font-medium" style={{ color: 'var(--accent-red)' }}>{error}</p>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="btn-secondary"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="btn-primary"
                    >
                        Save
                    </button>
                </div>
            </Modal>

            {/* Overwrite Confirm Modal */}
            <OverwriteConfirmModal
                isOpen={showOverwriteModal}
                onClose={() => {
                    setShowOverwriteModal(false);
                    setPendingSave(false);
                }}
                onConfirm={handleOverwriteConfirm}
                projectName={projectName}
            />
        </>
    );
};

export default SaveProjectModal; 