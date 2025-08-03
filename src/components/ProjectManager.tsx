import React, { useState, useEffect } from 'react';

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
  onShowProjectDetails
}) => {
  const [message, setMessage] = useState('');
  const [currentProjects, setCurrentProjects] = useState<Project[]>(projects);



  // projects prop이 변경될 때마다 currentProjects 업데이트
  useEffect(() => {
    setCurrentProjects(projects);
  }, [projects]);



  const handleLoadProject = (name: string) => {
    console.log('🎯 ProjectManager: Loading project:', name);
    try {
      setMessage(`Loading project "${name}"...`);
      const project = onLoadProject(name);
      console.log('🎯 ProjectManager: Load result:', project ? 'success' : 'failed');
      if (project) {
        setMessage(`Project "${name}" loaded successfully.`);
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to load project.');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('❌ ProjectManager: Error loading project:', error);
      setMessage('Error loading project.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleDeleteProject = (name: string) => {
    if (confirm(`Delete project "${name}"?`)) {
      try {
        const updatedProjects = onDeleteProject(name);
        setCurrentProjects(updatedProjects);
        setMessage(`Project "${name}" deleted successfully.`);
        setTimeout(() => setMessage(''), 3000);
      } catch {
        setMessage('Error deleting project.');
        setTimeout(() => setMessage(''), 3000);
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

      {/* Message */}
      {message && (
        <div className="px-4 py-3 glass-weak border-b border-white/20 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#34C759] rounded-full animate-pulse"></div>
            <p className="text-sm text-[#34C759] font-medium">{message}</p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 flex-1 overflow-y-auto">
        {/* Save Buttons */}
        <div className="space-y-3 mb-4">
          <button
            onClick={onOpenSaveModal}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Save As New Project
          </button>

          <button
            onClick={onSaveToActiveProject}
            disabled={!activeProject}
            className={`w-full px-4 py-3 rounded-2xl smooth-transition flex items-center justify-center gap-2 text-sm font-medium ${activeProject
              ? 'glass text-[#007AFF] hover:bg-white/15 hover:scale-[1.02]'
              : 'glass-weak text-[#666] cursor-not-allowed'
              }`}
            title={activeProject ? `Save to active project: ${activeProject}` : 'No active project'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {activeProject ? `Save to Active Project: ${activeProject}` : 'Save to Active Project (None)'}
          </button>
        </div>

        {/* Project List */}
        <div className="space-y-2 overflow-y-auto scrollbar-hide">
          {currentProjects.length === 0 ? (
            <div className="text-center py-8 text-[#666]">
              <svg className="w-10 h-10 mx-auto mb-2 text-[#999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-medium">No saved projects</p>
              <p className="text-xs text-[#999] mt-1">Create your first project to get started</p>
            </div>
          ) : (
            currentProjects.map((project) => (
              <div
                key={project.name}
                className={`glass rounded-xl p-3 smooth-transition cursor-pointer hover:scale-[1.01] ${project.name === activeProject
                  ? 'border-2 border-[#007AFF] bg-[#007AFF]/5' // 활성 프로젝트 강조 - 파란색으로 변경
                  : 'border border-white/20 hover:bg-white/10'
                  }`}
                onClick={() => handleShowProjectDetails(project)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <h3 className="font-semibold text-[#007AFF] truncate text-sm">{project.name}</h3>
                    {project.name === activeProject && (
                      <span className="text-[#007AFF] text-xs bg-[#007AFF]/10 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleLoadProject(project.name)}
                      className="p-1.5 text-[#007AFF] hover:bg-[#007AFF]/10 rounded-lg smooth-transition"
                      title="Load project"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleShareProject(project)}
                      className="p-1.5 text-[#FF9500] hover:bg-[#FF9500]/10 rounded-lg smooth-transition"
                      title="Share project"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteProject(project.name)}
                      className="p-1.5 text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded-lg smooth-transition"
                      title="Delete project"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-xs text-[#666] font-medium mt-1">
                  Saved: {formatDate(project.timestamp)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectManager;
