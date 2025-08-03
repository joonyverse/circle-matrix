import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';

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

    useEffect(() => {
        if (isOpen) {
            setProjectName('');
            setError('');
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
            if (!confirm(`Project "${projectName}" already exists. Overwrite?`)) {
                return;
            }
        }

        onSave(projectName.trim());
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
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Save Project"
        >
            <div className="mb-6">
                <label className="block text-[#007AFF] text-sm font-medium mb-3">Project Name:</label>
                <input
                    type="text"
                    value={projectName}
                    onChange={(e) => {
                        setProjectName(e.target.value);
                        setError('');
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter project name"
                    className="w-full input-glass bg-white focus:outline-none focus:border-[#007AFF] placeholder-[#999]"
                    autoFocus
                />
                {error && (
                    <p className="text-[#FF3B30] text-sm mt-2 font-medium">{error}</p>
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
    );
};

export default SaveProjectModal; 