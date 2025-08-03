import React, { useState, useEffect } from 'react';
import { Share2, Edit3, Search, ChevronLeft } from 'lucide-react';
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
  onDeleteProjectRequest: (projectName: string) => void;
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
  onDeleteProjectRequest,
  toast
}) => {
  const [currentProjects, setCurrentProjects] = useState<Project[]>(projects);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  // projects prop이 변경될 때마다 currentProjects 업데이트
  useEffect(() => {
    setCurrentProjects(projects);
  }, [projects]);

  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleLoadProject = (name: string) => {
    console.log('🎯 ProjectManager: handleLoadProject called with:', name);

    // 이미 로딩 중이거나 같은 프로젝트를 클릭한 경우 무시
    if (isLoading || name === activeProject) {
      console.log('🎯 ProjectManager: Ignoring click - isLoading:', isLoading, 'activeProject:', activeProject);
      return;
    }

    setIsLoading(name);
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
    } finally {
      // 로딩 완료 후 약간의 지연을 두어 연속 클릭 방지
      setTimeout(() => {
        setIsLoading(null);
      }, 300);
    }
  };

  const handleDeleteProject = (name: string) => {
    onDeleteProjectRequest(name);
  };

  const handleStartEdit = (projectName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('🎯 ProjectManager: Starting edit for project:', projectName);
    setEditingProject(projectName);
    setEditingName(projectName);
  };

  const handleSaveEdit = (oldName: string) => {
    if (editingName.trim() && editingName !== oldName) {
      try {
        const updatedProjects = onRenameProject(oldName, editingName.trim());
        setCurrentProjects(updatedProjects);
        toast.success(`Project renamed to "${editingName.trim()}"`);
      } catch (error) {
        toast.error('Error renaming project.');
      }
    }
    setEditingProject(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingProject(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, oldName: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(oldName);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
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
    <>
      <div className="glass-strong rounded-2xl shadow-2xl border border-white/20 font-medium text-sm w-80 max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col animate-slide-in scrollbar-hide" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
        {/* Header */}
        <div className="p-4 border-b border-white/20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="smooth-transition p-2 rounded-xl hover:bg-white/10"
              style={{ color: 'var(--text-heading)' }}
              title="Close Project Panel"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Project Panel
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                  className={`glass-strong rounded-2xl shadow-2xl border border-white/20 p-3 flex flex-col gap-1 transition-all duration-200 ${isLoading === project.name ? 'cursor-wait opacity-60' : 'cursor-pointer hover:scale-[1.01] hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:border-[#007AFF]/40'} ${project.name === activeProject ? 'border-2 border-[#007AFF] bg-[#007AFF]/5' : ''}`}
                  onClick={() => handleLoadProject(project.name)}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 min-w-0">
                      {editingProject === project.name ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={() => handleSaveEdit(project.name)}
                          onKeyDown={(e) => handleKeyDown(e, project.name)}
                          className="font-semibold text-[#007AFF] text-sm bg-white/10 border border-[#007AFF]/30 rounded px-2 py-1 focus:outline-none focus:border-[#007AFF] min-w-0"
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-center gap-1 min-w-0">
                          <button
                            onClick={(e) => handleStartEdit(project.name, e)}
                            className="p-0.5 text-[#007AFF] hover:text-[#0056CC] hover:bg-[#007AFF]/10 rounded smooth-transition"
                            title="Edit project name"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <h3
                            className="font-semibold text-[#007AFF] truncate text-sm cursor-pointer hover:text-[#0056CC] smooth-transition"
                            onClick={(e) => handleStartEdit(project.name, e)}
                            title="Click to edit project name"
                          >
                            {project.name}
                          </h3>
                        </div>
                      )}
                      {project.name === activeProject && (
                        <span className="text-xs bg-[#007AFF]/10 text-[#007AFF] px-1.5 py-0.5 rounded-full font-medium">Active</span>
                      )}
                    </div>
                    <span className="text-xs text-[#999]">{formatDate(project.timestamp)}</span>
                  </div>

                  {/* 버튼 영역 - 각 버튼만 클릭 이벤트 전파 방지 */}
                  <div className="flex gap-1 justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShowProjectDetails(project);
                      }}
                      className="p-1.5 text-[#007AFF] hover:bg-[#007AFF]/10 rounded-xl smooth-transition shadow-sm"
                      title="View project details"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShareProject(project);
                      }}
                      className="p-1.5 text-[#FF9500] hover:bg-[#FF9500]/10 rounded-xl smooth-transition shadow-sm"
                      title="Share project"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project.name);
                      }}
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

    </>
  );
};

export default ProjectManager;
