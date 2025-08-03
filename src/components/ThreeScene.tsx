import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { TrackballControls } from 'three-stdlib';
import { CircleData, CircleGridConfig, ShapeType } from '../types';
import {
  createShapeGeometry,
  createShapeStrokeGeometry,
  generateCirclePositions,
  assignColorGroups,
  applyCylindricalTransform
} from '../utils/circleGeometry';
import ProjectManager from './ProjectManager';
import SaveProjectModal from './SaveProjectModal';
import { ControlPanel } from './ui/ControlPanel';
import { Modal } from './ui/Modal';
// leva 관련 import 및 코드 제거 완료

interface Project {
  name: string;
  settings: Record<string, unknown>;
  timestamp: number;
}

const ThreeScene: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const controlsRef = useRef<TrackballControls | null>(null);
  const circlesRef = useRef<CircleData[]>([]);
  const animationIdRef = useRef<number>();
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // localStorage 키
  const STORAGE_KEY = 'circle-matrix-settings';
  const PROJECTS_KEY = 'circle-matrix-projects';

  // 랜덤 시드 관리
  const colorSeedRef = useRef<number>(Math.floor(Math.random() * 1000000));

  // 기본값 정의
  const defaultSettings = {
    // Structure
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

    // Transforms
    cylinderAxis: 'y' as const,
    cylinderCurvature: 0,
    cylinderRadius: 8,
    objectPositionX: 0,
    objectPositionY: 0,
    objectPositionZ: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,

    // Appearance - Light theme colors
    backgroundColor: '#f5f7fa',
    frequency1: 1,
    syncColors1: false,
    fill1: { r: 0, g: 122, b: 255, a: 0.8 },
    stroke1: { r: 0, g: 122, b: 255, a: 1.0 },
    frequency2: 1,
    syncColors2: false,
    fill2: { r: 52, g: 199, b: 89, a: 0.8 },
    stroke2: { r: 52, g: 199, b: 89, a: 1.0 },
    frequency3: 1,
    syncColors3: false,
    fill3: { r: 175, g: 82, b: 222, a: 0.8 },
    stroke3: { r: 175, g: 82, b: 222, a: 1.0 },

    // Camera (only position, settings use default values)
    cameraPositionX: 0,
    cameraPositionY: 0,
    cameraPositionZ: 15
  };

  // localStorage에서 설정 로드하는 함수
  const getDefaultValues = () => {
    // localStorage에서 저장된 값이 있으면 로드
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const settings = JSON.parse(saved);

        // 저장된 색상 시드가 있으면 적용
        if (settings.colorSeed !== undefined) {
          colorSeedRef.current = settings.colorSeed;
        }

        // 저장된 값들을 기본값과 병합
        return { ...defaultSettings, ...settings };
      }
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error);
    }

    return defaultSettings;
  };

  // 설정 상태 관리
  const [settings, setSettings] = useState(getDefaultValues);
  const [showControlPanel, setShowControlPanel] = useState(true);

  // 카메라 설정 기본값 (UI에서 제거됨)
  const cameraDefaults = {
    cameraMinDistance: 5,
    cameraMaxDistance: 50,
    cameraEnablePan: true,
    rotateSpeed: 2.0,
    zoomSpeed: 1.5,
    panSpeed: 1.5,
    dynamicDampingFactor: 0.1
  };







  // 설정 변경 핸들러
  const handleSettingChange = useCallback((key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // 모든 설정 리셋
  const handleResetAll = useCallback(() => {
    setSettings(defaultSettings);
    colorSeedRef.current = Math.floor(Math.random() * 1000000);
    createCircles();
    saveSettings();
  }, []);

  // 카메라 리셋
  const handleResetCamera = useCallback(() => {
    resetCameraPosition();
  }, []);

  // 색상 재생성
  const handleRegenerateColors = useCallback(() => {
    colorSeedRef.current = Math.floor(Math.random() * 1000000);
    createCircles();
    saveSettings();
  }, []);

  // URL 공유
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
        setMessage('TinyURL copied to clipboard!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        // TinyURL 생성 실패 시 원본 URL 사용
        await navigator.clipboard.writeText(shareURL);
        setMessage('Share URL copied to clipboard!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.warn('Failed to create TinyURL:', error);
      // 에러 발생 시 원본 URL 사용
      try {
        await navigator.clipboard.writeText(shareURL);
        setMessage('Share URL copied to clipboard!');
        setTimeout(() => setMessage(''), 3000);
      } catch (clipboardError) {
        // 클립보드 복사 실패 시 URL을 alert로 표시
        alert(`Share URL:\n${shareURL}`);
      }
    }
  }, []);

  // 현재 설정을 가져오는 함수 (카메라 위치 제외)
  const getCurrentSettings = useCallback(() => {
    const { cameraPositionX, cameraPositionY, cameraPositionZ, ...settingsWithoutCamera } = settings;
    return {
      ...settingsWithoutCamera,
      colorSeed: colorSeedRef.current
    };
  }, [settings]);

  // 설정을 적용하는 함수 (카메라 위치 제외)
  const applySettings = useCallback((newSettings: Record<string, unknown>) => {
    console.log('🔧 applySettings called with:', Object.keys(newSettings));
    setIsLoadingProject(true);

    // 색상 시드 적용
    if (newSettings.colorSeed !== undefined) {
      colorSeedRef.current = newSettings.colorSeed as number;
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
      applySettings(project.settings);
      setActiveProject(name);

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
    const project: Project = {
      name,
      settings: currentSettings,
      timestamp: Date.now()
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
      setMessage('No active project to save to.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    const updatedProjects = saveProject(activeProject);
    setMessage(`Saved to active project: "${activeProject}"`);
    setTimeout(() => setMessage(''), 3000);
    return updatedProjects;
  }, [activeProject, saveProject]);

  // 저장 모달에서 새 프로젝트 저장하는 함수
  const handleSaveNewProject = useCallback((name: string) => {
    try {
      const updatedProjects = saveProject(name);
      setActiveProject(name);
      setMessage(`Project "${name}" saved successfully.`);
      setTimeout(() => setMessage(''), 3000);
      return updatedProjects;
    } catch (error) {
      console.error('Error saving project:', error);
      setMessage('Error saving project.');
      setTimeout(() => setMessage(''), 3000);
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

        // 카메라 위치를 제외한 설정만 localStorage에 저장
        const { cameraPositionX, cameraPositionY, cameraPositionZ, ...settingsWithoutCamera } = settings;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsWithoutCamera));

        // URL에서 프로젝트 파라미터 제거
        const newURL = window.location.pathname;
        window.history.replaceState({}, '', newURL);

        setMessage('Project loaded from URL successfully.');
        setTimeout(() => setMessage(''), 3000);
        return true;
      } catch (error) {
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
        setMessage('TinyURL copied to clipboard!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        // TinyURL 생성 실패 시 원본 URL 사용
        await navigator.clipboard.writeText(shareURL);
        setMessage('Share URL copied to clipboard!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.warn('Failed to create TinyURL:', error);
      // 에러 발생 시 원본 URL 사용
      try {
        await navigator.clipboard.writeText(shareURL);
        setMessage('Share URL copied to clipboard!');
        setTimeout(() => setMessage(''), 3000);
      } catch (clipboardError) {
        // 클립보드 복사 실패 시 URL을 alert로 표시
        alert(`Share URL:\n${shareURL}`);
      }
    }
  }, [getCurrentSettings]);

  // 메시지 상태 추가
  const [message, setMessage] = useState('');

  // 프로젝트 상세 모달 핸들러
  const handleShowProjectDetails = useCallback((project: Project) => {
    setSelectedProject(project);
    setShowProjectDetails(true);
  }, []);

  // RGBA 색상을 CSS 색상 문자열로 변환
  const rgbToCss = (rgba: { r: number; g: number; b: number; a: number }) => {
    return `rgb(${rgba.r}, ${rgba.g}, ${rgba.b})`;
  };

  // 모든 설정 저장 (카메라 위치 제외)
  const saveSettings = useCallback(() => {
    const { cameraPositionX, cameraPositionY, cameraPositionZ, ...settingsWithoutCamera } = settings;
    const settingsToSave = {
      ...settingsWithoutCamera,
      colorSeed: colorSeedRef.current
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsToSave));
  }, [settings]);



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

  const initScene = () => {
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
    const trackballControls = new TrackballControls(camera, renderer.domElement);
    trackballControls.minDistance = cameraDefaults.cameraMinDistance;
    trackballControls.maxDistance = cameraDefaults.cameraMaxDistance;
    trackballControls.noPan = !cameraDefaults.cameraEnablePan;
    trackballControls.rotateSpeed = cameraDefaults.rotateSpeed;
    trackballControls.zoomSpeed = cameraDefaults.zoomSpeed;
    trackballControls.panSpeed = cameraDefaults.panSpeed;
    trackballControls.dynamicDampingFactor = cameraDefaults.dynamicDampingFactor;

    controlsRef.current = trackballControls;
  };

  const createCircles = () => {
    if (!sceneRef.current) return;

    // 기존 원들 제거
    circlesRef.current.forEach(circle => {
      if (circle.mesh) {
        sceneRef.current!.remove(circle.mesh);
      }
    });

    // 새로운 도형들 생성
    const circles = generateCirclePositions(config);
    assignColorGroups(circles, [
      settings.frequency1,
      settings.frequency2,
      settings.frequency3
    ], colorSeedRef.current);

    circles.forEach(circle => {
      const group = new THREE.Group();

      // Create geometry with variable width for this specific circle
      const fillGeometry = createShapeGeometry(
        config,
        circle.columnIndex,
        settings.enableWidthScaling,
        settings.widthScaleFactor
      );

      const strokeGeometry = createShapeStrokeGeometry(
        config,
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
          strokeOpacity = settings.stroke1.a;
          break;
        case 1:
          fillColor = rgbToCss(settings.fill2);
          strokeColor = settings.syncColors2 ? rgbToCss(settings.fill2) : rgbToCss(settings.stroke2);
          fillOpacity = settings.fill2.a;
          strokeOpacity = settings.stroke2.a;
          break;
        case 2:
          fillColor = rgbToCss(settings.fill3);
          strokeColor = settings.syncColors3 ? rgbToCss(settings.fill3) : rgbToCss(settings.stroke3);
          fillOpacity = settings.fill3.a;
          strokeOpacity = settings.stroke3.a;
          break;
        default:
          fillColor = rgbToCss(settings.fill1);
          strokeColor = settings.syncColors1 ? rgbToCss(settings.fill1) : rgbToCss(settings.stroke1);
          fillOpacity = settings.fill1.a;
          strokeOpacity = settings.stroke1.a;
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

      group.position.set(circle.position.x, circle.position.y, circle.position.z);
      // 원래 위치를 userData에 저장
      group.userData.originalPosition = { x: circle.position.x, y: circle.position.y, z: circle.position.z };
      sceneRef.current!.add(group);
      circle.mesh = group;
    });

    circlesRef.current = circles;
    updateTransforms();
  };

  const updateTransforms = () => {
    // Apply cylindrical transform first
    applyCylindricalTransform(
      circlesRef.current,
      settings.cylinderCurvature,
      settings.cylinderRadius,
      config,
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

      // 통합된 rotation 적용
      circle.mesh.rotation.set(
        settings.rotationX,
        settings.rotationY,
        settings.rotationZ
      );
    });
  };

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
    }
  };

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

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setClearColor(settings.backgroundColor);
    }
  }, [settings.backgroundColor]);



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
  }, [setMessage]);

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
      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }
      if (mountRef.current && rendererRef.current && mountRef.current.contains(rendererRef.current.domElement)) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [loadProjectFromURL]);

  // 키보드 컨트롤 (WASD + Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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

      // 모달이 열려있으면 WASD 키보드 이벤트 무시
      if (showSaveModal || showProjectManager || showProjectDetails) return;

      // WASD 카메라 컨트롤
      if (!controlsRef.current) return;

      const moveSpeed = 0.5;
      const camera = controlsRef.current.object;

      switch (event.code) {
        case 'KeyW':
          camera.position.z -= moveSpeed;
          // Leva 컨트롤 업데이트
          setMessage('Camera position updated.');
          setTimeout(() => setMessage(''), 3000);
          break;
        case 'KeyS':
          camera.position.z += moveSpeed;
          // Leva 컨트롤 업데이트
          setMessage('Camera position updated.');
          setTimeout(() => setMessage(''), 3000);
          break;
        case 'KeyA':
          camera.position.x -= moveSpeed;
          // Leva 컨트롤 업데이트
          setMessage('Camera position updated.');
          setTimeout(() => setMessage(''), 3000);
          break;
        case 'KeyD':
          camera.position.x += moveSpeed;
          // Leva 컨트롤 업데이트
          setMessage('Camera position updated.');
          setTimeout(() => setMessage(''), 3000);
          break;
        case 'KeyQ':
          camera.position.y += moveSpeed;
          // Leva 컨트롤 업데이트
          setMessage('Camera position updated.');
          setTimeout(() => setMessage(''), 3000);
          break;
        case 'KeyE':
          camera.position.y -= moveSpeed;
          // Leva 컨트롤 업데이트
          setMessage('Camera position updated.');
          setTimeout(() => setMessage(''), 3000);
          break;
      }

      // 카메라 위치가 변경되면 controls 업데이트
      controlsRef.current.update();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [setMessage, activeProject, saveToActiveProject, showSaveModal, showProjectManager, showProjectDetails]);

  // Auto-save when controls change
  useEffect(() => {
    saveSettings();
  }, [settings, saveSettings]);

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
        isVisible={showControlPanel}
        onToggleVisibility={() => setShowControlPanel(v => !v)}
      />

      {/* Message Display */}
      {message && (
        <div className="absolute top-4 right-4 z-20 glass-strong text-[#34C759] px-4 py-3 rounded-2xl shadow-lg font-medium text-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#34C759] rounded-full animate-pulse"></div>
            {message}
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoadingProject && (
        <div className="absolute top-4 right-4 z-20 glass-strong text-[#007AFF] px-4 py-3 rounded-2xl shadow-lg font-medium text-sm flex items-center gap-3 animate-fade-in">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#007AFF] border-t-transparent"></div>
          Loading project settings...
        </div>
      )}

      {/* Project Manager Sidebar */}
      <div className={`fixed top-0 left-0 h-full z-10 transition-transform duration-300 ease-in-out ${showProjectManager ? 'translate-x-0' : '-translate-x-full'
        }`}>
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
                setMessage('TinyURL copied to clipboard!');
                setTimeout(() => setMessage(''), 3000);
              } else {
                // TinyURL 생성 실패 시 원본 URL 사용
                await navigator.clipboard.writeText(shareURL);
                setMessage('Project URL copied to clipboard!');
                setTimeout(() => setMessage(''), 3000);
              }
            } catch (error) {
              console.warn('Failed to create TinyURL:', error);
              // 에러 발생 시 원본 URL 사용
              try {
                await navigator.clipboard.writeText(shareURL);
                setMessage('Project URL copied to clipboard!');
                setTimeout(() => setMessage(''), 3000);
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
        onClick={() => setShowProjectManager(!showProjectManager)}
        className={`fixed top-4 left-4 z-20 p-3 rounded-2xl smooth-transition ${showProjectManager
          ? 'opacity-0 pointer-events-none'
          : 'glass-strong text-[#007AFF] hover:text-[#0056CC] hover:scale-105'
          }`}
        title="Open Project Manager"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </button>

      {/* Camera Controls Guide */}
      <div className="fixed bottom-4 left-4 z-20 glass-strong text-[#007AFF] px-4 py-3 rounded-2xl shadow-lg font-medium text-sm">
        <div className="flex items-center gap-6">
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
        </div>
      </div>

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
        >
          <div className="p-4 max-h-96 overflow-y-auto">
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[#007AFF] font-semibold mb-1">{selectedProject.name}</h3>
                  <p className="text-xs text-[#666]">Saved: {new Date(selectedProject.timestamp).toLocaleString('en-US')}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
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
    </div>
  );
};

export default ThreeScene;