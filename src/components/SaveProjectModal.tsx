import React, { useState, useEffect } from 'react';

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

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div
                className="bg-[#2a2a2a] rounded-lg shadow-xl border border-[#3a3a3a] w-96 font-mono text-sm"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="bg-[#1a1a1a] text-white p-3 border-b border-[#3a3a3a]">
                    <div className="flex justify-between items-center">
                        <h2 className="text-sm font-semibold text-[#e0e0e0]">Save Project</h2>
                        <button
                            onClick={onClose}
                            className="text-[#888] hover:text-[#e0e0e0] transition-colors p-1"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Modal Content */}
                <div className="p-4">
                    <div className="mb-4">
                        <label className="block text-[#e0e0e0] text-xs mb-2">Project Name:</label>
                        <input
                            type="text"
                            value={projectName}
                            onChange={(e) => {
                                setProjectName(e.target.value);
                                setError('');
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="Enter project name"
                            className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#3a3a3a] rounded text-[#e0e0e0] text-sm focus:outline-none focus:border-[#60a5fa] placeholder-[#666]"
                            autoFocus
                        />
                        {error && (
                            <p className="text-[#f87171] text-xs mt-1">{error}</p>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-[#3a1a1a] text-[#888] rounded hover:bg-[#4a2a2a] transition-colors text-xs"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-[#3a5a3a] text-[#4ade80] rounded hover:bg-[#4a6a4a] transition-colors text-xs"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SaveProjectModal; 