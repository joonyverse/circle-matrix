import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { TrackballControls } from 'three-stdlib';
import { useControls, button, folder } from 'leva';
import { CircleData, CircleGridConfig, ShapeType } from '../types';
import './leva.css';
import {
  createShapeGeometry,
  createShapeStrokeGeometry,
  generateCirclePositions,
  assignColorGroups,
  applyCylindricalTransform
} from '../utils/circleGeometry';

const ThreeScene: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const controlsRef = useRef<TrackballControls | null>(null);
  const circlesRef = useRef<CircleData[]>([]);
  const animationIdRef = useRef<number>();

  // localStorage 키
  const STORAGE_KEY = 'circle-matrix-settings';

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

    // Camera
    cameraPositionX: 0,
    cameraPositionY: 0,
    cameraPositionZ: 15,
    cameraMinDistance: 5,
    cameraMaxDistance: 50,
    cameraEnablePan: true
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

  const initialValues = getDefaultValues();


  // Leva 컨트롤의 특정 값을 리셋하는 함수
  const resetLevaValues = (valuesToReset: { [key: string]: any }) => {
    console.log('Resetting leva values:', valuesToReset);
    set(valuesToReset);
  };

  // Leva 컨트롤 정의
  const [controls, set] = useControls(() => ({
    // ⚙️ Quick Actions
    'Reset All': button(() => {
      resetLevaValues(defaultSettings);
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
      }, { collapsed: false }),
      borderThickness: { value: initialValues.borderThickness, min: 0.05, max: 0.5 }
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
          cameraPositionZ: defaultSettings.cameraPositionZ,
          cameraMinDistance: defaultSettings.cameraMinDistance,
          cameraMaxDistance: defaultSettings.cameraMaxDistance,
          cameraEnablePan: defaultSettings.cameraEnablePan
        });
      }),
      Position: folder({
        cameraPositionX: { value: initialValues.cameraPositionX, min: -50, max: 50 },
        cameraPositionY: { value: initialValues.cameraPositionY, min: -50, max: 50 },
        cameraPositionZ: { value: initialValues.cameraPositionZ, min: -50, max: 50 }
      }, { collapsed: false }),
      Settings: folder({
        cameraMinDistance: { value: initialValues.cameraMinDistance, min: 1, max: 20 },
        cameraMaxDistance: { value: initialValues.cameraMaxDistance, min: 20, max: 200 },
        cameraEnablePan: initialValues.cameraEnablePan
      }, { collapsed: false })
    }, { collapsed: true })
  }));

  // RGBA 색상을 CSS 색상 문자열로 변환
  const rgbToCss = (rgba: { r: number; g: number; b: number; a: number }) => {
    return `rgb(${rgba.r}, ${rgba.g}, ${rgba.b})`;
  };

  // 모든 설정 저장
  const saveSettings = () => {
    const settings = {
      ...controls,
      colorSeed: colorSeedRef.current
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  };

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
    trackballControls.minDistance = controls.cameraMinDistance;
    trackballControls.maxDistance = controls.cameraMaxDistance;
    trackballControls.noPan = !controls.cameraEnablePan;

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
    if (cameraRef.current) {
      cameraRef.current.position.set(
        controls.cameraPositionX,
        controls.cameraPositionY,
        controls.cameraPositionZ
      );
    }
  }, [controls.cameraPositionX, controls.cameraPositionY, controls.cameraPositionZ]);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.minDistance = controls.cameraMinDistance;
      controlsRef.current.maxDistance = controls.cameraMaxDistance;
      if (controlsRef.current instanceof TrackballControls) {
        controlsRef.current.noPan = !controls.cameraEnablePan;
      }
    }
  }, [controls.cameraMinDistance, controls.cameraMaxDistance, controls.cameraEnablePan]);

  useEffect(() => {
    loadSettings();
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
  }, []);

  // Auto-save when controls change
  useEffect(() => {
    saveSettings();
  }, [controls]);

  return <div ref={mountRef} className="w-full h-screen" />;
};

export default ThreeScene;