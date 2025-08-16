import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { TrackballControls, OrbitControls } from 'three-stdlib';
import { CircleData, CircleGridConfig, ShapeType } from '../types';
import {
  createShapeGeometry,
  createShapeStrokeGeometry,
  generateCirclePositions,
  assignColorGroups,
  applyCylindricalTransform,
  updateShapeGeometry
} from '../utils/circleGeometry';
import { isDarkBackground } from '../utils/colorUtils';
import ProjectManager from './ProjectManager';
import SaveProjectModal from './SaveProjectModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import { CaptureListModal } from './CaptureListModal';
import { ControlPanel } from './ui/ControlPanel';
import { Modal } from './ui/Modal';
import { ToastContainer, useToast } from './ui/Toast';


interface Project {
  name: string;
  settings: Record<string, unknown>;
  timestamp: number;
  previewImage?: string;
}

const ThreeScene: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const controlsRef = useRef<TrackballControls | OrbitControls | null>(null);
  const circlesRef = useRef<CircleData[]>([]);
  const animationIdRef = useRef<number>();
  const [showProjectManager, setShowProjectManager] = useState(true);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
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
  const [showCaptureList, setShowCaptureList] = useState(false);
  const [showShortcutsGuide, setShowShortcutsGuide] = useState(true);
  const [cameraControlType, setCameraControlType] = useState<'trackball' | 'orbit'>('orbit');
  
  // 애니메이션 상태 추가
  const [isRotationAnimating, setIsRotationAnimating] = useState(false);
  const rotationAnimationRef = useRef<number>();
  const lastShapeChangeAngleRef = useRef<number>(0);

  // Toast 시스템
  const toast = useToast();

  // localStorage 키
  const STORAGE_KEY = 'circle-matrix-settings';
  const PROJECTS_KEY = 'circle-matrix-projects';

  // 색상 시드 관리
  const colorSeedRef = useRef<number>(Math.floor(Math.random() * 1000000));

  /**
   * 애플리케이션 기본 설정값
   * 모든 설정의 초기값을 정의합니다.
   */
  const defaultSettings = {
    // 구조 설정
    rows: 3,
    cols: 12,
    rowSpacing: 2,
    colSpacing: 2,
    shapeType: ShapeType.Circle,
    circleRadius: 0.8,
    rectangleWidth: 1.6,
    rectangleHeight: 1.2,
    enableWidthScaling: false,
    widthScaleFactor: 2.0,
    borderThickness: 0.15,

    // 변환 설정
    cylinderAxis: 'y' as const,
    cylinderCurvature: 0,
    cylinderRadius: 8,
    objectPositionX: 0,
    objectPositionY: 0,
    objectPositionZ: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,

    // 외관 - 라이트 테마 색상
    backgroundColor: '#f5f7fa',
    frequency1: 1,
    syncColors1: false,
    fill1: { r: 0, g: 122, b: 255, a: 0.8 },
    stroke1: { r: 0, g: 0, b: 0, a: 1.0 },
    frequency2: 1,
    syncColors2: false,
    fill2: { r: 52, g: 199, b: 89, a: 0.8 },
    stroke2: { r: 0, g: 0, b: 0, a: 1.0 },
    frequency3: 1,
    syncColors3: false,
    fill3: { r: 175, g: 82, b: 222, a: 0.8 },
    stroke3: { r: 0, g: 0, b: 0, a: 1.0 },

    // 애니메이션 설정
    animationSpeed: 1.0,

    // 카메라 설정
    cameraPositionX: 0,
    cameraPositionY: 0,
    cameraPositionZ: 15,
    cameraControlType: 'orbit' as const
  };

  /**
   * localStorage에서 저장된 설정을 로드합니다.
   */
  const getDefaultValues = () => {

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const settings = JSON.parse(saved);


        if (settings.colorSeed !== undefined) {
          colorSeedRef.current = settings.colorSeed;
        }


        const mergedSettings = { ...defaultSettings, ...settings };


        if (settings.cameraControlType) {
          setCameraControlType(settings.cameraControlType);
        }

        return mergedSettings;
      }
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error);
    }

    return defaultSettings;
  };

  // 설정 상태
  const [settings, setSettings] = useState(getDefaultValues);
  const [showControlPanel, setShowControlPanel] = useState(true);

  // 카메라 기본값
  const cameraDefaults = useMemo(() => ({
    cameraMinDistance: 5,
    cameraMaxDistance: 50,
    cameraEnablePan: true,
    rotateSpeed: 2.0,
    zoomSpeed: 1.5,
    panSpeed: 1.5,
    dynamicDampingFactor: 0.1
  }), []);

  // 설정 변경 핸들러
  const handleSettingChange = useCallback((key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  /**
   * 모든 설정을 기본값으로 리셋합니다.
   */
  const handleResetAll = useCallback(() => {
    setSettings(defaultSettings);
    colorSeedRef.current = Math.floor(Math.random() * 1000000);
    createCircles();
    saveSettings();
    toast.success('All settings have been reset to default values!');
  }, []);

  /**
   * 카메라 위치를 기본값으로 리셋합니다.
   */
  const handleResetCamera = useCallback(() => {
    resetCameraPosition();
    toast.success('Camera position has been reset to default!');
  }, []);

  /**
   * 새로운 랜덤 시드로 색상을 재생성합니다.
   */
  const handleRegenerateColors = useCallback(() => {
    colorSeedRef.current = Math.floor(Math.random() * 1000000);
    createCircles();
    saveSettings();
    toast.success('Colors have been regenerated with a new random seed!');
  }, []);

  /**
   * 현재 설정을 URL로 공유합니다.
   */
  const handleShareURL = useCallback(async () => {
    const currentSettings = getCurrentSettings();
    const projectData = encodeURIComponent(JSON.stringify(currentSettings));
    const shareURL = `${window.location.origin}${window.location.pathname}?project=${projectData}`;

    try {
      // TinyURL API를 사용하여 URL 단축
      const response = await fetch('https://tinyurl.com/api-create.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `url=${encodeURIComponent(shareURL)}`
      });

      if (response.ok) {
        const tinyURL = await response.text();

        // 클립보드에 복사
        await navigator.clipboard.writeText(tinyURL);
        toast.success(`TinyURL copied to clipboard!\n${tinyURL}`);
      } else {
        // TinyURL 생성 실패 시 원본 URL 사용
        await navigator.clipboard.writeText(shareURL);
        toast.success(`Share URL copied to clipboard!\n${shareURL}`);
      }
    } catch (error) {
      console.warn('Failed to create TinyURL:', error);
      // 에러 발생 시 원본 URL 사용
      try {
        await navigator.clipboard.writeText(shareURL);
        toast.success(`Share URL copied to clipboard!\n${shareURL}`);
      } catch (clipboardError) {
        // 클립보드 복사 실패 시 URL을 alert로 표시
        alert(`Share URL:\n${shareURL}`);
      }
    }
  }, []);

  // 현재 설정을 가져오는 함수 (카메라 위치 제외, 카메라 컨트롤 타입 포함)
  const getCurrentSettings = useCallback(() => {
    const { cameraPositionX, cameraPositionY, cameraPositionZ, ...settingsWithoutCamera } = settings;
    return {
      ...settingsWithoutCamera,
      colorSeed: colorSeedRef.current,
      cameraControlType: cameraControlType
    };
  }, [settings, cameraControlType]);

  // 설정을 적용하는 함수 (카메라 위치 제외)
  const applySettings = useCallback((newSettings: Record<string, unknown>) => {
    setIsLoadingProject(true);

    // 색상 시드 적용
    if (newSettings.colorSeed !== undefined) {
      colorSeedRef.current = newSettings.colorSeed as number;
    }

    // 카메라 컨트롤 타입 적용
    if (newSettings.cameraControlType !== undefined) {
      setCameraControlType(newSettings.cameraControlType as 'trackball' | 'orbit');
    }

    // 카메라 위치를 제외한 설정만 localStorage에 저장
    const { cameraPositionX, cameraPositionY, cameraPositionZ, ...settingsWithoutCamera } = newSettings;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsWithoutCamera));

    // 설정 적용
    setSettings(prev => ({ ...prev, ...newSettings }));

    // 씬 재생성
    setTimeout(() => {
      setForceUpdate(prev => prev + 1);
      setIsLoadingProject(false);
    }, 500);
  }, []);

  // 프로젝트 로드 후 씬 업데이트를 위한 함수
  const loadProjectAndUpdate = useCallback((name: string) => {
    const savedProjects = localStorage.getItem(PROJECTS_KEY);

    if (!savedProjects) {
      return null;
    }

    const projects: Project[] = JSON.parse(savedProjects);
    const project = projects.find(p => p.name === name);

    if (project) {
      // 즉시 활성 프로젝트 설정 (UI 반응성 향상)
      setActiveProject(name);

      // 카메라 컨트롤 타입 적용
      if (project.settings.cameraControlType !== undefined) {
        setCameraControlType(project.settings.cameraControlType as 'trackball' | 'orbit');
      }

      applySettings(project.settings);

      // 프로젝트 로드 후 카메라를 기본 위치로 리셋
      setTimeout(() => {
        resetCameraPosition();
      }, 100);

      return project;
    }
    return null;
  }, [applySettings]);

  // 프로젝트 저장 함수
  const saveProject = useCallback((name: string) => {
    const currentSettings = getCurrentSettings();

    // 프로젝트 캡처 이미지 생성
    let previewImage = '';
    try {
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        // 렌더러 크기를 미리보기용으로 조정 (정사각형)
        const originalSize = rendererRef.current.getSize(new THREE.Vector2());
        const previewSize = 600; // 고해상도 캡처
        rendererRef.current.setSize(previewSize, previewSize);

        // 렌더링
        rendererRef.current.render(sceneRef.current, cameraRef.current);

        // 캔버스를 이미지로 변환
        const canvas = rendererRef.current.domElement;
        previewImage = canvas.toDataURL('image/png');

        // 원래 크기로 복원
        rendererRef.current.setSize(originalSize.x, originalSize.y);
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    } catch (error) {
      console.error('Failed to capture preview:', error);
    }

    const project: Project = {
      name,
      settings: currentSettings,
      timestamp: Date.now(),
      previewImage: previewImage
    };

    const savedProjects = localStorage.getItem(PROJECTS_KEY);
    const projects: Project[] = savedProjects ? JSON.parse(savedProjects) : [];

    // 같은 이름의 프로젝트가 있으면 업데이트, 없으면 추가
    const existingIndex = projects.findIndex(p => p.name === name);
    if (existingIndex >= 0) {
      projects[existingIndex] = project;
    } else {
      projects.push(project);
    }

    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    setActiveProject(name);

    return projects;
  }, [getCurrentSettings]);

  // 활성 프로젝트에 저장하는 함수
  const saveToActiveProject = useCallback(() => {
    if (!activeProject) {
      toast.warning('No active project to save to.');
      return;
    }

    const updatedProjects = saveProject(activeProject);
    toast.success(`Saved to active project: "${activeProject}"`);
    return updatedProjects;
  }, [activeProject, saveProject]);

  // 저장 모달에서 새 프로젝트 저장하는 함수
  const handleSaveNewProject = useCallback((name: string) => {
    try {
      const updatedProjects = saveProject(name);
      setActiveProject(name);
      toast.success(`Project "${name}" saved successfully.`);
      return updatedProjects;
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('Error saving project.');
    }
  }, [saveProject]);

  // 기존 프로젝트 이름 목록 가져오기
  const getExistingProjectNames = useCallback(() => {
    const savedProjects = localStorage.getItem(PROJECTS_KEY);
    const projects: Project[] = savedProjects ? JSON.parse(savedProjects) : [];
    return projects.map((p: Project) => p.name);
  }, []);

  // 프로젝트 로드 함수
  const loadProject = useCallback((name: string) => {
    return loadProjectAndUpdate(name);
  }, [loadProjectAndUpdate]);

  // 프로젝트 삭제 함수
  const deleteProject = useCallback((name: string) => {
    const savedProjects = localStorage.getItem(PROJECTS_KEY);
    if (!savedProjects) return [];

    const projects: Project[] = JSON.parse(savedProjects);
    const updatedProjects = projects.filter(p => p.name !== name);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(updatedProjects));
    return updatedProjects;
  }, []);

  // 프로젝트 이름 변경 함수
  const renameProject = useCallback((oldName: string, newName: string) => {
    const savedProjects = localStorage.getItem(PROJECTS_KEY);
    if (!savedProjects) return [];

    const projects: Project[] = JSON.parse(savedProjects);

    // 새 이름이 이미 존재하는지 확인
    if (projects.some(p => p.name === newName)) {
      throw new Error(`Project "${newName}" already exists.`);
    }

    // 프로젝트 찾기
    const projectIndex = projects.findIndex(p => p.name === oldName);
    if (projectIndex === -1) {
      throw new Error(`Project "${oldName}" not found.`);
    }

    // 이름 변경
    const updatedProjects = [...projects];
    updatedProjects[projectIndex] = {
      ...updatedProjects[projectIndex],
      name: newName,
      timestamp: Date.now() // 타임스탬프 업데이트
    };

    localStorage.setItem(PROJECTS_KEY, JSON.stringify(updatedProjects));
    return updatedProjects;
  }, []);

  // 프로젝트 목록 가져오기 함수
  const getProjects = useCallback(() => {
    const savedProjects = localStorage.getItem(PROJECTS_KEY);
    return savedProjects ? JSON.parse(savedProjects) : [];
  }, []);

  // URL에서 프로젝트 설정 로드 (카메라 위치 제외)
  const loadProjectFromURL = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const projectData = urlParams.get('project');

    if (projectData) {
      try {
        const settings = JSON.parse(decodeURIComponent(projectData));

        // 색상 시드 적용
        if (settings.colorSeed !== undefined) {
          colorSeedRef.current = settings.colorSeed as number;
        }

        // 카메라 컨트롤 타입 적용
        if (settings.cameraControlType !== undefined) {
          setCameraControlType(settings.cameraControlType as 'trackball' | 'orbit');
        }

        // 현재 settings 상태에 적용
        setSettings(prev => ({ ...prev, ...settings }));

        // 카메라 위치를 제외한 설정만 localStorage에 저장
        const { cameraPositionX, cameraPositionY, cameraPositionZ, ...settingsWithoutCamera } = settings;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsWithoutCamera));

        // URL에서 프로젝트 파라미터 제거
        const newURL = window.location.pathname;
        window.history.replaceState({}, '', newURL);

        toast.success('Project loaded from URL successfully.');
        return true;
      } catch (error) {
        console.error('Error loading project from URL:', error);
        return false;
      }
    }
    return false;
  }, []);

  // 현재 설정을 URL로 공유 (카메라 위치 제외)
  const shareProjectURL = useCallback(async () => {
    const currentSettings = getCurrentSettings();
    const projectData = encodeURIComponent(JSON.stringify(currentSettings));
    const shareURL = `${window.location.origin}${window.location.pathname}?project=${projectData}`;

    try {
      // TinyURL API를 사용하여 URL 단축
      const response = await fetch('https://tinyurl.com/api-create.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `url=${encodeURIComponent(shareURL)}`
      });

      if (response.ok) {
        const tinyURL = await response.text();

        // 클립보드에 복사
        await navigator.clipboard.writeText(tinyURL);
        toast.success(`TinyURL copied to clipboard!\n${tinyURL}`);
      } else {
        // TinyURL 생성 실패 시 원본 URL 사용
        await navigator.clipboard.writeText(shareURL);
        toast.success(`Share URL copied to clipboard!\n${shareURL}`);
      }
    } catch (error) {
      console.warn('Failed to create TinyURL:', error);
      // 에러 발생 시 원본 URL 사용
      try {
        await navigator.clipboard.writeText(shareURL);
        toast.success(`Share URL copied to clipboard!\n${shareURL}`);
      } catch (clipboardError) {
        // 클립보드 복사 실패 시 URL을 alert로 표시
        alert(`Share URL:\n${shareURL}`);
      }
    }
  }, [getCurrentSettings]);

  // 메시지 상태 추가


  // 프로젝트 상세 모달 핸들러
  const handleShowProjectDetails = useCallback((project: Project) => {
    setSelectedProject(project);
    setShowProjectDetails(true);
  }, []);

  // Delete 모달 핸들러들
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

  // 캡처 기능
  const handleCapture = useCallback(async () => {


    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) {

      toast.error('Renderer not available');
      return;
    }

    try {
      // 현재 렌더러의 캔버스를 캡처
      const canvas = rendererRef.current.domElement;


      // 렌더러를 한 번 더 렌더링하여 최신 상태 캡처
      rendererRef.current.render(sceneRef.current, cameraRef.current);

      // 캔버스를 blob으로 변환
      canvas.toBlob(async (blob) => {


        if (!blob) {

          toast.error('Failed to capture image');
          return;
        }



        try {
          // 클립보드에 복사

          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob
            })
          ]);


          // 임시로 이미지를 화면에 표시하여 확인 (디버깅용)
          const url = URL.createObjectURL(blob);
          const img = document.createElement('img');
          img.src = url;
          img.style.position = 'fixed';
          img.style.top = '10px';
          img.style.right = '10px';
          img.style.width = '200px';
          img.style.height = 'auto';
          img.style.border = '2px solid red';
          img.style.zIndex = '9999';
          img.style.backgroundColor = 'white';
          img.style.padding = '10px';
          img.style.borderRadius = '8px';
          img.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
          img.style.cursor = 'pointer';
          img.style.transform = 'translateX(100%) scale(0.8)';
          img.style.opacity = '0';
          img.style.transition = 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
          img.title = 'Right-click to save image';
          document.body.appendChild(img);

          // 나타나는 애니메이션
          requestAnimationFrame(() => {
            img.style.transform = 'translateX(0) scale(1)';
            img.style.opacity = '1';
          });

          let timeoutId: number;
          let isContextMenuOpen = false;

          // 사라지는 애니메이션 함수
          const removeWithAnimation = () => {
            img.style.transform = 'translateX(100%) scale(0.8)';
            img.style.opacity = '0';
            setTimeout(() => {
              if (document.body.contains(img)) {
                document.body.removeChild(img);
                URL.revokeObjectURL(url);
              }
            }, 400); // 애니메이션 완료 후 제거
          };

          // 3초 후 자동 제거 (컨텍스트 메뉴가 열려있지 않을 때만)
          const startAutoRemove = () => {
            timeoutId = setTimeout(() => {
              if (!isContextMenuOpen) {
                removeWithAnimation();
              }
            }, 3000);
          };

          // 우클릭 이벤트 처리
          img.addEventListener('contextmenu', (e) => {
            isContextMenuOpen = true;
            clearTimeout(timeoutId);
          });

          // 컨텍스트 메뉴가 닫힐 때 감지
          document.addEventListener('click', () => {
            if (isContextMenuOpen) {
              isContextMenuOpen = false;
              startAutoRemove();
            }
          });

          // ESC 키로 수동 제거
          const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
              clearTimeout(timeoutId);
              removeWithAnimation();
              document.removeEventListener('keydown', handleKeyDown);
            }
          };
          document.addEventListener('keydown', handleKeyDown);

          // 자동 제거 시작
          startAutoRemove();

          // 로컬스토리지에 캡처 저장
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            const captureItem = {
              id: `capture-${Date.now()}`,
              name: `Capture_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`,
              dataUrl: dataUrl,
              timestamp: Date.now(),
              settings: { ...settings }
            };

            // 기존 캡처 목록 로드
            const existingCaptures = localStorage.getItem('circle-matrix-captures');
            const captures = existingCaptures ? JSON.parse(existingCaptures) : [];

            // 새 캡처 추가 (최대 50개 유지)
            captures.unshift(captureItem);
            if (captures.length > 50) {
              captures.pop();
            }

            // 로컬스토리지에 저장
            localStorage.setItem('circle-matrix-captures', JSON.stringify(captures));
          };
          reader.readAsDataURL(blob);

          toast.success('Screenshot copied to clipboard!');
        } catch (clipboardError) {

          // 클립보드 복사 실패 시 다운로드

          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `circle-matrix-${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success('Screenshot downloaded!');
        }
      }, 'image/png');
    } catch (error) {

      toast.error('Failed to capture screenshot');
    }
  }, [toast]);

  // Zen 모드 토글 함수
  const toggleZenMode = useCallback(() => {
    if (isZenMode) {
      // Zen 모드 해제: 이전 상태로 복원
      setShowControlPanel(previousUIState.showControlPanel);
      setShowProjectManager(previousUIState.showProjectManager);
      setIsZenMode(false);
      toast.success('Zen mode disabled');
    } else {
      // Zen 모드 활성화: 현재 상태 저장 후 모든 UI 숨기기
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

  // RGBA 색상을 CSS 색상 문자열로 변환
  const rgbToCss = useCallback((rgba: { r: number; g: number; b: number; a: number }) => {
    return `rgb(${rgba.r}, ${rgba.g}, ${rgba.b})`;
  }, []);

  // 도형 변경 감지 함수
  const checkAndChangeShape = useCallback((rotationY: number) => {
    const normalizedAngle = ((rotationY % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const threshold = 0.1; // 각도 임계값 (약 5.7도)
    
    // 90도 (π/2) 또는 270도 (3π/2) 근처에서 도형 변경
    const isNear90 = Math.abs(normalizedAngle - Math.PI/2) < threshold;
    const isNear270 = Math.abs(normalizedAngle - 3*Math.PI/2) < threshold;
    
    if ((isNear90 || isNear270) && Math.abs(normalizedAngle - lastShapeChangeAngleRef.current) > threshold * 2) {
      // 현재 도형 타입과 반대로 변경
      const currentShapeType = settings.shapeType;
      const newShapeType = currentShapeType === 'circle' ? 'rectangle' : 'circle';
      
      // 각 도형을 개별적으로 업데이트
      const config: CircleGridConfig = {
        rows: settings.rows,
        cols: settings.cols,
        shapeType: settings.shapeType,
        circleRadius: settings.circleRadius,
        rectangleWidth: settings.rectangleWidth,
        rectangleHeight: settings.rectangleHeight,
        rowSpacing: settings.rowSpacing,
        colSpacing: settings.colSpacing
      };
      
      circlesRef.current.forEach(circle => {
        if (circle.currentShapeType === currentShapeType) {
          updateShapeGeometry(
            circle,
            config,
            newShapeType,
            settings.borderThickness,
            settings.enableWidthScaling,
            settings.widthScaleFactor
          );
        }
      });
      
      // 전역 설정도 업데이트
      handleSettingChange('shapeType', newShapeType);
      lastShapeChangeAngleRef.current = normalizedAngle;
      // 도형 변경 시 로그 제거
    }
  }, [settings, handleSettingChange]);

  // Y축 회전 애니메이션 함수
  const animateRotationY = useCallback(() => {
    if (isRotationAnimating) {
      // 이미 애니메이션 중이면 중지
      if (rotationAnimationRef.current) {
        cancelAnimationFrame(rotationAnimationRef.current);
      }
      setIsRotationAnimating(false);
      // 애니메이션 중지 시 로그 제거
      return;
    }

    setIsRotationAnimating(true);
    const startRotation = settings.rotationY;
    const targetRotation = startRotation + Math.PI * 2; // 360도 회전
    const baseDuration = 4000; // 기본 4초 애니메이션
    const duration = baseDuration / settings.animationSpeed; // 속도에 따라 지속시간 조절
    const startTime = Date.now();
    
    // 애니메이션 시작 로그 제거

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // easeInOutCubic 이징 함수
      const easeProgress = progress < 0.5 
        ? 4 * progress * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
      const currentRotation = startRotation + (targetRotation - startRotation) * easeProgress;
      
      // 도형 변경 체크
      checkAndChangeShape(currentRotation);
      
      handleSettingChange('rotationY', currentRotation);
      
      if (progress < 1) {
        rotationAnimationRef.current = requestAnimationFrame(animate);
      } else {
        setIsRotationAnimating(false);
        // 애니메이션 완료 로그 제거
      }
    };
    
    animate();
  }, [settings.rotationY, settings.animationSpeed, isRotationAnimating, handleSettingChange, checkAndChangeShape]);

  // getConfig 함수를 먼저 정의 (다른 함수들이 사용하기 때문)
  const getConfig = useCallback((): CircleGridConfig => ({
    rows: settings.rows,
    cols: settings.cols,
    shapeType: settings.shapeType,
    circleRadius: settings.circleRadius,
    rectangleWidth: settings.rectangleWidth,
    rectangleHeight: settings.rectangleHeight,
    rowSpacing: settings.rowSpacing,
    colSpacing: settings.colSpacing
  }), [settings]);

  // 모든 설정 저장 (카메라 위치 제외, 카메라 컨트롤 타입 포함)
  const saveSettings = useCallback(() => {
    const { cameraPositionX, cameraPositionY, cameraPositionZ, ...settingsWithoutCamera } = settings;
    const settingsToSave = {
      ...settingsWithoutCamera,
      colorSeed: colorSeedRef.current,
      cameraControlType: cameraControlType
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsToSave));
  }, [settings, cameraControlType]);

  const initScene = () => {
    initSceneWithControlType(cameraControlType);
  };

  const initSceneWithControlType = useCallback((controlType: 'trackball' | 'orbit') => {
    // 기존 컨트롤 정리
    if (controlsRef.current) {
      controlsRef.current.dispose();
      controlsRef.current = null;
    }

    // 기존 렌더러 정리
    if (rendererRef.current) {
      // 기존 렌더러의 dispose 호출
      rendererRef.current.dispose();

      // DOM 요소 제거
      if (mountRef.current) {
        try {
          if (mountRef.current.contains(rendererRef.current.domElement)) {
            mountRef.current.removeChild(rendererRef.current.domElement);
          }
        } catch (error) {
          console.warn('Failed to remove existing renderer DOM element:', error);
        }
      }

      rendererRef.current = undefined;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({ antialias: true });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(settings.backgroundColor);

    camera.position.set(
      settings.cameraPositionX,
      settings.cameraPositionY,
      settings.cameraPositionZ
    );

    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;

    if (mountRef.current) {
      mountRef.current.appendChild(renderer.domElement);
    }

    // 카메라 컨트롤 설정
    let controls: TrackballControls | OrbitControls;

    if (controlType === 'trackball') {
      const trackballControls = new TrackballControls(camera, renderer.domElement);
      trackballControls.minDistance = cameraDefaults.cameraMinDistance;
      trackballControls.maxDistance = cameraDefaults.cameraMaxDistance;
      trackballControls.noPan = !cameraDefaults.cameraEnablePan;
      trackballControls.rotateSpeed = cameraDefaults.rotateSpeed;
      trackballControls.zoomSpeed = cameraDefaults.zoomSpeed;
      trackballControls.panSpeed = cameraDefaults.panSpeed;
      trackballControls.dynamicDampingFactor = cameraDefaults.dynamicDampingFactor;
      controls = trackballControls;
    } else {
      const orbitControls = new OrbitControls(camera, renderer.domElement);
      orbitControls.minDistance = cameraDefaults.cameraMinDistance;
      orbitControls.maxDistance = cameraDefaults.cameraMaxDistance;
      orbitControls.enablePan = cameraDefaults.cameraEnablePan;
      orbitControls.rotateSpeed = cameraDefaults.rotateSpeed;
      orbitControls.zoomSpeed = cameraDefaults.zoomSpeed;
      orbitControls.panSpeed = cameraDefaults.panSpeed;
      orbitControls.enableDamping = true;
      orbitControls.dampingFactor = cameraDefaults.dynamicDampingFactor;
      controls = orbitControls;
    }

    controlsRef.current = controls;
  }, [settings.cameraPositionX, settings.cameraPositionY, settings.cameraPositionZ, cameraDefaults]);

  const createCircles = useCallback(() => {
    if (!sceneRef.current) return;

    // 기존 원들 제거
    circlesRef.current.forEach(circle => {
      if (circle.mesh) {
        sceneRef.current!.remove(circle.mesh);
      }
    });

    // 새로운 도형들 생성
    const circles = generateCirclePositions(getConfig());
    assignColorGroups(circles, [
      settings.frequency1,
      settings.frequency2,
      settings.frequency3
    ], colorSeedRef.current);

    circles.forEach(circle => {
      const group = new THREE.Group();

      // Create geometry with variable width for this specific circle
      const fillGeometry = createShapeGeometry(
        getConfig(),
        circle.columnIndex,
        settings.enableWidthScaling,
        settings.widthScaleFactor
      );

      const strokeGeometry = createShapeStrokeGeometry(
        getConfig(),
        settings.borderThickness,
        circle.columnIndex,
        settings.enableWidthScaling,
        settings.widthScaleFactor
      );

      // 색상 그룹에 따른 재료 선택
      let fillColor, strokeColor, fillOpacity, strokeOpacity;
      switch (circle.colorGroup) {
        case 0:
          fillColor = rgbToCss(settings.fill1);
          strokeColor = settings.syncColors1 ? rgbToCss(settings.fill1) : rgbToCss(settings.stroke1);
          fillOpacity = settings.fill1.a;
          strokeOpacity = settings.syncColors1 ? settings.fill1.a : settings.stroke1.a;

          break;
        case 1:
          fillColor = rgbToCss(settings.fill2);
          strokeColor = settings.syncColors2 ? rgbToCss(settings.fill2) : rgbToCss(settings.stroke2);
          fillOpacity = settings.fill2.a;
          strokeOpacity = settings.syncColors2 ? settings.fill2.a : settings.stroke2.a;

          break;
        case 2:
          fillColor = rgbToCss(settings.fill3);
          strokeColor = settings.syncColors3 ? rgbToCss(settings.fill3) : rgbToCss(settings.stroke3);
          fillOpacity = settings.fill3.a;
          strokeOpacity = settings.syncColors3 ? settings.fill3.a : settings.stroke3.a;

          break;
        default:
          fillColor = rgbToCss(settings.fill1);
          strokeColor = settings.syncColors1 ? rgbToCss(settings.fill1) : rgbToCss(settings.stroke1);
          fillOpacity = settings.fill1.a;
          strokeOpacity = settings.syncColors1 ? settings.fill1.a : settings.stroke1.a;
      }

      // 채우기
      const fillMaterial = new THREE.MeshBasicMaterial({
        color: fillColor,
        side: THREE.DoubleSide,
        transparent: fillOpacity < 1.0,
        opacity: fillOpacity
      });
      const fillMesh = new THREE.Mesh(fillGeometry, fillMaterial);
      group.add(fillMesh);

      // 테두리
      const strokeMaterial = new THREE.MeshBasicMaterial({
        color: strokeColor,
        side: THREE.DoubleSide,
        transparent: strokeOpacity < 1.0,
        opacity: strokeOpacity
      });
      const strokeMesh = new THREE.Mesh(strokeGeometry, strokeMaterial);
      strokeMesh.position.z = 0.001; // z-fighting 방지를 위해 약간의 오프셋을 적용합니다.
      group.add(strokeMesh);

      // 원래 위치를 userData에 저장
      group.userData.originalPosition = { x: circle.position.x, y: circle.position.y, z: circle.position.z };
      group.position.set(circle.position.x, circle.position.y, circle.position.z);
      
      sceneRef.current!.add(group);
      circle.mesh = group;
      // 현재 도형 타입 초기화
      circle.currentShapeType = getConfig().shapeType;
    });

    circlesRef.current = circles;
    
    // circles 생성 직후 transform 즉시 적용 (깜빡임 방지)
    applyCylindricalTransform(
      circles,
      settings.cylinderCurvature,
      settings.cylinderRadius,
      getConfig(),
      settings.cylinderAxis,
      settings.rotationY
    );

    // Object transform 적용
    circles.forEach(circle => {
      if (!circle.mesh) return;

      // 원래 위치에서 오프셋 적용 (cylindrical transform 후)
      const currentPos = circle.mesh.position;
      circle.mesh.position.set(
        currentPos.x + settings.objectPositionX,
        currentPos.y + settings.objectPositionY,
        currentPos.z + settings.objectPositionZ
      );

      // 통합된 rotation 적용 (cylindrical transform의 rotation은 유지)
      const currentRotation = circle.mesh.rotation;
      circle.mesh.rotation.set(
        settings.rotationX,
        currentRotation.y, // cylindrical transform에서 설정한 rotationY 유지
        settings.rotationZ
      );
    });
  }, [settings, getConfig, rgbToCss]);

  const updateColors = useCallback(() => {
    circlesRef.current.forEach(circle => {
      if (!circle.mesh) return;

      // 색상 그룹에 따른 재료 선택
      let fillColor, strokeColor, fillOpacity, strokeOpacity;
      switch (circle.colorGroup) {
        case 0:
          fillColor = rgbToCss(settings.fill1);
          strokeColor = settings.syncColors1 ? rgbToCss(settings.fill1) : rgbToCss(settings.stroke1);
          fillOpacity = settings.fill1.a;
          strokeOpacity = settings.syncColors1 ? settings.fill1.a : settings.stroke1.a;
          break;
        case 1:
          fillColor = rgbToCss(settings.fill2);
          strokeColor = settings.syncColors2 ? rgbToCss(settings.fill2) : rgbToCss(settings.stroke2);
          fillOpacity = settings.fill2.a;
          strokeOpacity = settings.syncColors2 ? settings.fill2.a : settings.stroke2.a;
          break;
        case 2:
          fillColor = rgbToCss(settings.fill3);
          strokeColor = settings.syncColors3 ? rgbToCss(settings.fill3) : rgbToCss(settings.stroke3);
          fillOpacity = settings.fill3.a;
          strokeOpacity = settings.syncColors3 ? settings.fill3.a : settings.stroke3.a;
          break;
        default:
          fillColor = rgbToCss(settings.fill1);
          strokeColor = settings.syncColors1 ? rgbToCss(settings.fill1) : rgbToCss(settings.stroke1);
          fillOpacity = settings.fill1.a;
          strokeOpacity = settings.syncColors1 ? settings.fill1.a : settings.stroke1.a;
      }

      // 기존 재질 업데이트
      const children = circle.mesh.children;
      if (children.length >= 2) {
        // fill mesh (첫 번째 자식)
        const fillMesh = children[0] as THREE.Mesh;
        if (fillMesh.material) {
          (fillMesh.material as THREE.MeshBasicMaterial).color.set(fillColor);
          (fillMesh.material as THREE.MeshBasicMaterial).opacity = fillOpacity;
          (fillMesh.material as THREE.MeshBasicMaterial).transparent = fillOpacity < 1.0;
        }

        // stroke mesh (두 번째 자식)
        const strokeMesh = children[1] as THREE.Mesh;
        if (strokeMesh.material) {
          (strokeMesh.material as THREE.MeshBasicMaterial).color.set(strokeColor);
          (strokeMesh.material as THREE.MeshBasicMaterial).opacity = strokeOpacity;
          (strokeMesh.material as THREE.MeshBasicMaterial).transparent = strokeOpacity < 1.0;
        }
      }
    });
  }, [settings, rgbToCss]);

  const updateTransforms = useCallback(() => {
    // 먼저 모든 원을 원본 위치로 리셋
    circlesRef.current.forEach(circle => {
      if (!circle.mesh) return;
      const originalPosition = circle.mesh.userData.originalPosition;
      if (originalPosition) {
        circle.mesh.position.set(originalPosition.x, originalPosition.y, originalPosition.z);
        circle.mesh.rotation.set(0, 0, 0);
      }
    });

    // Apply cylindrical transform first
    applyCylindricalTransform(
      circlesRef.current,
      settings.cylinderCurvature,
      settings.cylinderRadius,
      getConfig(),
      settings.cylinderAxis,
      settings.rotationY
    );

    // Then apply object rotations and positions
    circlesRef.current.forEach(circle => {
      if (!circle.mesh) return;

      // 원래 위치에서 오프셋 적용 (cylindrical transform 후)
      const currentPos = circle.mesh.position;
      circle.mesh.position.set(
        currentPos.x + settings.objectPositionX,
        currentPos.y + settings.objectPositionY,
        currentPos.z + settings.objectPositionZ
      );

      // 통합된 rotation 적용 (cylindrical transform의 rotation은 유지)
      const currentRotation = circle.mesh.rotation;
      circle.mesh.rotation.set(
        settings.rotationX,
        currentRotation.y, // cylindrical transform에서 설정한 rotationY 유지
        settings.rotationZ
      );
    });
  }, [settings, getConfig]);

  const resetCameraPosition = () => {
    if (!cameraRef.current || !controlsRef.current) return;

    // 카메라를 초기 위치로 이동
    cameraRef.current.position.set(0, 0, 15);
    cameraRef.current.lookAt(0, 0, 0);

    // 컨트롤 대상 위치도 초기화
    if (controlsRef.current instanceof TrackballControls) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.reset();
      controlsRef.current.update();
    } else if (controlsRef.current instanceof OrbitControls) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.reset();
      controlsRef.current.update();
    }
  };

  const changeCameraControlType = useCallback((type: 'trackball' | 'orbit') => {
    setCameraControlType(type);
    // 설정에 카메라 컨트롤 타입 저장
    setSettings(prev => ({ ...prev, cameraControlType: type }));
    // 즉시 새로운 컨트롤 적용 (타입을 직접 전달)
    initSceneWithControlType(type);
    createCircles();
    // createCircles 후에 updateTransforms 호출
    setTimeout(() => {
      updateTransforms();
    }, 0);
    toast.success(`Camera control changed to ${type.charAt(0).toUpperCase() + type.slice(1)} mode!`);
  }, [initSceneWithControlType, createCircles, updateTransforms, toast]);



  const animate = () => {
    animationIdRef.current = requestAnimationFrame(animate);

    if (controlsRef.current) {
      controlsRef.current.update();
    }

    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  };

  const handleResize = () => {
    if (cameraRef.current && rendererRef.current) {
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    }
  };

  // Effects for auto-update when controls change (색상 제외)
  useEffect(() => {
    if (sceneRef.current) {
      createCircles();
    }
  }, [
    settings.rows, settings.cols, settings.rowSpacing, settings.colSpacing,
    settings.shapeType, settings.circleRadius, settings.rectangleWidth, settings.rectangleHeight,
    settings.enableWidthScaling, settings.widthScaleFactor, settings.borderThickness,
    settings.frequency1, settings.frequency2, settings.frequency3
  ]);

  // 색상 변경 시 재질만 업데이트 (디바운싱 적용)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (sceneRef.current && circlesRef.current.length > 0) {
        updateColors();
      }
    }, 16); // 약 60fps에 해당하는 지연

    return () => clearTimeout(timeoutId);
  }, [
    settings.fill1, settings.stroke1, settings.syncColors1,
    settings.fill2, settings.stroke2, settings.syncColors2,
    settings.fill3, settings.stroke3, settings.syncColors3
  ]);

  useEffect(() => {
    if (sceneRef.current && circlesRef.current.length > 0) {
      updateTransforms();
    }
  }, [
    settings.cylinderAxis, settings.cylinderCurvature, settings.cylinderRadius,
    settings.objectPositionX, settings.objectPositionY, settings.objectPositionZ,
    settings.rotationX, settings.rotationY, settings.rotationZ
  ]);

  // 배경색 변경 디바운싱 및 테마 동적 변경
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (rendererRef.current) {
        rendererRef.current.setClearColor(settings.backgroundColor);
      }

      // 배경색에 따라 테마 동적 변경
      const isDark = isDarkBackground(settings.backgroundColor);
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }, 16); // 약 60fps에 해당하는 지연

    return () => clearTimeout(timeoutId);
  }, [settings.backgroundColor]);

  // 카메라 컨트롤 타입이 변경될 때 씬 재초기화
  useEffect(() => {
    if (sceneRef.current) {
      initSceneWithControlType(cameraControlType);
    }
  }, [cameraControlType, initSceneWithControlType]);



  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.minDistance = cameraDefaults.cameraMinDistance;
      controlsRef.current.maxDistance = cameraDefaults.cameraMaxDistance;
      if (controlsRef.current instanceof TrackballControls) {
        controlsRef.current.noPan = !cameraDefaults.cameraEnablePan;
        controlsRef.current.rotateSpeed = cameraDefaults.rotateSpeed;
        controlsRef.current.zoomSpeed = cameraDefaults.zoomSpeed;
        controlsRef.current.panSpeed = cameraDefaults.panSpeed;
        controlsRef.current.dynamicDampingFactor = cameraDefaults.dynamicDampingFactor;
      } else if (controlsRef.current instanceof OrbitControls) {
        controlsRef.current.enablePan = cameraDefaults.cameraEnablePan;
        controlsRef.current.rotateSpeed = cameraDefaults.rotateSpeed;
        controlsRef.current.zoomSpeed = cameraDefaults.zoomSpeed;
        controlsRef.current.panSpeed = cameraDefaults.panSpeed;
        controlsRef.current.enableDamping = true;
        controlsRef.current.dampingFactor = cameraDefaults.dynamicDampingFactor;
      }
    }
  }, []);

  // Leva 카메라 위치 컨트롤 → 카메라 실시간 적용 (저장되지 않음)
  useEffect(() => {
    if (controlsRef.current && cameraRef.current) {
      const camera = cameraRef.current;
      camera.position.set(settings.cameraPositionX, settings.cameraPositionY, settings.cameraPositionZ);
      controlsRef.current.update();
    }
  }, [settings.cameraPositionX, settings.cameraPositionY, settings.cameraPositionZ]);

  // TrackballControls 이벤트 → Leva 값 동기화
  useEffect(() => {
    if (controlsRef.current && cameraRef.current) {
      const controls = controlsRef.current;
      const camera = cameraRef.current;
      let isUpdating = false;

      const handleChange = () => {
        if (!isUpdating) {
          isUpdating = true;
          requestAnimationFrame(() => {
            // 마우스 드래그/줌/팬으로 카메라가 움직일 때 Leva 값 업데이트
            setMessage('Camera position updated.');
            setTimeout(() => setMessage(''), 3000);
            isUpdating = false;
          });
        }
      };

      // change 이벤트와 함께 update 이벤트도 리스닝
      controls.addEventListener('change', handleChange);
      controls.addEventListener('update', handleChange);

      return () => {
        controls.removeEventListener('change', handleChange);
        controls.removeEventListener('update', handleChange);
      };
    }
  }, []);

  useEffect(() => {
    // URL에서 프로젝트 로드 시도
    const urlLoaded = loadProjectFromURL();

    initScene();
    createCircles();
    animate();

    // 프로젝트 로드 후 카메라를 기본 위치로 리셋
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
      if (rotationAnimationRef.current) {
        cancelAnimationFrame(rotationAnimationRef.current);
      }
      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }
      if (rendererRef.current) {
        // 렌더러의 dispose 호출
        rendererRef.current.dispose();
        if (mountRef.current && mountRef.current.contains(rendererRef.current.domElement)) {
          mountRef.current.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current = undefined;
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []); // 빈 의존성 배열로 변경



  // 키보드 컨트롤 (WASD + Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 입력 모드 확인 (input, textarea, contenteditable 요소에 포커스가 있는지)
      const activeElement = document.activeElement;
      const isInputMode = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).contentEditable === 'true' ||
        activeElement.getAttribute('contenteditable') === 'true'
      );

      // 입력 모드일 때만 모든 키보드 이벤트 무시
      if (isInputMode) {
        return;
      }

      // Ctrl+S 저장 단축키
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        if (activeProject) {
          // 활성 프로젝트가 있으면 Quick Save
          saveToActiveProject();
        } else {
          // 활성 프로젝트가 없으면 저장 모달 열기
          setShowSaveModal(true);
        }
        return;
      }

      // Z 키 Zen 모드 토글
      if (event.key === 'z' || event.key === 'Z') {
        event.preventDefault();
        toggleZenMode();
        return;
      }

      // ? 키 단축키 도움말 토글
      if (event.key === '?' || event.key === '/') {
        event.preventDefault();
        setShowShortcutsGuide(prev => !prev);
        return;
      }

      // WASD 카메라 컨트롤
      if (!controlsRef.current) return;

      const moveSpeed = 0.5;
      const camera = controlsRef.current.object;

      switch (event.code) {
        case 'KeyW':
          camera.position.z -= moveSpeed;
          break;
        case 'KeyS':
          camera.position.z += moveSpeed;
          break;
        case 'KeyA':
          camera.position.x -= moveSpeed;
          break;
        case 'KeyD':
          camera.position.x += moveSpeed;
          break;
        case 'KeyQ':
          camera.position.y += moveSpeed;
          break;
        case 'KeyE':
          camera.position.y -= moveSpeed;
          break;
      }

      // 카메라 위치가 변경되면 controls 업데이트
      controlsRef.current.update();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeProject, showSaveModal, showProjectManager, showProjectDetails]);

  // Auto-save when controls change
  useEffect(() => {
    saveSettings();
  }, [settings, saveSettings]);

  // Load project from URL on page load
  useEffect(() => {
    loadProjectFromURL();
  }, [loadProjectFromURL]);

  // URL에서 프로젝트 설정 로드 (카메라 위치 제외)


  // 강제 업데이트 시 씬 재생성
  useEffect(() => {
    if (forceUpdate > 0) {
      if (sceneRef.current) {
        createCircles();
      }
    }
  }, [forceUpdate]);



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
        onCapture={handleCapture}
        onOpenCaptureList={() => setShowCaptureList(true)}
        isVisible={showControlPanel}
        onToggleVisibility={() => {
          if (isZenMode) {
            // Zen 모드에서 컨트롤 패널만 토글
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
          onSaveToActiveProject={saveToActiveProject}
          onOpenSaveModal={() => setShowSaveModal(true)}
          onClose={() => setShowProjectManager(false)}
          onShowProjectDetails={handleShowProjectDetails}
          onDeleteProjectRequest={handleDeleteProjectRequest}
          toast={toast}
          onShareProject={async (settings) => {
            const projectData = encodeURIComponent(JSON.stringify(settings));
            const shareURL = `${window.location.origin}${window.location.pathname}?project=${projectData}`;

            try {
              // TinyURL API를 사용하여 URL 단축
              const response = await fetch('https://tinyurl.com/api-create.php', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `url=${encodeURIComponent(shareURL)}`
              });

              if (response.ok) {
                const tinyURL = await response.text();

                // 클립보드에 복사
                await navigator.clipboard.writeText(tinyURL);
                toast.success(`TinyURL copied to clipboard!\n${tinyURL}`);
              } else {
                // TinyURL 생성 실패 시 원본 URL 사용
                await navigator.clipboard.writeText(shareURL);
                toast.success(`Share URL copied to clipboard!\n${shareURL}`);
              }
            } catch (error) {
              console.warn('Failed to create TinyURL:', error);
              // 에러 발생 시 원본 URL 사용
              try {
                await navigator.clipboard.writeText(shareURL);
                toast.success(`Share URL copied to clipboard!\n${shareURL}`);
              } catch (clipboardError) {
                // 클립보드 복사 실패 시 URL을 alert로 표시
                alert(`Share URL:\n${shareURL}`);
              }
            }
          }}
        />
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => {
          if (isZenMode) {
            // Zen 모드에서 프로젝트 매니저만 토글
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
          {/* 닫기 버튼 */}
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

              {/* 미리보기 이미지 */}
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

              {/* Structure Settings */}
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

              {/* Appearance Settings */}
              <div className="glass-weak p-3 rounded-xl">
                <h5 className="text-[#007AFF] text-xs font-medium mb-2">Appearance</h5>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-[#666]">Background:</span>
                  <span className="text-[#007AFF] font-medium">{String(selectedProject.settings.backgroundColor)}</span>
                  <span className="text-[#666]">Border:</span>
                  <span className="text-[#007AFF] font-medium">{String(selectedProject.settings.borderThickness)}</span>
                </div>
              </div>

              {/* Transform Settings */}
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

            {/* Action Buttons */}
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
                  // Share functionality would go here
                  setShowProjectDetails(false);
                }}
                className="flex-1 btn-secondary"
              >
                Share
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

export default ThreeScene;