import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  useThreeRenderer, 
  useSettings, 
  useProjectManager, 
  useAnimations, 
  useCapture 
} from '../hooks';
import { ControlPanel } from './controls';
import { ProjectManager } from './project';
import { 
  SaveProjectModal, 
  DeleteConfirmModal, 
  CaptureListModal 
} from './modals';
import { Modal } from './ui/Modal';
import { ToastContainer, useToast } from './ui/Toast';
import { KEYBOARD_SHORTCUTS, CAMERA_DEFAULTS } from '../constants';

interface Project {
  name: string;
  settings: Record<string, unknown>;
  timestamp: number;
  previewImage?: string;
}

const ThreeSceneRefactored: React.FC = () => {
  // Toast 시스템
  const toast = useToast();

  // UI 상태 관리
  const [showControlPanel, setShowControlPanel] = useState(true);
  const [showProjectManager, setShowProjectManager] = useState(true);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showCaptureList, setShowCaptureList] = useState(false);
  const [showShortcutsGuide, setShowShortcutsGuide] = useState(true);
  const [cameraControlType, setCameraControlType] = useState<'trackball' | 'orbit'>('orbit');
  const [isZenMode, setIsZenMode] = useState(false);
  const [previousUIState, setPreviousUIState] = useState<{
    showControlPanel: boolean;
    showProjectManager: boolean;
  }>({
    showControlPanel: true,
    showProjectManager: true
  });
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    projectName: string;
  }>({
    isOpen: false,
    projectName: ''
  });
  const [forceUpdate, setForceUpdate] = useState(0);

  // 설정 관리 훅
  const {
    settings,
    colorSeedRef,
    handleSettingChange,
    getCurrentSettings,
    saveSettings,
    applySettings,
    loadProjectFromURL,
    resetAllSettings,
    regenerateColors,
  } = useSettings({
    onCameraControlTypeChange: setCameraControlType,
  });

  // 3D 렌더링 훅
  const {
    mountRef,
    sceneRef,
    rendererRef,
    cameraRef,
    controlsRef,
    circlesRef,
    animationIdRef,
    initSceneWithControlType,
    createCircles,
    updateColors,
    updateTransforms,
    resetCameraPosition,
    animate,
    handleResize,
  } = useThreeRenderer({
    settings,
    colorSeedRef,
    cameraControlType,
  });

  // 프로젝트 관리 훅
  const {
    activeProject,
    isLoadingProject,
    saveProject,
    loadProject,
    deleteProject,
    renameProject,
    saveToActiveProject,
    shareProject,
    getProjects,
    getExistingProjectNames,
    setActiveProject,
  } = useProjectManager({
    getCurrentSettings,
    applySettings: (newSettings) => {
      setIsLoadingProject(true);
      applySettings(newSettings);
      setTimeout(() => {
        setForceUpdate(prev => prev + 1);
        setIsLoadingProject(false);
      }, 500);
    },
    resetCameraPosition,
    rendererRef,
    sceneRef,
    cameraRef,
  });

  // 애니메이션 훅
  const {
    isRotationAnimating,
    animateRotationY,
    cleanupAnimations,
  } = useAnimations({
    settings,
    circlesRef,
    handleSettingChange,
  });

  // 캡처 훅
  const {
    handleCapture,
  } = useCapture({
    rendererRef,
    sceneRef,
    cameraRef,
    settings,
  });

  // 카메라 컨트롤 타입 변경
  const changeCameraControlType = useCallback((type: 'trackball' | 'orbit') => {
    setCameraControlType(type);
    handleSettingChange('cameraControlType', type);
    initSceneWithControlType(type);
    createCircles();
    setTimeout(() => {
      updateTransforms();
    }, 0);
    toast.success(`Camera control changed to ${type.charAt(0).toUpperCase() + type.slice(1)} mode!`);
  }, [initSceneWithControlType, createCircles, updateTransforms, handleSettingChange, toast]);

  // 모든 설정 리셋
  const handleResetAll = useCallback(() => {
    resetAllSettings();
    regenerateColors();
    createCircles();
    saveSettings();
    toast.success('All settings have been reset to default values!');
  }, [resetAllSettings, regenerateColors, createCircles, saveSettings, toast]);

  // 카메라 리셋
  const handleResetCamera = useCallback(() => {
    resetCameraPosition();
    toast.success('Camera position has been reset to default!');
  }, [resetCameraPosition, toast]);

  // 색상 재생성
  const handleRegenerateColors = useCallback(() => {
    regenerateColors();
    createCircles();
    saveSettings();
    toast.success('Colors have been regenerated with a new random seed!');
  }, [regenerateColors, createCircles, saveSettings, toast]);

  // URL 공유
  const handleShareURL = useCallback(async () => {
    const result = await shareProject(getCurrentSettings());
    if (result.success) {
      const message = result.type === 'tinyurl' 
        ? `TinyURL copied to clipboard!\n${result.url}`
        : `Share URL copied to clipboard!\n${result.url}`;
      toast.success(message);
    } else {
      alert(`Share URL:\n${result.url}`);
    }
  }, [shareProject, getCurrentSettings, toast]);

  // 캡처 핸들러
  const handleCaptureWithToast = useCallback(async () => {
    try {
      const result = await handleCapture();
      if (result.success) {
        toast.success('Screenshot copied to clipboard!');
      } else {
        toast.error(result.error || 'Failed to capture screenshot');
      }
    } catch (error) {
      toast.error('Failed to capture screenshot');
    }
  }, [handleCapture, toast]);

  // Zen 모드 토글
  const toggleZenMode = useCallback(() => {
    if (isZenMode) {
      setShowControlPanel(previousUIState.showControlPanel);
      setShowProjectManager(previousUIState.showProjectManager);
      setIsZenMode(false);
      toast.success('Zen mode disabled');
    } else {
      setPreviousUIState({
        showControlPanel: showControlPanel,
        showProjectManager: showProjectManager
      });
      setShowControlPanel(false);
      setShowProjectManager(false);
      setIsZenMode(true);
      toast.success('Zen mode enabled');
    }
  }, [isZenMode, previousUIState, showControlPanel, showProjectManager, toast]);

  // 프로젝트 관련 핸들러들
  const handleSaveNewProject = useCallback((name: string) => {
    try {
      saveProject(name);
      setActiveProject(name);
      toast.success(`Project "${name}" saved successfully.`);
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('Error saving project.');
    }
  }, [saveProject, setActiveProject, toast]);

  const handleShowProjectDetails = useCallback((project: Project) => {
    setSelectedProject(project);
    setShowProjectDetails(true);
  }, []);

  const handleDeleteProjectRequest = useCallback((projectName: string) => {
    setDeleteModal({
      isOpen: true,
      projectName
    });
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    const { projectName } = deleteModal;
    try {
      deleteProject(projectName);
      toast.success(`Project "${projectName}" deleted successfully.`);
    } catch (error) {
      toast.error('Error deleting project.');
    }
    setDeleteModal({ isOpen: false, projectName: '' });
  }, [deleteModal, deleteProject, toast]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteModal({ isOpen: false, projectName: '' });
  }, []);

  const handleSaveToActiveProject = useCallback(() => {
    if (!activeProject) {
      toast.warning('No active project to save to.');
      return;
    }
    try {
      saveToActiveProject();
      toast.success(`Saved to active project: "${activeProject}"`);
    } catch (error) {
      toast.error('Error saving to active project.');
    }
  }, [activeProject, saveToActiveProject, toast]);

  // Effects for auto-update when controls change
  useEffect(() => {
    if (sceneRef.current) {
      createCircles();
    }
  }, [
    settings.rows, settings.cols, settings.rowSpacing, settings.colSpacing,
    settings.shapeType, settings.circleRadius, settings.rectangleWidth, settings.rectangleHeight,
    settings.enableWidthScaling, settings.widthScaleFactor, settings.borderThickness,
    settings.frequency1, settings.frequency2, settings.frequency3,
    createCircles
  ]);

  // 색상 변경 시 재질만 업데이트 (디바운싱 적용)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (sceneRef.current && circlesRef.current.length > 0) {
        updateColors();
      }
    }, 16);

    return () => clearTimeout(timeoutId);
  }, [
    settings.fill1, settings.stroke1, settings.syncColors1,
    settings.fill2, settings.stroke2, settings.syncColors2,
    settings.fill3, settings.stroke3, settings.syncColors3,
    updateColors, sceneRef, circlesRef
  ]);

  useEffect(() => {
    if (sceneRef.current && circlesRef.current.length > 0) {
      updateTransforms();
    }
  }, [
    settings.cylinderAxis, settings.cylinderCurvature, settings.cylinderRadius,
    settings.objectPositionX, settings.objectPositionY, settings.objectPositionZ,
    settings.rotationX, settings.rotationY, settings.rotationZ,
    updateTransforms, sceneRef, circlesRef
  ]);

  // 카메라 컨트롤 타입이 변경될 때 씬 재초기화
  useEffect(() => {
    if (sceneRef.current) {
      initSceneWithControlType(cameraControlType);
    }
  }, [cameraControlType, initSceneWithControlType, sceneRef]);

  // 키보드 컨트롤
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputMode = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).contentEditable === 'true' ||
        activeElement.getAttribute('contenteditable') === 'true'
      );

      if (isInputMode) return;

      // Ctrl+S 저장 단축키
      if (event.ctrlKey && event.key === KEYBOARD_SHORTCUTS.SAVE) {
        event.preventDefault();
        if (activeProject) {
          handleSaveToActiveProject();
        } else {
          setShowSaveModal(true);
        }
        return;
      }

      // Z 키 Zen 모드 토글
      if (event.key === KEYBOARD_SHORTCUTS.ZEN_MODE || event.key === KEYBOARD_SHORTCUTS.ZEN_MODE_UPPER) {
        event.preventDefault();
        toggleZenMode();
        return;
      }

      // ? 키 단축키 도움말 토글
      if (event.key === KEYBOARD_SHORTCUTS.HELP_1 || event.key === KEYBOARD_SHORTCUTS.HELP_2) {
        event.preventDefault();
        setShowShortcutsGuide(prev => !prev);
        return;
      }

      // WASD 카메라 컨트롤
      if (!controlsRef.current) return;

      const moveSpeed = CAMERA_DEFAULTS.KEYBOARD_MOVE_SPEED;
      const camera = controlsRef.current.object;

      switch (event.code) {
        case KEYBOARD_SHORTCUTS.CAMERA_FORWARD:
          camera.position.z -= moveSpeed;
          break;
        case KEYBOARD_SHORTCUTS.CAMERA_BACKWARD:
          camera.position.z += moveSpeed;
          break;
        case KEYBOARD_SHORTCUTS.CAMERA_LEFT:
          camera.position.x -= moveSpeed;
          break;
        case KEYBOARD_SHORTCUTS.CAMERA_RIGHT:
          camera.position.x += moveSpeed;
          break;
        case KEYBOARD_SHORTCUTS.CAMERA_UP:
          camera.position.y += moveSpeed;
          break;
        case KEYBOARD_SHORTCUTS.CAMERA_DOWN:
          camera.position.y -= moveSpeed;
          break;
      }

      controlsRef.current.update();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeProject, handleSaveToActiveProject, toggleZenMode, controlsRef]);

  // Auto-save when controls change
  useEffect(() => {
    saveSettings();
  }, [settings, saveSettings]);

  // 초기화 및 정리
  useEffect(() => {
    const urlLoaded = loadProjectFromURL();

    initSceneWithControlType(cameraControlType);
    createCircles();
    animate();

    if (urlLoaded) {
      setTimeout(() => {
        resetCameraPosition();
      }, 100);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      cleanupAnimations();
      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (mountRef.current && mountRef.current.contains(rendererRef.current.domElement)) {
          mountRef.current.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current = undefined;
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 강제 업데이트 시 씬 재생성
  useEffect(() => {
    if (forceUpdate > 0) {
      if (sceneRef.current) {
        createCircles();
      }
    }
  }, [forceUpdate, createCircles, sceneRef]);

  return (
    <div className="relative w-full h-screen">
      <div ref={mountRef} className="w-full h-screen" />

      {/* Control Panel */}
      <ControlPanel
        settings={settings}
        onSettingChange={handleSettingChange}
        onResetAll={handleResetAll}
        onResetCamera={handleResetCamera}
        onRegenerateColors={handleRegenerateColors}
        onShareURL={handleShareURL}
        onCapture={handleCaptureWithToast}
        onOpenCaptureList={() => setShowCaptureList(true)}
        isVisible={showControlPanel}
        onToggleVisibility={() => {
          if (isZenMode) {
            setShowControlPanel(true);
            setIsZenMode(false);
            toast.success('Control panel shown');
          } else {
            setShowControlPanel(v => !v);
          }
        }}
        cameraControlType={cameraControlType}
        onCameraControlTypeChange={changeCameraControlType}
        onAnimateRotationY={animateRotationY}
        isRotationAnimating={isRotationAnimating}
      />

      {/* Toast Container */}
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />

      {/* Loading Indicator */}
      {isLoadingProject && (
        <div className="absolute top-4 right-4 z-20 glass-strong text-[#007AFF] px-4 py-3 rounded-2xl shadow-lg font-medium text-sm flex items-center gap-3 animate-fade-in">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#007AFF] border-t-transparent"></div>
          Loading project settings...
        </div>
      )}

      {/* Project Panel Sidebar */}
      <div className={`fixed top-4 left-4 h-[calc(100vh-2rem)] z-10 transition-all duration-300 ease-in-out ${showProjectManager ? 'translate-x-0 opacity-100 scale-100' : '-translate-x-full opacity-0 scale-95'}`}>
        <ProjectManager
          projects={getProjects()}
          activeProject={activeProject}
          onSaveProject={saveProject}
          onLoadProject={loadProject}
          onDeleteProject={deleteProject}
          onRenameProject={renameProject}
          onSaveToActiveProject={handleSaveToActiveProject}
          onOpenSaveModal={() => setShowSaveModal(true)}
          onClose={() => setShowProjectManager(false)}
          onShowProjectDetails={handleShowProjectDetails}
          onDeleteProjectRequest={handleDeleteProjectRequest}
          toast={toast}
          onShareProject={async (settings) => {
            const result = await shareProject(settings);
            if (result.success) {
              const message = result.type === 'tinyurl' 
                ? `TinyURL copied to clipboard!\n${result.url}`
                : `Share URL copied to clipboard!\n${result.url}`;
              toast.success(message);
            } else {
              alert(`Share URL:\n${result.url}`);
            }
          }}
        />
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => {
          if (isZenMode) {
            setShowProjectManager(true);
            setIsZenMode(false);
            toast.success('Project panel shown');
          } else {
            setShowProjectManager(!showProjectManager);
          }
        }}
        className={`fixed top-4 left-4 z-20 p-3 rounded-2xl glass-strong hover:scale-105 heading-hover project-manager-toggle ${showProjectManager ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 scale-100'}`}
        style={{ color: 'var(--text-heading)' }}
        title={isZenMode ? "Show Project Panel" : "Open Project Panel"}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </button>

      {/* Camera Controls Guide */}
      <div className={`fixed bottom-4 left-4 z-20 glass-strong text-[#007AFF] px-4 py-3 rounded-2xl shadow-lg font-medium text-sm transition-all duration-300 ease-out ${!showShortcutsGuide ? 'opacity-0 pointer-events-none transform -translate-x-full' : 'opacity-100 pointer-events-auto transform translate-x-0'}`}>
        <div className="flex items-center gap-6">
          <button
            onClick={() => setShowShortcutsGuide(false)}
            className="p-1 text-[#666] hover:text-[#007AFF] hover:bg-[#007AFF]/10 rounded smooth-transition"
            title="Close shortcuts guide"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#FF9500]">WASD:</span> <span className="text-[#666]">Move Camera</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#FF9500]">QE:</span> <span className="text-[#666]">Up/Down</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#FF9500]">Mouse:</span> <span className="text-[#666]">Rotate/Zoom</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#34C759]">Ctrl+S:</span> <span className="text-[#666]">Save</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#AF52DE]">Z:</span> <span className="text-[#666]">Zen Mode</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#FF3B30]">? or /:</span> <span className="text-[#666]">Toggle Help</span>
          </div>
        </div>
      </div>

      {/* Shortcuts Toggle Button */}
      <button
        onClick={() => setShowShortcutsGuide(prev => !prev)}
        className={`fixed bottom-4 left-4 z-20 p-3 rounded-2xl glass-strong hover:scale-105 heading-hover smooth-transition ${showShortcutsGuide ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 scale-100'}`}
        style={{ color: 'var(--text-heading)' }}
        title="Show Shortcuts"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Save Project Modal */}
      <SaveProjectModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveNewProject}
        existingProjects={getExistingProjectNames()}
      />

      {/* Project Details Modal */}
      {showProjectDetails && selectedProject && (
        <Modal
          isOpen={showProjectDetails}
          onClose={() => setShowProjectDetails(false)}
          title="Project Details"
          maxWidth="w-[50vw]"
          maxHeight="max-h-[50vh]"
        >
          <div className="p-4 max-h-[40vh] overflow-y-auto">
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[#007AFF] font-semibold mb-1">{selectedProject.name}</h3>
                  <p className="text-xs text-[#666]">Saved: {new Date(selectedProject.timestamp).toLocaleString('en-US')}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-[#007AFF] text-sm font-medium">Project Preview:</h4>

              <div className="glass-weak p-4 rounded-xl flex justify-center">
                {selectedProject.previewImage ? (
                  <img
                    src={selectedProject.previewImage}
                    alt={`Preview of ${selectedProject.name}`}
                    className="w-full h-64 rounded-lg object-cover border border-white/20"
                  />
                ) : (
                  <div className="w-full h-64 rounded-lg border border-white/20 flex items-center justify-center text-[#666] text-sm bg-black/20">
                    No preview available
                  </div>
                )}
              </div>

              <h4 className="text-[#007AFF] text-sm font-medium">Settings Preview:</h4>

              <div className="glass-weak p-3 rounded-xl">
                <h5 className="text-[#007AFF] text-xs font-medium mb-2">Structure</h5>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-[#666]">Rows:</span>
                  <span className="text-[#007AFF] font-medium">{String(selectedProject.settings.rows)}</span>
                  <span className="text-[#666]">Cols:</span>
                  <span className="text-[#007AFF] font-medium">{String(selectedProject.settings.cols)}</span>
                  <span className="text-[#666]">Shape Type:</span>
                  <span className="text-[#007AFF] font-medium">{String(selectedProject.settings.shapeType)}</span>
                </div>
              </div>

              <div className="glass-weak p-3 rounded-xl">
                <h5 className="text-[#007AFF] text-xs font-medium mb-2">Appearance</h5>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-[#666]">Background:</span>
                  <span className="text-[#007AFF] font-medium">{String(selectedProject.settings.backgroundColor)}</span>
                  <span className="text-[#666]">Border:</span>
                  <span className="text-[#007AFF] font-medium">{String(selectedProject.settings.borderThickness)}</span>
                </div>
              </div>

              <div className="glass-weak p-3 rounded-xl">
                <h5 className="text-[#007AFF] text-xs font-medium mb-2">Transform</h5>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-[#666]">Cylinder Radius:</span>
                  <span className="text-[#007AFF] font-medium">{String(selectedProject.settings.cylinderRadius)}</span>
                  <span className="text-[#666]">Curvature:</span>
                  <span className="text-[#007AFF] font-medium">{String(selectedProject.settings.cylinderCurvature)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  loadProject(selectedProject.name);
                  setShowProjectDetails(false);
                }}
                className="flex-1 btn-primary"
              >
                Load Project
              </button>
              <button
                onClick={() => {
                  setShowProjectDetails(false);
                }}
                className="flex-1 btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        projectName={deleteModal.projectName}
      />

      {/* Capture List Modal */}
      <CaptureListModal
        isOpen={showCaptureList}
        onClose={() => setShowCaptureList(false)}
        toast={toast}
      />
    </div>
  );
};

export default ThreeSceneRefactored;
