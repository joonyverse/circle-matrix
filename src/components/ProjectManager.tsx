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
  onClose: () => void;
  onShareProject?: (settings: Record<string, unknown>) => void;
}

const ProjectManager: React.FC<ProjectManagerProps> = ({
  projects,
  activeProject,
  onSaveProject,
  onLoadProject,
  onDeleteProject,
  onRenameProject,
  onSaveToActiveProject,
  onClose,
  onShareProject
}) => {
  const [projectName, setProjectName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [message, setMessage] = useState('');
  const [currentProjects, setCurrentProjects] = useState<Project[]>(projects);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showProjectDetails) {
        setShowProjectDetails(false);
      }
    };

    if (showProjectDetails) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showProjectDetails]);

  // projects prop이 변경될 때마다 currentProjects 업데이트
  useEffect(() => {
    setCurrentProjects(projects);
  }, [projects]);

  const handleSaveProject = () => {
    if (!projectName.trim()) {
      setMessage('Please enter a project name.');
      return;
    }

    if (currentProjects.some(p => p.name === projectName.trim())) {
      if (!confirm(`Project "${projectName}" already exists. Overwrite?`)) {
        return;
      }
    }

    try {
      console.log('💾 ProjectManager: Saving project:', projectName.trim());
      const updatedProjects = onSaveProject(projectName.trim());
      console.log('💾 ProjectManager: Save result. Total projects:', updatedProjects.length);
      setCurrentProjects(updatedProjects);
      setProjectName('');
      setShowSaveForm(false);
      setMessage(`Project "${projectName}" saved successfully.`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('❌ ProjectManager: Error saving project:', error);
      setMessage('Error saving project.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

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
    setSelectedProject(project);
    setShowProjectDetails(true);
  };

  const handleShareProject = (project: Project) => {
    if (onShareProject) {
      onShareProject(project.settings);
    }
  };

  const handleRenameProject = () => {
    if (!selectedProject || !newProjectName.trim()) {
      setMessage('Please enter a new project name.');
      return;
    }

    if (newProjectName.trim() === selectedProject.name) {
      setMessage('New name is the same as current name.');
      return;
    }

    try {
      console.log('🔄 ProjectManager: Renaming project:', selectedProject.name, 'to:', newProjectName.trim());
      const updatedProjects = onRenameProject(selectedProject.name, newProjectName.trim());
      setCurrentProjects(updatedProjects);
      setNewProjectName('');
      setIsRenaming(false);
      setMessage(`Project renamed to "${newProjectName}" successfully.`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('❌ ProjectManager: Error renaming project:', error);
      setMessage(error instanceof Error ? error.message : 'Error renaming project.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US');
  };

  return (
    <div className="bg-[#2a2a2a] border-r border-[#3a3a3a] shadow-xl font-mono text-sm w-80 h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-[#1a1a1a] text-white p-3 border-b border-[#3a3a3a] flex-shrink-0">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-semibold text-[#e0e0e0]">Project Manager</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-[#888] hover:text-[#e0e0e0] transition-colors p-1"
              title="Close Project Manager"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="px-3 py-2 bg-[#1a3a1a] border-b border-[#2a4a2a] flex-shrink-0">
          <p className="text-xs text-[#4ade80]">{message}</p>
        </div>
      )}

      {/* Save Form */}
      {showSaveForm && (
        <div className="p-3 border-b border-[#3a3a3a] bg-[#1a1a1a] flex-shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Project name"
              className="flex-1 px-2 py-1 bg-[#2a2a2a] border border-[#4a4a4a] rounded text-[#e0e0e0] placeholder-[#666] focus:outline-none focus:border-[#666] text-xs"
              onKeyPress={(e) => e.key === 'Enter' && handleSaveProject()}
            />
            <button
              onClick={handleSaveProject}
              className="px-3 py-1 bg-[#3a5a3a] text-[#4ade80] rounded hover:bg-[#4a6a4a] transition-colors text-xs"
            >
              Save
            </button>
            <button
              onClick={() => {
                setShowSaveForm(false);
                setProjectName('');
              }}
              className="px-3 py-1 bg-[#5a3a3a] text-[#f87171] rounded hover:bg-[#6a4a4a] transition-colors text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-3 flex-1 overflow-y-auto">
        {/* Save Buttons */}
        {!showSaveForm && (
          <div className="space-y-2 mb-3">
            <button
              onClick={() => setShowSaveForm(true)}
              className="w-full px-3 py-2 bg-[#3a5a3a] text-[#4ade80] rounded hover:bg-[#4a6a4a] transition-colors flex items-center justify-center gap-2 text-xs"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Save As New Project
            </button>

            <button
              onClick={onSaveToActiveProject}
              disabled={!activeProject}
              className={`w-full px-3 py-2 rounded transition-colors flex items-center justify-center gap-2 text-xs ${activeProject
                ? 'bg-[#1a3a5a] text-[#60a5fa] hover:bg-[#2a4a6a]'
                : 'bg-[#2a2a2a] text-[#666] cursor-not-allowed'
                }`}
              title={activeProject ? `Save to active project: ${activeProject}` : 'No active project'}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {activeProject ? `Save to Active Project: ${activeProject}` : 'Save to Active Project (None)'}
            </button>
          </div>
        )}

        {/* Project List */}
        <div className="space-y-2 overflow-y-auto">
          {currentProjects.length === 0 ? (
            <div className="text-center py-8 text-[#666]">
              <svg className="w-8 h-8 mx-auto mb-2 text-[#444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-xs">No saved projects</p>
            </div>
          ) : (
            currentProjects.map((project) => (
              <div
                key={project.name}
                className={`border rounded p-2 transition-colors cursor-pointer ${project.name === activeProject
                  ? 'border-[#4ade80] bg-[#1a2a1a]' // 활성 프로젝트 강조
                  : 'border-[#3a3a3a] hover:bg-[#1a1a1a]'
                  }`}
                onClick={() => handleShowProjectDetails(project)}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-[#e0e0e0] truncate text-xs">{project.name}</h3>
                    {project.name === activeProject && (
                      <span className="text-[#4ade80] text-xs bg-[#2a3a2a] px-1 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleLoadProject(project.name)}
                      className="p-1 text-[#60a5fa] hover:bg-[#1a3a5a] rounded transition-colors"
                      title="Load project"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleShareProject(project)}
                      className="p-1 text-[#a78bfa] hover:bg-[#3a1a5a] rounded transition-colors"
                      title="Share project"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteProject(project.name)}
                      className="p-1 text-[#f87171] hover:bg-[#5a1a1a] rounded transition-colors"
                      title="Delete project"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-xs text-[#666]">
                  Saved: {formatDate(project.timestamp)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Project Details Modal */}
      {showProjectDetails && selectedProject && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowProjectDetails(false)}
        >
          <div
            className="bg-[#2a2a2a] rounded-lg shadow-xl border border-[#3a3a3a] w-96 max-h-[80vh] overflow-hidden font-mono text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#1a1a1a] text-white p-3 border-b border-[#3a3a3a]">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold text-[#e0e0e0]">Project Details</h2>
                <button
                  onClick={() => setShowProjectDetails(false)}
                  className="text-[#888] hover:text-[#e0e0e0] transition-colors p-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-3 max-h-96 overflow-y-auto">
              <div className="mb-3">
                {isRenaming ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleRenameProject();
                        } else if (e.key === 'Escape') {
                          setIsRenaming(false);
                          setNewProjectName('');
                        }
                      }}
                      placeholder="Enter new project name"
                      className="w-full px-2 py-1 bg-[#1a1a1a] border border-[#3a3a3a] rounded text-[#e0e0e0] text-sm focus:outline-none focus:border-[#60a5fa]"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleRenameProject}
                        className="px-3 py-1 bg-[#3a5a3a] text-[#4ade80] rounded hover:bg-[#4a6a4a] transition-colors text-xs"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setIsRenaming(false);
                          setNewProjectName('');
                        }}
                        className="px-3 py-1 bg-[#3a1a1a] text-[#888] rounded hover:bg-[#4a2a2a] transition-colors text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[#e0e0e0] font-medium mb-1">{selectedProject.name}</h3>
                      <p className="text-xs text-[#666]">Saved: {formatDate(selectedProject.timestamp)}</p>
                    </div>
                    <button
                      onClick={() => {
                        setIsRenaming(true);
                        setNewProjectName(selectedProject.name);
                      }}
                      className="px-2 py-1 bg-[#1a3a5a] text-[#60a5fa] rounded hover:bg-[#2a4a6a] transition-colors text-xs"
                      title="Rename project"
                    >
                      ✏️
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-[#e0e0e0] text-xs font-medium">Settings Preview:</h4>

                {/* Structure Settings */}
                <div className="bg-[#1a1a1a] p-2 rounded">
                  <h5 className="text-[#60a5fa] text-xs mb-1">Structure</h5>

                  {/* Grid Layout */}
                  <div className="mb-2">
                    <div className="text-xs text-[#60a5fa] mb-1">Grid Layout</div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <span className="text-[#888]">Rows:</span>
                      <span className="text-[#e0e0e0]">{String(selectedProject.settings.rows)}</span>
                      <span className="text-[#888]">Cols:</span>
                      <span className="text-[#e0e0e0]">{String(selectedProject.settings.cols)}</span>
                      <span className="text-[#888]">Row Spacing:</span>
                      <span className="text-[#e0e0e0]">{String(selectedProject.settings.rowSpacing)}</span>
                      <span className="text-[#888]">Col Spacing:</span>
                      <span className="text-[#e0e0e0]">{String(selectedProject.settings.colSpacing)}</span>
                    </div>
                  </div>

                  {/* Shape Settings */}
                  <div>
                    <div className="text-xs text-[#60a5fa] mb-1">Shape Settings</div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <span className="text-[#888]">Shape Type:</span>
                      <span className="text-[#e0e0e0]">{String(selectedProject.settings.shapeType)}</span>
                      <span className="text-[#888]">Circle Radius:</span>
                      <span className="text-[#e0e0e0]">{String(selectedProject.settings.circleRadius)}</span>
                      <span className="text-[#888]">Rect Width:</span>
                      <span className="text-[#e0e0e0]">{String(selectedProject.settings.rectangleWidth)}</span>
                      <span className="text-[#888]">Rect Height:</span>
                      <span className="text-[#e0e0e0]">{String(selectedProject.settings.rectangleHeight)}</span>
                      <span className="text-[#888]">Width Scaling:</span>
                      <span className="text-[#e0e0e0]">{String(selectedProject.settings.enableWidthScaling)}</span>
                      <span className="text-[#888]">Scale Factor:</span>
                      <span className="text-[#e0e0e0]">{String(selectedProject.settings.widthScaleFactor)}</span>
                    </div>
                  </div>
                </div>

                {/* Appearance Settings */}
                <div className="bg-[#1a1a1a] p-2 rounded">
                  <h5 className="text-[#a78bfa] text-xs mb-1">Appearance</h5>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <span className="text-[#888]">Background:</span>
                    <span className="text-[#e0e0e0]">{String(selectedProject.settings.backgroundColor)}</span>
                    <span className="text-[#888]">Border Thickness:</span>
                    <span className="text-[#e0e0e0]">{String(selectedProject.settings.borderThickness)}</span>
                    <span className="text-[#888]">Color Seed:</span>
                    <span className="text-[#e0e0e0]">{String(selectedProject.settings.colorSeed)}</span>
                    <span className="text-[#888]">Freq 1:</span>
                    <span className="text-[#e0e0e0]">{String(selectedProject.settings.frequency1)}</span>
                    <span className="text-[#888]">Freq 2:</span>
                    <span className="text-[#e0e0e0]">{String(selectedProject.settings.frequency2)}</span>
                    <span className="text-[#888]">Freq 3:</span>
                    <span className="text-[#e0e0e0]">{String(selectedProject.settings.frequency3)}</span>
                    <span className="text-[#888]">Sync Colors 1:</span>
                    <span className="text-[#e0e0e0]">{String(selectedProject.settings.syncColors1)}</span>
                    <span className="text-[#888]">Sync Colors 2:</span>
                    <span className="text-[#e0e0e0]">{String(selectedProject.settings.syncColors2)}</span>
                    <span className="text-[#888]">Sync Colors 3:</span>
                    <span className="text-[#e0e0e0]">{String(selectedProject.settings.syncColors3)}</span>
                  </div>
                </div>

                {/* Color Groups */}
                <div className="bg-[#1a1a1a] p-2 rounded">
                  <h5 className="text-[#a78bfa] text-xs mb-1">Color Groups</h5>
                  <div className="space-y-2">
                    {/* Color Group 1 */}
                    <div className="border-l-2 border-red-400 pl-2">
                      <div className="text-xs text-red-400 mb-1">Group 1</div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <span className="text-[#888]">Fill:</span>
                        <span className="text-[#e0e0e0]">
                          {selectedProject.settings.fill1 ?
                            `rgb(${(selectedProject.settings.fill1 as any).r}, ${(selectedProject.settings.fill1 as any).g}, ${(selectedProject.settings.fill1 as any).b})` :
                            'N/A'}
                        </span>
                        <span className="text-[#888]">Stroke:</span>
                        <span className="text-[#e0e0e0]">
                          {selectedProject.settings.stroke1 ?
                            `rgb(${(selectedProject.settings.stroke1 as any).r}, ${(selectedProject.settings.stroke1 as any).g}, ${(selectedProject.settings.stroke1 as any).b})` :
                            'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Color Group 2 */}
                    <div className="border-l-2 border-teal-400 pl-2">
                      <div className="text-xs text-teal-400 mb-1">Group 2</div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <span className="text-[#888]">Fill:</span>
                        <span className="text-[#e0e0e0]">
                          {selectedProject.settings.fill2 ?
                            `rgb(${(selectedProject.settings.fill2 as any).r}, ${(selectedProject.settings.fill2 as any).g}, ${(selectedProject.settings.fill2 as any).b})` :
                            'N/A'}
                        </span>
                        <span className="text-[#888]">Stroke:</span>
                        <span className="text-[#e0e0e0]">
                          {selectedProject.settings.stroke2 ?
                            `rgb(${(selectedProject.settings.stroke2 as any).r}, ${(selectedProject.settings.stroke2 as any).g}, ${(selectedProject.settings.stroke2 as any).b})` :
                            'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Color Group 3 */}
                    <div className="border-l-2 border-blue-400 pl-2">
                      <div className="text-xs text-blue-400 mb-1">Group 3</div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <span className="text-[#888]">Fill:</span>
                        <span className="text-[#e0e0e0]">
                          {selectedProject.settings.fill3 ?
                            `rgb(${(selectedProject.settings.fill3 as any).r}, ${(selectedProject.settings.fill3 as any).g}, ${(selectedProject.settings.fill3 as any).b})` :
                            'N/A'}
                        </span>
                        <span className="text-[#888]">Stroke:</span>
                        <span className="text-[#e0e0e0]">
                          {selectedProject.settings.stroke3 ?
                            `rgb(${(selectedProject.settings.stroke3 as any).r}, ${(selectedProject.settings.stroke3 as any).g}, ${(selectedProject.settings.stroke3 as any).b})` :
                            'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transform Settings */}
                <div className="bg-[#1a1a1a] p-2 rounded">
                  <h5 className="text-[#4ade80] text-xs mb-1">Transform</h5>

                  {/* Cylinder Settings */}
                  <div className="mb-2">
                    <div className="text-xs text-[#4ade80] mb-1">Cylinder</div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <span className="text-[#888]">Axis:</span>
                      <span className="text-[#e0e0e0]">{String(selectedProject.settings.cylinderAxis)}</span>
                      <span className="text-[#888]">Radius:</span>
                      <span className="text-[#e0e0e0]">{String(selectedProject.settings.cylinderRadius)}</span>
                      <span className="text-[#888]">Curvature:</span>
                      <span className="text-[#e0e0e0]">{String(selectedProject.settings.cylinderCurvature)}</span>
                    </div>
                  </div>

                  {/* Object Transform */}
                  <div>
                    <div className="text-xs text-[#4ade80] mb-1">Object Transform</div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <span className="text-[#888]">Position X:</span>
                      <span className="text-[#e0e0e0]">{String(selectedProject.settings.objectPositionX)}</span>
                      <span className="text-[#888]">Position Y:</span>
                      <span className="text-[#e0e0e0]">{String(selectedProject.settings.objectPositionY)}</span>
                      <span className="text-[#888]">Position Z:</span>
                      <span className="text-[#e0e0e0]">{String(selectedProject.settings.objectPositionZ)}</span>
                      <span className="text-[#888]">Rotation X:</span>
                      <span className="text-[#e0e0e0]">{String(selectedProject.settings.rotationX)}</span>
                      <span className="text-[#888]">Rotation Y:</span>
                      <span className="text-[#e0e0e0]">{String(selectedProject.settings.rotationY)}</span>
                      <span className="text-[#888]">Rotation Z:</span>
                      <span className="text-[#e0e0e0]">{String(selectedProject.settings.rotationZ)}</span>
                    </div>
                  </div>
                </div>

                {/* Camera Settings */}
                <div className="bg-[#1a1a1a] p-2 rounded">
                  <h5 className="text-[#f87171] text-xs mb-1">Camera</h5>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <span className="text-[#888]">Position Z:</span>
                    <span className="text-[#e0e0e0]">{String(selectedProject.settings.cameraPositionZ)}</span>
                    <span className="text-[#888]">Settings:</span>
                    <span className="text-[#e0e0e0]">Default values</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => {
                    handleLoadProject(selectedProject.name);
                    setShowProjectDetails(false);
                  }}
                  className="flex-1 px-3 py-2 bg-[#3a5a3a] text-[#4ade80] rounded hover:bg-[#4a6a4a] transition-colors text-xs"
                >
                  Load Project
                </button>
                <button
                  onClick={() => {
                    handleShareProject(selectedProject);
                    setShowProjectDetails(false);
                  }}
                  className="flex-1 px-3 py-2 bg-[#3a1a5a] text-[#a78bfa] rounded hover:bg-[#4a2a6a] transition-colors text-xs"
                >
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManager;
