import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { TrackballControls } from 'three-stdlib';
import { useControls, button, folder } from 'leva';
import { CircleData, CircleGridConfig, ShapeType } from '../types';
import {
  createShapeGeometry,
  createShapeStrokeGeometry,
  generateCirclePositions,
  assignColorGroups,
  applyCylindricalTransform
} from '../utils/circleGeometry';
import ProjectManager from './ProjectManager';

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

    // Appearance
    backgroundColor: '#1a1a2e',
    frequency1: 1,
    syncColors1: false,
    fill1: { r: 255, g: 107, b: 107, a: 1.0 },
    stroke1: { r: 255, g: 82, b: 82, a: 1.0 },
    frequency2: 1,
    syncColors2: false,
    fill2: { r: 78, g: 205, b: 196, a: 1.0 },
    stroke2: { r: 38, g: 166, b: 154, a: 1.0 },
    frequency3: 1,
    syncColors3: false,
    fill3: { r: 69, g: 183, b: 209, a: 1.0 },
    stroke3: { r: 33, g: 150, b: 243, a: 1.0 },

    // Camera (only position, settings use default values)
    cameraPositionX: 0,
    cameraPositionY: 0,
    cameraPositionZ: 15
  };

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







  // Leva 컨트롤의 특정 값을 리셋하는 함수
  const resetLevaValues = (valuesToReset: { [key: string]: any }) => {
    console.log('Resetting leva values:', valuesToReset);
    set(valuesToReset);
  };

  const initialValues = getDefaultValues();

  // Leva 컨트롤 정의
  const [controls, set] = useControls(() => ({
    // ⚙️ Quick Actions
    'Reset All': button(() => {
      // 실제로 Leva UI에 존재하는 컨트롤들만 리셋
      resetLevaValues({
        rows: defaultSettings.rows,
        cols: defaultSettings.cols,
        rowSpacing: defaultSettings.rowSpacing,
        colSpacing: defaultSettings.colSpacing,
        shapeType: defaultSettings.shapeType,
        circleRadius: defaultSettings.circleRadius,
        rectangleWidth: defaultSettings.rectangleWidth,
        rectangleHeight: defaultSettings.rectangleHeight,
        enableWidthScaling: defaultSettings.enableWidthScaling,
        widthScaleFactor: defaultSettings.widthScaleFactor,
        borderThickness: defaultSettings.borderThickness,
        cylinderAxis: defaultSettings.cylinderAxis,
        cylinderCurvature: defaultSettings.cylinderCurvature,
        cylinderRadius: defaultSettings.cylinderRadius,
        objectPositionX: defaultSettings.objectPositionX,
        objectPositionY: defaultSettings.objectPositionY,
        objectPositionZ: defaultSettings.objectPositionZ,
        rotationX: defaultSettings.rotationX,
        rotationY: defaultSettings.rotationY,
        rotationZ: defaultSettings.rotationZ,
        backgroundColor: defaultSettings.backgroundColor,
        frequency1: defaultSettings.frequency1,
        syncColors1: defaultSettings.syncColors1,
        fill1: defaultSettings.fill1,
        stroke1: defaultSettings.stroke1,
        frequency2: defaultSettings.frequency2,
        syncColors2: defaultSettings.syncColors2,
        fill2: defaultSettings.fill2,
        stroke2: defaultSettings.stroke2,
        frequency3: defaultSettings.frequency3,
        syncColors3: defaultSettings.syncColors3,
        fill3: defaultSettings.fill3,
        stroke3: defaultSettings.stroke3,
        cameraPositionX: defaultSettings.cameraPositionX,
        cameraPositionY: defaultSettings.cameraPositionY,
        cameraPositionZ: defaultSettings.cameraPositionZ
      });
      resetCameraPosition();
      colorSeedRef.current = Math.floor(Math.random() * 1000000);
      createCircles();
      saveSettings();
    }),
    'Reset Camera': button(() => resetCameraPosition()),
    'Regenerate Colors': button(() => {
      colorSeedRef.current = Math.floor(Math.random() * 1000000);
      createCircles();
      saveSettings();
    }),
    'Share URL': button(() => shareProjectURL()),
    'Quick Save': button(() => saveToActiveProject()),

    // 📐 Structure
    Structure: folder({
      'Grid Layout': folder({
        'Reset Grid': button(() => {
          resetLevaValues({
            rows: defaultSettings.rows,
            cols: defaultSettings.cols,
            rowSpacing: defaultSettings.rowSpacing,
            colSpacing: defaultSettings.colSpacing
          });
        }),
        rows: { value: initialValues.rows, min: 1, max: 50, step: 1 },
        cols: { value: initialValues.cols, min: 1, max: 100, step: 1 },
        rowSpacing: { value: initialValues.rowSpacing, min: 0.1, max: 20 },
        colSpacing: { value: initialValues.colSpacing, min: 0.1, max: 20 }
      }, { collapsed: false }),
      'Shape Settings': folder({
        'Reset Shape': button(() => {
          resetLevaValues({
            shapeType: defaultSettings.shapeType,
            circleRadius: defaultSettings.circleRadius,
            rectangleWidth: defaultSettings.rectangleWidth,
            rectangleHeight: defaultSettings.rectangleHeight,
            enableWidthScaling: defaultSettings.enableWidthScaling,
            widthScaleFactor: defaultSettings.widthScaleFactor,
            borderThickness: defaultSettings.borderThickness
          });
        }),
        shapeType: { value: initialValues.shapeType, options: { Circle: ShapeType.Circle, Rectangle: ShapeType.Rectangle } },
        circleRadius: { value: initialValues.circleRadius, min: 0.1, max: 12 },
        rectangleWidth: { value: initialValues.rectangleWidth, min: 0.2, max: 12 },
        rectangleHeight: { value: initialValues.rectangleHeight, min: 0.2, max: 12 },
        enableWidthScaling: initialValues.enableWidthScaling,
        widthScaleFactor: { value: initialValues.widthScaleFactor, min: 1.0, max: 10.0 }
      }, { collapsed: false })
    }, { collapsed: true }),

    // 🔄 Transforms
    Transforms: folder({
      'Cylinder Roll': folder({
        'Reset Cylinder': button(() => {
          resetLevaValues({
            cylinderAxis: defaultSettings.cylinderAxis,
            cylinderCurvature: defaultSettings.cylinderCurvature,
            cylinderRadius: defaultSettings.cylinderRadius
          });
        }),
        cylinderAxis: { value: initialValues.cylinderAxis, options: { 'Y-Axis (Horizontal)': 'y', 'X-Axis (Vertical)': 'x' } },
        cylinderCurvature: { value: initialValues.cylinderCurvature, min: 0, max: 1 },
        cylinderRadius: { value: initialValues.cylinderRadius, min: 2, max: 20 }
      }, { collapsed: false }),
      'Object Transform': folder({
        'Reset Transform': button(() => {
          resetLevaValues({
            objectPositionX: defaultSettings.objectPositionX,
            objectPositionY: defaultSettings.objectPositionY,
            objectPositionZ: defaultSettings.objectPositionZ,
            rotationX: defaultSettings.rotationX,
            rotationY: defaultSettings.rotationY,
            rotationZ: defaultSettings.rotationZ
          });
        }),
        Position: folder({
          objectPositionX: { value: initialValues.objectPositionX, min: -20, max: 20 },
          objectPositionY: { value: initialValues.objectPositionY, min: -20, max: 20 },
          objectPositionZ: { value: initialValues.objectPositionZ, min: -20, max: 20 }
        }, { collapsed: false }),
        Rotation: folder({
          rotationX: { value: initialValues.rotationX, min: -Math.PI, max: Math.PI },
          rotationY: { value: initialValues.rotationY, min: -Math.PI, max: Math.PI },
          rotationZ: { value: initialValues.rotationZ, min: -Math.PI, max: Math.PI }
        }, { collapsed: false })
      }, { collapsed: false })
    }, { collapsed: true }),

    // 🎨 Appearance
    Appearance: folder({
      backgroundColor: initialValues.backgroundColor,
      'Reset Border': button(() => {
        resetLevaValues({
          borderThickness: defaultSettings.borderThickness
        });
      }),
      borderThickness: { value: initialValues.borderThickness, min: 0.05, max: 0.5 },
      'Color Group 1': folder({
        'Reset Group 1': button(() => {
          resetLevaValues({
            frequency1: defaultSettings.frequency1,
            syncColors1: defaultSettings.syncColors1,
            fill1: defaultSettings.fill1,
            stroke1: defaultSettings.stroke1
          });
        }),
        frequency1: { value: initialValues.frequency1, min: 0, max: 5 },
        syncColors1: initialValues.syncColors1,
        fill1: initialValues.fill1,
        stroke1: initialValues.stroke1
      }, { collapsed: false }),
      'Color Group 2': folder({
        'Reset Group 2': button(() => {
          resetLevaValues({
            frequency2: defaultSettings.frequency2,
            syncColors2: defaultSettings.syncColors2,
            fill2: defaultSettings.fill2,
            stroke2: defaultSettings.stroke2
          });
        }),
        frequency2: { value: initialValues.frequency2, min: 0, max: 5 },
        syncColors2: initialValues.syncColors2,
        fill2: initialValues.fill2,
        stroke2: initialValues.stroke2
      }, { collapsed: false }),
      'Color Group 3': folder({
        'Reset Group 3': button(() => {
          resetLevaValues({
            frequency3: defaultSettings.frequency3,
            syncColors3: defaultSettings.syncColors3,
            fill3: defaultSettings.fill3,
            stroke3: defaultSettings.stroke3
          });
        }),
        frequency3: { value: initialValues.frequency3, min: 0, max: 5 },
        syncColors3: initialValues.syncColors3,
        fill3: initialValues.fill3,
        stroke3: initialValues.stroke3
      }, { collapsed: false })
    }, { collapsed: true }),

    // 📹 Camera
    Camera: folder({
      'Reset Camera Settings': button(() => {
        resetLevaValues({
          cameraPositionX: defaultSettings.cameraPositionX,
          cameraPositionY: defaultSettings.cameraPositionY,
          cameraPositionZ: defaultSettings.cameraPositionZ
        });
      }),
      Position: folder({
        cameraPositionX: { value: initialValues.cameraPositionX, min: -50, max: 50 },
        cameraPositionY: { value: initialValues.cameraPositionY, min: -50, max: 50 },
        cameraPositionZ: { value: initialValues.cameraPositionZ, min: -50, max: 50 }
      }, { collapsed: false }),
      Settings: folder({
        // Camera settings removed - using default values only
      }, { collapsed: false })
    }, { collapsed: true })
  }));

  // 현재 설정을 가져오는 함수
  const getCurrentSettings = useCallback(() => {
    return {
      ...controls,
      colorSeed: colorSeedRef.current
    };
  }, [controls]);

  // 설정을 적용하는 함수 (새로고침 없이)
  const applySettings = useCallback((settings: Record<string, unknown>) => {
    console.log('🔧 applySettings called with:', Object.keys(settings));
    setIsLoadingProject(true);

    // 색상 시드 적용
    if (settings.colorSeed !== undefined) {
      colorSeedRef.current = settings.colorSeed as number;
      console.log('🎨 Color seed set to:', colorSeedRef.current);
    }

    // 설정을 localStorage에 저장
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    console.log('💾 Settings saved to localStorage');

    // Leva 컨트롤 값들을 단계적으로 업데이트
    console.log('🎛️ Applying settings to Leva controls...');

    const applySettingsWithDelay = async () => {
      const settingsToApply = Object.keys(settings).filter(key =>
        key !== 'colorSeed' && settings[key] !== undefined
      );

      console.log(`📋 Applying ${settingsToApply.length} settings...`);

      // 먼저 한 번에 적용 시도
      try {
        const batchSettings: Record<string, unknown> = {};
        settingsToApply.forEach(key => {
          batchSettings[key] = settings[key];
        });

        console.log('🎯 Attempting batch update...');
        set(batchSettings);
        console.log('✅ Batch update successful');
        return;
      } catch {
        console.warn('⚠️ Batch update failed, trying individual updates...');
      }

      // 개별 적용
      for (const key of settingsToApply) {
        try {
          console.log(`🔧 Setting ${key} to:`, settings[key]);
          set({ [key]: settings[key] });
          // 각 설정 사이에 지연
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (error) {
          console.warn(`⚠️ Failed to set ${key}:`, error);
        }
      }
      console.log('✅ All settings applied');
    };

    applySettingsWithDelay();

    // 강제 업데이트로 씬 재생성
    setTimeout(() => {
      setForceUpdate(prev => prev + 1);
      setIsLoadingProject(false);
      console.log('✅ Project loading completed');
    }, 1500);
  }, [set]);

  // 프로젝트 로드 후 씬 업데이트를 위한 함수
  const loadProjectAndUpdate = useCallback((name: string) => {
    console.log('🔄 loadProjectAndUpdate called for:', name);
    const savedProjects = localStorage.getItem(PROJECTS_KEY);
    console.log('📦 Saved projects:', savedProjects ? 'exists' : 'not found');

    if (!savedProjects) {
      console.log('❌ No saved projects found');
      return null;
    }

    const projects: Project[] = JSON.parse(savedProjects);
    console.log('📋 Projects found:', projects.length);
    console.log('📝 Available projects:', projects.map(p => p.name));

    const project = projects.find(p => p.name === name);
    console.log('🎯 Project found:', project ? project.name : 'not found');
    console.log('🎯 Project details:', project ? {
      name: project.name,
      timestamp: new Date(project.timestamp).toLocaleString(),
      settingsKeys: Object.keys(project.settings)
    } : 'null');

    if (project) {
      console.log('✅ Applying project settings...');
      console.log('🔧 Project settings preview:', {
        rows: project.settings.rows,
        cols: project.settings.cols,
        backgroundColor: project.settings.backgroundColor,
        colorSeed: project.settings.colorSeed
      });
      applySettings(project.settings);
      setActiveProject(name); // 활성 프로젝트 설정
      return project;
    }
    console.log('❌ Project not found');
    return null;
  }, [applySettings]);

  // 프로젝트 저장 함수
  const saveProject = useCallback((name: string) => {
    console.log('💾 saveProject called for:', name);
    const currentSettings = getCurrentSettings();
    const project: Project = {
      name,
      settings: currentSettings,
      timestamp: Date.now()
    };

    console.log('📝 Project to save:', {
      name: project.name,
      timestamp: new Date(project.timestamp).toLocaleString(),
      settingsKeys: Object.keys(project.settings)
    });

    // Structure 변수들이 모두 저장되는지 확인
    console.log('🔍 Structure variables check:', {
      rows: currentSettings.rows,
      cols: currentSettings.cols,
      rowSpacing: currentSettings.rowSpacing,
      colSpacing: currentSettings.colSpacing,
      shapeType: currentSettings.shapeType,
      circleRadius: currentSettings.circleRadius,
      rectangleWidth: currentSettings.rectangleWidth,
      rectangleHeight: currentSettings.rectangleHeight,
      enableWidthScaling: currentSettings.enableWidthScaling,
      widthScaleFactor: currentSettings.widthScaleFactor
    });

    const savedProjects = localStorage.getItem(PROJECTS_KEY);
    const projects: Project[] = savedProjects ? JSON.parse(savedProjects) : [];
    console.log('📦 Existing projects:', projects.map(p => p.name));

    // 같은 이름의 프로젝트가 있으면 업데이트, 없으면 추가
    const existingIndex = projects.findIndex(p => p.name === name);
    if (existingIndex >= 0) {
      console.log('🔄 Updating existing project at index:', existingIndex);
      projects[existingIndex] = project;
    } else {
      console.log('➕ Adding new project');
      projects.push(project);
    }

    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    console.log('💾 Projects saved. Total projects:', projects.length);

    // 활성 프로젝트로 설정
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

    console.log('💾 saveToActiveProject called for:', activeProject);
    const updatedProjects = saveProject(activeProject);
    setMessage(`Saved to active project: "${activeProject}"`);
    setTimeout(() => setMessage(''), 3000);
    return updatedProjects;
  }, [activeProject, saveProject]);

  // 프로젝트 로드 함수
  const loadProject = useCallback((name: string) => {
    console.log('📂 loadProject called for:', name);
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

  // URL에서 프로젝트 설정 로드
  const loadProjectFromURL = useCallback(() => {
    console.log('🔍 loadProjectFromURL called');
    const urlParams = new URLSearchParams(window.location.search);
    const projectData = urlParams.get('project');
    console.log('📋 URL project data:', projectData ? 'exists' : 'not found');

    if (projectData) {
      try {
        console.log('🔄 Decoding project data...');
        const settings = JSON.parse(decodeURIComponent(projectData));
        console.log('✅ Settings decoded:', Object.keys(settings));

        // 색상 시드 적용
        if (settings.colorSeed !== undefined) {
          colorSeedRef.current = settings.colorSeed as number;
          console.log('🎨 Color seed applied:', colorSeedRef.current);
        }

        // 설정을 localStorage에 저장
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        console.log('💾 Settings saved to localStorage');

        // URL에서 프로젝트 파라미터 제거하여 무한 루프 방지
        const newURL = window.location.pathname;
        window.history.replaceState({}, '', newURL);
        console.log('🧹 URL cleaned:', newURL);

        setMessage('Project loaded from URL successfully.');
        setTimeout(() => setMessage(''), 3000);
        return true;
      } catch (error) {
        console.error('❌ Failed to load project from URL:', error);
        return false;
      }
    }
    console.log('📭 No project data in URL');
    return false;
  }, []);

  // 현재 설정을 URL로 공유
  const shareProjectURL = useCallback(() => {
    const currentSettings = getCurrentSettings();
    const projectData = encodeURIComponent(JSON.stringify(currentSettings));
    const shareURL = `${window.location.origin}${window.location.pathname}?project=${projectData}`;

    // 클립보드에 복사
    navigator.clipboard.writeText(shareURL).then(() => {
      setMessage('Share URL copied to clipboard!');
      setTimeout(() => setMessage(''), 3000);
    }).catch(() => {
      // 클립보드 복사 실패 시 URL을 alert로 표시
      alert(`Share URL:\n${shareURL}`);
    });
  }, [getCurrentSettings]);

  // 메시지 상태 추가
  const [message, setMessage] = useState('');

  // RGBA 색상을 CSS 색상 문자열로 변환
  const rgbToCss = (rgba: { r: number; g: number; b: number; a: number }) => {
    return `rgb(${rgba.r}, ${rgba.g}, ${rgba.b})`;
  };

  // 모든 설정 저장
  const saveSettings = useCallback(() => {
    const settings = {
      ...controls,
      colorSeed: colorSeedRef.current
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [controls]);

  // 모든 설정 로드
  const loadSettings = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const settings = JSON.parse(saved);

        // 저장된 색상 시드가 있으면 적용
        if (settings.colorSeed !== undefined) {
          colorSeedRef.current = settings.colorSeed;
        }
      }
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error);
    }
  };

  const config: CircleGridConfig = {
    rows: controls.rows,
    cols: controls.cols,
    shapeType: controls.shapeType,
    circleRadius: controls.circleRadius,
    rectangleWidth: controls.rectangleWidth,
    rectangleHeight: controls.rectangleHeight,
    rowSpacing: controls.rowSpacing,
    colSpacing: controls.colSpacing
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
    renderer.setClearColor(controls.backgroundColor);

    camera.position.set(
      controls.cameraPositionX,
      controls.cameraPositionY,
      controls.cameraPositionZ
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
      controls.frequency1,
      controls.frequency2,
      controls.frequency3
    ], colorSeedRef.current);

    circles.forEach(circle => {
      const group = new THREE.Group();

      // Create geometry with variable width for this specific circle
      const fillGeometry = createShapeGeometry(
        config,
        circle.columnIndex,
        controls.enableWidthScaling,
        controls.widthScaleFactor
      );

      const strokeGeometry = createShapeStrokeGeometry(
        config,
        controls.borderThickness,
        circle.columnIndex,
        controls.enableWidthScaling,
        controls.widthScaleFactor
      );

      // 색상 그룹에 따른 재료 선택
      let fillColor, strokeColor, fillOpacity, strokeOpacity;
      switch (circle.colorGroup) {
        case 0:
          fillColor = rgbToCss(controls.fill1);
          strokeColor = controls.syncColors1 ? rgbToCss(controls.fill1) : rgbToCss(controls.stroke1);
          fillOpacity = controls.fill1.a;
          strokeOpacity = controls.stroke1.a;
          break;
        case 1:
          fillColor = rgbToCss(controls.fill2);
          strokeColor = controls.syncColors2 ? rgbToCss(controls.fill2) : rgbToCss(controls.stroke2);
          fillOpacity = controls.fill2.a;
          strokeOpacity = controls.stroke2.a;
          break;
        case 2:
          fillColor = rgbToCss(controls.fill3);
          strokeColor = controls.syncColors3 ? rgbToCss(controls.fill3) : rgbToCss(controls.stroke3);
          fillOpacity = controls.fill3.a;
          strokeOpacity = controls.stroke3.a;
          break;
        default:
          fillColor = rgbToCss(controls.fill1);
          strokeColor = controls.syncColors1 ? rgbToCss(controls.fill1) : rgbToCss(controls.stroke1);
          fillOpacity = controls.fill1.a;
          strokeOpacity = controls.stroke1.a;
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
      controls.cylinderCurvature,
      controls.cylinderRadius,
      config,
      controls.cylinderAxis,
      controls.rotationY
    );

    // Then apply object rotations and positions
    circlesRef.current.forEach(circle => {
      if (!circle.mesh) return;

      // 원래 위치에서 오프셋 적용 (cylindrical transform 후)
      const currentPos = circle.mesh.position;
      circle.mesh.position.set(
        currentPos.x + controls.objectPositionX,
        currentPos.y + controls.objectPositionY,
        currentPos.z + controls.objectPositionZ
      );

      // 통합된 rotation 적용
      circle.mesh.rotation.set(
        controls.rotationX,
        controls.rotationY,
        controls.rotationZ
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
    controls.rows, controls.cols, controls.rowSpacing, controls.colSpacing,
    controls.shapeType, controls.circleRadius, controls.rectangleWidth, controls.rectangleHeight,
    controls.enableWidthScaling, controls.widthScaleFactor, controls.borderThickness,
    controls.frequency1, controls.frequency2, controls.frequency3,
    controls.fill1, controls.stroke1, controls.syncColors1,
    controls.fill2, controls.stroke2, controls.syncColors2,
    controls.fill3, controls.stroke3, controls.syncColors3
  ]);

  useEffect(() => {
    if (sceneRef.current && circlesRef.current.length > 0) {
      updateTransforms();
    }
  }, [
    controls.cylinderAxis, controls.cylinderCurvature, controls.cylinderRadius,
    controls.objectPositionX, controls.objectPositionY, controls.objectPositionZ,
    controls.rotationX, controls.rotationY, controls.rotationZ
  ]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setClearColor(controls.backgroundColor);
    }
  }, [controls.backgroundColor]);



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

  // Leva 카메라 위치 컨트롤 → 카메라 실시간 적용
  useEffect(() => {
    if (controlsRef.current && cameraRef.current) {
      const camera = cameraRef.current;
      camera.position.set(controls.cameraPositionX, controls.cameraPositionY, controls.cameraPositionZ);
      controlsRef.current.update();
    }
  }, [controls.cameraPositionX, controls.cameraPositionY, controls.cameraPositionZ]);

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
            set({
              cameraPositionX: camera.position.x,
              cameraPositionY: camera.position.y,
              cameraPositionZ: camera.position.z
            });
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
  }, [set]);

  useEffect(() => {
    console.log('🚀 Component initialized');
    loadSettings();

    // URL에서 프로젝트 로드 시도
    const urlLoaded = loadProjectFromURL();
    console.log('🌐 URL load result:', urlLoaded);

    initScene();
    createCircles();
    animate();

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

  // WASD 키보드 컨트롤
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!controlsRef.current) return;

      const moveSpeed = 0.5;
      const camera = controlsRef.current.object;

      switch (event.code) {
        case 'KeyW':
          camera.position.z -= moveSpeed;
          // Leva 컨트롤 업데이트
          set({ cameraPositionZ: camera.position.z });
          break;
        case 'KeyS':
          camera.position.z += moveSpeed;
          // Leva 컨트롤 업데이트
          set({ cameraPositionZ: camera.position.z });
          break;
        case 'KeyA':
          camera.position.x -= moveSpeed;
          // Leva 컨트롤 업데이트
          set({ cameraPositionX: camera.position.x });
          break;
        case 'KeyD':
          camera.position.x += moveSpeed;
          // Leva 컨트롤 업데이트
          set({ cameraPositionX: camera.position.x });
          break;
        case 'KeyQ':
          camera.position.y += moveSpeed;
          // Leva 컨트롤 업데이트
          set({ cameraPositionY: camera.position.y });
          break;
        case 'KeyE':
          camera.position.y -= moveSpeed;
          // Leva 컨트롤 업데이트
          set({ cameraPositionY: camera.position.y });
          break;
      }

      // 카메라 위치가 변경되면 controls 업데이트
      controlsRef.current.update();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [set]);

  // Auto-save when controls change
  useEffect(() => {
    saveSettings();
  }, [controls, saveSettings]);

  // 강제 업데이트 시 씬 재생성
  useEffect(() => {
    if (forceUpdate > 0) {
      console.log('🔄 Force updating scene...');
      if (sceneRef.current) {
        createCircles();
      }
    }
  }, [forceUpdate]);



  return (
    <div className="relative w-full h-screen">
      <div ref={mountRef} className="w-full h-screen" />

      {/* Message Display */}
      {message && (
        <div className="absolute top-4 right-4 z-20 bg-[#2a2a2a] text-[#4ade80] px-4 py-2 rounded-lg shadow-lg border border-[#3a3a3a] font-mono text-sm">
          {message}
        </div>
      )}

      {/* Loading Indicator */}
      {isLoadingProject && (
        <div className="absolute top-4 right-4 z-20 bg-[#2a2a2a] text-[#60a5fa] px-4 py-2 rounded-lg shadow-lg border border-[#3a3a3a] font-mono text-sm flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#60a5fa]"></div>
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
          onClose={() => setShowProjectManager(false)}
          onShareProject={(settings) => {
            const projectData = encodeURIComponent(JSON.stringify(settings));
            const shareURL = `${window.location.origin}${window.location.pathname}?project=${projectData}`;

            navigator.clipboard.writeText(shareURL).then(() => {
              setMessage('Project URL copied to clipboard!');
              setTimeout(() => setMessage(''), 3000);
            }).catch(() => {
              alert(`Share URL:\n${shareURL}`);
            });
          }}
        />
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setShowProjectManager(!showProjectManager)}
        className={`fixed top-4 left-4 z-20 p-2 rounded-lg transition-all duration-300 ${showProjectManager
          ? 'opacity-0 pointer-events-none'
          : 'bg-[#1a1a1a] text-[#888] hover:text-[#e0e0e0] hover:bg-[#2a2a2a]'
          }`}
        title="Open Project Manager"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </button>

      {/* Camera Controls Guide */}
      <div className="fixed bottom-4 left-4 z-20 bg-[#1a1a1a] text-[#888] px-3 py-2 rounded-lg shadow-lg border border-[#3a3a3a] font-mono text-xs">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-[#60a5fa]">WASD:</span> Move Camera
          </div>
          <div>
            <span className="text-[#60a5fa]">QE:</span> Up/Down
          </div>
          <div>
            <span className="text-[#60a5fa]">Mouse:</span> Rotate/Zoom
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreeScene;