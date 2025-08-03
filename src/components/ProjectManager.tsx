import React, { useState, useEffect } from 'react';
import { Share2 } from 'lucide-react';
import { ToastType } from './ui/Toast';

interface Project {
  name: string;
  settings: Record<string, unknown>;
  timestamp: number;
}

interface ProjectManagerProps {
  projects: Project[];
  activeProject: string | null;
  onSaveProject: (name: string) => Project[];
  onLoadProject: (name: string) => Project | null;
  onDeleteProject: (name: string) => Project[];
  onRenameProject: (oldName: string, newName: string) => Project[];
  onSaveToActiveProject: () => void;
  onOpenSaveModal: () => void;
  onClose: () => void;
  onShareProject?: (settings: Record<string, unknown>) => void;
  onShowProjectDetails: (project: Project) => void;
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
  };
}

const ProjectManager: React.FC<ProjectManagerProps> = ({
  projects,
  activeProject,
  onSaveProject,
  onLoadProject,
  onDeleteProject,
  onRenameProject,
  onSaveToActiveProject,
  onOpenSaveModal,
  onClose,
  onShareProject,
  onShowProjectDetails,
  toast
}) => {
  const [currentProjects, setCurrentProjects] = useState<Project[]>(projects);

  // projects prop이 변경될 때마다 currentProjects 업데이트
  useEffect(() => {
    setCurrentProjects(projects);
  }, [projects]);

  const handleLoadProject = (name: string) => {
    console.log('🎯 ProjectManager: Loading project:', name);
    try {
      toast.success(`Loading project "${name}"...`);
      const project = onLoadProject(name);
      console.log('🎯 ProjectManager: Load result:', project ? 'success' : 'failed');
      if (project) {
        toast.success(`Project "${name}" loaded successfully.`);
      } else {
        toast.error('Failed to load project.');
      }
    } catch (error) {
      console.error('❌ ProjectManager: Error loading project:', error);
      toast.error('Error loading project.');
    }
  };

  const handleDeleteProject = (name: string) => {
    if (confirm(`Delete project "${name}"?`)) {
      try {
        const updatedProjects = onDeleteProject(name);
        setCurrentProjects(updatedProjects);
        toast.success(`Project "${name}" deleted successfully.`);
      } catch {
        toast.error('Error deleting project.');
      }
    }
  };

  const handleShowProjectDetails = (project: Project) => {
    onShowProjectDetails(project);
  };

  const handleShareProject = (project: Project) => {
    if (onShareProject) {
      onShareProject(project.settings);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US');
  };

  return (
    <div className="glass-strong border-r border-white/20 shadow-xl font-medium text-sm w-80 h-full overflow-hidden flex flex-col animate-slide-in">
      {/* Header */}
      <div className="glass-weak text-[#007AFF] p-4 border-b border-white/20 flex-shrink-0">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-semibold text-[#007AFF]">Project Manager</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-[#007AFF] hover:text-[#0056CC] smooth-transition p-2 rounded-xl hover:bg-white/10"
              title="Close Project Manager"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-white/10 glass-weak rounded-2xl space-y-3">
        {/* Save Buttons */}
        <div className="space-y-3 mb-4">
          <button
            onClick={onOpenSaveModal}
            className="w-full h-10 px-4 py-3 rounded-2xl shadow-md smooth-transition flex items-center justify-center gap-2 text-sm font-medium btn-primary"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Save As New
          </button>

          <button
            onClick={onSaveToActiveProject}
            disabled={!activeProject}
            className={`w-full h-10 px-4 py-3 rounded-2xl shadow-md smooth-transition flex items-center justify-center gap-2 text-sm font-medium ${activeProject
              ? 'bg-[#007AFF] text-white hover:bg-[#0056CC] hover:scale-[1.02] shadow-lg'
              : 'glass-weak text-[#666] cursor-not-allowed'
              }`}
            title={activeProject ? `Save to active project: ${activeProject}` : 'No active project'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            {activeProject ? `Save to Active: ${activeProject}` : 'Save to Active (None)'}
          </button>
        </div>

        {/* Project List */}
        <div className="space-y-3">
          {currentProjects.length === 0 ? (
            <div className="glass-strong rounded-2xl p-8 text-center text-[#666] shadow-md flex flex-col items-center">
              <div className="mb-2 text-3xl">🗂️</div>
              <div className="font-medium">No saved projects</div>
              <div className="text-xs text-[#999] mt-1">Create your first project to get started</div>
            </div>
          ) : (
            currentProjects.map((project) => (
              <div
                key={project.name}
                className={`glass-strong rounded-2xl shadow-2xl border border-white/20 p-3 flex flex-col gap-1 transition-all duration-200 cursor-pointer hover:scale-[1.01] hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:border-[#007AFF]/40 ${project.name === activeProject ? 'border-2 border-[#007AFF] bg-[#007AFF]/5' : ''}`}
                onClick={() => handleShowProjectDetails(project)}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1 min-w-0">
                    <h3 className="font-semibold text-[#007AFF] truncate text-sm">{project.name}</h3>
                    {project.name === activeProject && (
                      <span className="text-xs bg-[#007AFF]/10 text-[#007AFF] px-1.5 py-0.5 rounded-full font-medium">Active</span>
                    )}
                  </div>
                  <span className="text-xs text-[#999]">{formatDate(project.timestamp)}</span>
                </div>
                <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => handleLoadProject(project.name)}
                    className="p-1.5 text-[#007AFF] hover:bg-[#007AFF]/10 rounded-xl smooth-transition shadow-sm"
                    title="Load project"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleShareProject(project)}
                    className="p-1.5 text-[#FF9500] hover:bg-[#FF9500]/10 rounded-xl smooth-transition shadow-sm"
                    title="Share project"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteProject(project.name)}
                    className="p-1.5 text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded-xl smooth-transition shadow-sm"
                    title="Delete project"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectManager;
