import { useRef, useCallback, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { TrackballControls, OrbitControls } from 'three-stdlib';
import { CircleData, CircleGridConfig, ShapeType } from '../types';
import {
  createShapeGeometry,
  createShapeStrokeGeometry,
  generateCirclePositions,
  assignColorGroups,
  applyCylindricalTransform,
} from '../utils/circleGeometry';
import { isDarkBackground } from '../utils/colorUtils';
import { RENDER_CONSTANTS, CAMERA_DEFAULTS } from '../constants';

interface UseThreeRendererOptions {
  settings: any;
  colorSeedRef: React.MutableRefObject<number>;
  cameraControlType: 'trackball' | 'orbit';
}

export const useThreeRenderer = ({
  settings,
  colorSeedRef,
  cameraControlType,
}: UseThreeRendererOptions) => {
  // Three.js 관련 refs
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const controlsRef = useRef<TrackballControls | OrbitControls | null>(null);
  const circlesRef = useRef<CircleData[]>([]);
  const animationIdRef = useRef<number>();

  // 카메라 기본값
  const cameraDefaults = useMemo(() => ({
    cameraMinDistance: CAMERA_DEFAULTS.MIN_DISTANCE,
    cameraMaxDistance: CAMERA_DEFAULTS.MAX_DISTANCE,
    cameraEnablePan: CAMERA_DEFAULTS.ENABLE_PAN,
    rotateSpeed: CAMERA_DEFAULTS.ROTATE_SPEED,
    zoomSpeed: CAMERA_DEFAULTS.ZOOM_SPEED,
    panSpeed: CAMERA_DEFAULTS.PAN_SPEED,
    dynamicDampingFactor: CAMERA_DEFAULTS.DYNAMIC_DAMPING_FACTOR,
  }), []);

  // RGBA 색상을 CSS 색상 문자열로 변환
  const rgbToCss = useCallback((rgba: { r: number; g: number; b: number; a: number }) => {
    return `rgb(${rgba.r}, ${rgba.g}, ${rgba.b})`;
  }, []);

  // 설정을 CircleGridConfig로 변환
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

  // 씬 초기화
  const initSceneWithControlType = useCallback((controlType: 'trackball' | 'orbit') => {
    // 기존 컨트롤 정리
    if (controlsRef.current) {
      controlsRef.current.dispose();
      controlsRef.current = null;
    }

    // 기존 렌더러 정리
    if (rendererRef.current) {
      rendererRef.current.dispose();

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
      RENDER_CONSTANTS.DEFAULT_FOV,
      window.innerWidth / window.innerHeight,
      RENDER_CONSTANTS.NEAR_PLANE,
      RENDER_CONSTANTS.FAR_PLANE
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
  }, [settings.cameraPositionX, settings.cameraPositionY, settings.cameraPositionZ, settings.backgroundColor, cameraDefaults]);

  // 도형 생성
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
      strokeMesh.position.z = RENDER_CONSTANTS.Z_FIGHTING_OFFSET;
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
  }, [settings, getConfig, rgbToCss, colorSeedRef]);

  // 색상 업데이트
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

  // 변환 업데이트
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

  // 카메라 위치 리셋
  const resetCameraPosition = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current) return;

    // 카메라를 초기 위치로 이동
    cameraRef.current.position.set(
      RENDER_CONSTANTS.DEFAULT_CAMERA_POSITION.x,
      RENDER_CONSTANTS.DEFAULT_CAMERA_POSITION.y,
      RENDER_CONSTANTS.DEFAULT_CAMERA_POSITION.z
    );
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
  }, []);

  // 애니메이션 루프
  const animate = useCallback(() => {
    animationIdRef.current = requestAnimationFrame(animate);

    if (controlsRef.current) {
      controlsRef.current.update();
    }

    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  }, []);

  // 화면 크기 변경 핸들러
  const handleResize = useCallback(() => {
    if (cameraRef.current && rendererRef.current) {
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    }
  }, []);

  // 배경색 변경
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

  // 카메라 위치 동기화
  useEffect(() => {
    if (controlsRef.current && cameraRef.current) {
      const camera = cameraRef.current;
      camera.position.set(settings.cameraPositionX, settings.cameraPositionY, settings.cameraPositionZ);
      controlsRef.current.update();
    }
  }, [settings.cameraPositionX, settings.cameraPositionY, settings.cameraPositionZ]);

  return {
    // Refs
    mountRef,
    sceneRef,
    rendererRef,
    cameraRef,
    controlsRef,
    circlesRef,
    animationIdRef,
    
    // Functions
    initSceneWithControlType,
    createCircles,
    updateColors,
    updateTransforms,
    resetCameraPosition,
    animate,
    handleResize,
    getConfig,
  };
};
