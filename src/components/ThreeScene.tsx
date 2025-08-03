import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { TrackballControls } from 'three-stdlib';
import * as dat from 'dat.gui';
import { CircleData, GuiControls, CircleGridConfig, ShapeType } from '../types';
import {
  createShapeGeometry,
  createShapeStrokeGeometry,
  generateCirclePositions,
  assignColorGroups,
  applyCylindricalTransform,
  applyAxisRotations
} from '../utils/circleGeometry';

const ThreeScene: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const controlsRef = useRef<TrackballControls | null>(null);
  const circlesRef = useRef<CircleData[]>([]);
  const guiRef = useRef<dat.GUI>();
  const animationIdRef = useRef<number>();

  // localStorage 키
  const STORAGE_KEY = 'circle-matrix-color-settings';

  // 색상 설정 저장
  const saveColorSettings = () => {
    const colorSettings = {
      colorGroup1: controls.colorGroup1,
      colorGroup2: controls.colorGroup2,
      colorGroup3: controls.colorGroup3
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colorSettings));
  };

  // 색상 설정 로드
  const loadColorSettings = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const colorSettings = JSON.parse(saved);

        // 저장된 설정이 있으면 적용
        if (colorSettings.colorGroup1) {
          Object.assign(controls.colorGroup1, colorSettings.colorGroup1);
        }
        if (colorSettings.colorGroup2) {
          Object.assign(controls.colorGroup2, colorSettings.colorGroup2);
        }
        if (colorSettings.colorGroup3) {
          Object.assign(controls.colorGroup3, colorSettings.colorGroup3);
        }
      }
    } catch (error) {
      console.warn('Failed to load color settings from localStorage:', error);
    }
  };

  const config: CircleGridConfig = {
    rows: 3,
    cols: 12,
    shapeType: ShapeType.Circle,
    circleRadius: 0.8,
    rectangleWidth: 1.6,
    rectangleHeight: 1.2,
    rowSpacing: 2,
    colSpacing: 2
  };

  const controls: GuiControls = {
    backgroundColor: '#1a1a2e',
    cylinderCurvature: 0,
    cylinderRadius: 8,
    cylinderAxis: 'y' as const,
    borderThickness: 0.15,
    shapeType: ShapeType.Circle,
    circleRadius: 0.8,
    rectangleWidth: 1.6,
    rectangleHeight: 1.2,
    enableWidthScaling: false,
    widthScaleFactor: 2.0,
    rows: 3,
    cols: 12,
    rowSpacing: 2,
    colSpacing: 2,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    cameraMinDistance: 5,
    cameraMaxDistance: 50,
    cameraEnablePan: true,
    cameraPositionX: 0,
    cameraPositionY: 0,
    cameraPositionZ: 15,
    cameraRotationX: 0,
    cameraRotationY: 0,
    cameraRotationZ: 0,
    objectPositionX: 0,
    objectPositionY: 0,
    objectPositionZ: 0,
    objectRotationX: 0,
    objectRotationY: 0,
    objectRotationZ: 0,
    colorGroup1: {
      fill: '#ff6b6b',
      stroke: '#ff5252',
      originalStroke: '#ff5252',
      fillOpacity: 1.0,
      strokeOpacity: 1.0,
      frequency: 1,
      syncColors: false
    },
    colorGroup2: {
      fill: '#4ecdc4',
      stroke: '#26a69a',
      originalStroke: '#26a69a',
      fillOpacity: 1.0,
      strokeOpacity: 1.0,
      frequency: 1,
      syncColors: false
    },
    colorGroup3: {
      fill: '#45b7d1',
      stroke: '#2196f3',
      originalStroke: '#2196f3',
      fillOpacity: 1.0,
      strokeOpacity: 1.0,
      frequency: 1,
      syncColors: false
    },
    regenerateColors: () => { },
    resetCamera: () => { }
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

    camera.position.set(0, 0, 15);

    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;

    if (mountRef.current) {
      mountRef.current.appendChild(renderer.domElement);
    }

    // 카메라 컨트롤 설정 (TrackballControls만 사용)
    const trackballControls = new TrackballControls(camera, renderer.domElement);
    trackballControls.minDistance = controls.cameraMinDistance;
    trackballControls.maxDistance = controls.cameraMaxDistance;
    trackballControls.noPan = !controls.cameraEnablePan;
    const cameraControls = trackballControls;

    controlsRef.current = cameraControls;
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
    const currentConfig = {
      ...config,
      rows: controls.rows,
      cols: controls.cols,
      shapeType: controls.shapeType,
      circleRadius: controls.circleRadius,
      rectangleWidth: controls.rectangleWidth,
      rectangleHeight: controls.rectangleHeight,
      rowSpacing: controls.rowSpacing,
      colSpacing: controls.colSpacing
    };
    const circles = generateCirclePositions(currentConfig);
    assignColorGroups(circles, [
      controls.colorGroup1.frequency,
      controls.colorGroup2.frequency,
      controls.colorGroup3.frequency
    ]);

    circles.forEach(circle => {
      const group = new THREE.Group();

      // Create geometry with variable width for this specific circle
      const fillGeometry = createShapeGeometry(
        currentConfig,
        circle.columnIndex,
        controls.enableWidthScaling,
        controls.widthScaleFactor
      );

      const strokeGeometry = createShapeStrokeGeometry(
        currentConfig,
        controls.borderThickness,
        circle.columnIndex,
        controls.enableWidthScaling,
        controls.widthScaleFactor
      );

      // 색상 그룹에 따른 재료 선택
      let fillColor, strokeColor;
      switch (circle.colorGroup) {
        case 0:
          fillColor = controls.colorGroup1.fill;
          strokeColor = controls.colorGroup1.syncColors ? controls.colorGroup1.fill : controls.colorGroup1.stroke;
          break;
        case 1:
          fillColor = controls.colorGroup2.fill;
          strokeColor = controls.colorGroup2.syncColors ? controls.colorGroup2.fill : controls.colorGroup2.stroke;
          break;
        case 2:
          fillColor = controls.colorGroup3.fill;
          strokeColor = controls.colorGroup3.syncColors ? controls.colorGroup3.fill : controls.colorGroup3.stroke;
          break;
        default:
          fillColor = controls.colorGroup1.fill;
          strokeColor = controls.colorGroup1.syncColors ? controls.colorGroup1.fill : controls.colorGroup1.stroke;
      }

      // 투명도 설정
      let fillOpacity, strokeOpacity;
      switch (circle.colorGroup) {
        case 0:
          fillOpacity = controls.colorGroup1.fillOpacity;
          strokeOpacity = controls.colorGroup1.strokeOpacity;
          break;
        case 1:
          fillOpacity = controls.colorGroup2.fillOpacity;
          strokeOpacity = controls.colorGroup2.strokeOpacity;
          break;
        case 2:
          fillOpacity = controls.colorGroup3.fillOpacity;
          strokeOpacity = controls.colorGroup3.strokeOpacity;
          break;
        default:
          fillOpacity = controls.colorGroup1.fillOpacity;
          strokeOpacity = controls.colorGroup1.strokeOpacity;
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
      group.add(strokeMesh);

      group.position.set(circle.position.x, circle.position.y, circle.position.z);
      // 원래 위치를 userData에 저장
      group.userData.originalPosition = { x: circle.position.x, y: circle.position.y, z: circle.position.z };
      sceneRef.current!.add(group);
      circle.mesh = group;
    });

    circlesRef.current = circles;
    applyCylindricalTransform(circles, controls.cylinderCurvature, controls.cylinderRadius, currentConfig, controls.cylinderAxis, controls.rotationY);
    applyAxisRotations(circles, controls.rotationX, controls.rotationZ);
  };

  const updateColors = () => {
    circlesRef.current.forEach(circle => {
      if (!circle.mesh) return;

      let fillColor, strokeColor;
      switch (circle.colorGroup) {
        case 0:
          fillColor = controls.colorGroup1.fill;
          strokeColor = controls.colorGroup1.syncColors ? controls.colorGroup1.fill : controls.colorGroup1.stroke;
          break;
        case 1:
          fillColor = controls.colorGroup2.fill;
          strokeColor = controls.colorGroup2.syncColors ? controls.colorGroup2.fill : controls.colorGroup2.stroke;
          break;
        case 2:
          fillColor = controls.colorGroup3.fill;
          strokeColor = controls.colorGroup3.syncColors ? controls.colorGroup3.fill : controls.colorGroup3.stroke;
          break;
        default:
          fillColor = controls.colorGroup1.fill;
          strokeColor = controls.colorGroup1.syncColors ? controls.colorGroup1.fill : controls.colorGroup1.stroke;
      }

      // 투명도 설정
      let fillOpacity, strokeOpacity;
      switch (circle.colorGroup) {
        case 0:
          fillOpacity = controls.colorGroup1.fillOpacity;
          strokeOpacity = controls.colorGroup1.strokeOpacity;
          break;
        case 1:
          fillOpacity = controls.colorGroup2.fillOpacity;
          strokeOpacity = controls.colorGroup2.strokeOpacity;
          break;
        case 2:
          fillOpacity = controls.colorGroup3.fillOpacity;
          strokeOpacity = controls.colorGroup3.strokeOpacity;
          break;
        default:
          fillOpacity = controls.colorGroup1.fillOpacity;
          strokeOpacity = controls.colorGroup1.strokeOpacity;
      }

      const fillMesh = circle.mesh.children[0] as THREE.Mesh;
      const strokeMesh = circle.mesh.children[1] as THREE.Mesh;

      const fillMaterial = fillMesh.material as THREE.MeshBasicMaterial;
      const strokeMaterial = strokeMesh.material as THREE.MeshBasicMaterial;

      fillMaterial.color.set(fillColor);
      fillMaterial.transparent = fillOpacity < 1.0;
      fillMaterial.opacity = fillOpacity;

      strokeMaterial.color.set(strokeColor);
      strokeMaterial.transparent = strokeOpacity < 1.0;
      strokeMaterial.opacity = strokeOpacity;
    });
  };

  const updateBorderThickness = () => {
    const currentConfig = {
      ...config,
      rows: controls.rows,
      cols: controls.cols,
      shapeType: controls.shapeType,
      circleRadius: controls.circleRadius,
      rectangleWidth: controls.rectangleWidth,
      rectangleHeight: controls.rectangleHeight,
      rowSpacing: controls.rowSpacing,
      colSpacing: controls.colSpacing
    };

    circlesRef.current.forEach(circle => {
      if (!circle.mesh) return;

      const strokeMesh = circle.mesh.children[1] as THREE.Mesh;
      const newStrokeGeometry = createShapeStrokeGeometry(
        currentConfig,
        controls.borderThickness,
        circle.columnIndex,
        controls.enableWidthScaling,
        controls.widthScaleFactor
      );

      strokeMesh.geometry.dispose();
      strokeMesh.geometry = newStrokeGeometry;
    });
  };

  const updateShapeSize = () => {
    const currentConfig = {
      ...config,
      rows: controls.rows,
      cols: controls.cols,
      shapeType: controls.shapeType,
      circleRadius: controls.circleRadius,
      rectangleWidth: controls.rectangleWidth,
      rectangleHeight: controls.rectangleHeight,
      rowSpacing: controls.rowSpacing,
      colSpacing: controls.colSpacing
    };

    circlesRef.current.forEach(circle => {
      if (!circle.mesh) return;

      // 채우기 기하학 업데이트
      const fillMesh = circle.mesh.children[0] as THREE.Mesh;
      const newFillGeometry = createShapeGeometry(
        currentConfig,
        circle.columnIndex,
        controls.enableWidthScaling,
        controls.widthScaleFactor
      );
      fillMesh.geometry.dispose();
      fillMesh.geometry = newFillGeometry;

      // 테두리 기하학 업데이트
      const strokeMesh = circle.mesh.children[1] as THREE.Mesh;
      const newStrokeGeometry = createShapeStrokeGeometry(
        currentConfig,
        controls.borderThickness,
        circle.columnIndex,
        controls.enableWidthScaling,
        controls.widthScaleFactor
      );
      strokeMesh.geometry.dispose();
      strokeMesh.geometry = newStrokeGeometry;
    });
  };

  const updateCylindricalTransform = () => {
    const currentConfig = {
      ...config,
      rows: controls.rows,
      cols: controls.cols,
      shapeType: controls.shapeType,
      circleRadius: controls.circleRadius,
      rectangleWidth: controls.rectangleWidth,
      rectangleHeight: controls.rectangleHeight,
      rowSpacing: controls.rowSpacing,
      colSpacing: controls.colSpacing
    };
    applyCylindricalTransform(
      circlesRef.current,
      controls.cylinderCurvature,
      controls.cylinderRadius,
      currentConfig,
      controls.cylinderAxis,
      controls.rotationY
    );
    applyAxisRotations(circlesRef.current, controls.rotationX, controls.rotationZ);
  };

  const updateAxisRotations = () => {
    const currentConfig = {
      ...config,
      rows: controls.rows,
      cols: controls.cols,
      shapeType: controls.shapeType,
      circleRadius: controls.circleRadius,
      rectangleWidth: controls.rectangleWidth,
      rectangleHeight: controls.rectangleHeight,
      rowSpacing: controls.rowSpacing,
      colSpacing: controls.colSpacing
    };
    applyCylindricalTransform(
      circlesRef.current,
      controls.cylinderCurvature,
      controls.cylinderRadius,
      currentConfig,
      controls.cylinderAxis,
      controls.rotationY
    );
    applyAxisRotations(circlesRef.current, controls.rotationX, controls.rotationZ);
  };

  const updateCameraControls = () => {
    if (!controlsRef.current) return;

    controlsRef.current.minDistance = controls.cameraMinDistance;
    controlsRef.current.maxDistance = controls.cameraMaxDistance;

    if (controlsRef.current instanceof TrackballControls) {
      controlsRef.current.noPan = !controls.cameraEnablePan;
      // TrackballControls는 자동 회전 기능이 없음
    }
  };

  const updateCameraPosition = () => {
    if (!cameraRef.current) return;
    
    cameraRef.current.position.set(
      controls.cameraPositionX,
      controls.cameraPositionY,
      controls.cameraPositionZ
    );
  };

  const updateCameraRotation = () => {
    if (!cameraRef.current) return;
    
    cameraRef.current.rotation.set(
      controls.cameraRotationX,
      controls.cameraRotationY,
      controls.cameraRotationZ
    );
  };

  const updateObjectTransform = () => {
    circlesRef.current.forEach(circle => {
      if (!circle.mesh) return;
      
      // 원래 위치에서 오프셋 적용
      const originalPos = circle.mesh.userData.originalPosition || circle.position;
      circle.mesh.position.set(
        originalPos.x + controls.objectPositionX,
        originalPos.y + controls.objectPositionY,
        originalPos.z + controls.objectPositionZ
      );
      
      circle.mesh.rotation.set(
        controls.objectRotationX,
        controls.objectRotationY,
        controls.objectRotationZ
      );
    });
  };

  const resetCameraPosition = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    
    // 컨트롤 값들을 초기화
    controls.cameraPositionX = 0;
    controls.cameraPositionY = 0;
    controls.cameraPositionZ = 15;
    controls.cameraRotationX = 0;
    controls.cameraRotationY = 0;
    controls.cameraRotationZ = 0;
    
    // 카메라를 초기 위치로 이동
    cameraRef.current.position.set(0, 0, 15);
    cameraRef.current.rotation.set(0, 0, 0);
    cameraRef.current.lookAt(0, 0, 0);
    
    // 컨트롤 대상 위치도 초기화
    if (controlsRef.current instanceof TrackballControls) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.reset();
      controlsRef.current.update();
    }
    
    // GUI 컨트롤들도 업데이트
    if (guiRef.current) {
      guiRef.current.updateDisplay();
    }
  };

  const initGUI = () => {
    if (guiRef.current) {
      guiRef.current.destroy();
      guiRef.current = null;
    }

    const gui = new dat.GUI();
    guiRef.current = gui;

    // 배경색
    gui.addColor(controls, 'backgroundColor').onChange((value: string) => {
      if (rendererRef.current) {
        rendererRef.current.setClearColor(value);
      }
    });

    // 원통 변형
    const cylinderFolder = gui.addFolder('Cylinder Transform');
    cylinderFolder.add(controls, 'cylinderAxis', {
      'Y-Axis (Horizontal Roll)': 'y',
      'X-Axis (Vertical Roll)': 'x'
    }).name('Cylinder Axis').onChange(updateCylindricalTransform);
    cylinderFolder.add(controls, 'cylinderCurvature', 0, 1).name('Curvature').onChange(updateCylindricalTransform);
    cylinderFolder.add(controls, 'cylinderRadius', 2, 20).name('Radius').onChange(updateCylindricalTransform);
    cylinderFolder.open();

    // 격자 설정
    const gridFolder = gui.addFolder('Grid Settings');
    gridFolder.add(controls, 'rows', 1, 50).step(1).name('Rows').onChange(createCircles);
    gridFolder.add(controls, 'cols', 1, 100).step(1).name('Columns').onChange(createCircles);
    gridFolder.add(controls, 'rowSpacing', 0.1, 20).name('Row Spacing').onChange(createCircles);
    gridFolder.add(controls, 'colSpacing', 0.1, 20).name('Column Spacing').onChange(createCircles);
    gridFolder.open();

    // 도형 설정
    const shapeFolder = gui.addFolder('Shape Settings');
    shapeFolder.add(controls, 'shapeType', {
      'Circle': ShapeType.Circle,
      'Rectangle': ShapeType.Rectangle
    }).name('Shape Type').onChange(createCircles);
    shapeFolder.add(controls, 'circleRadius', 0.1, 3).name('Circle Radius').onChange(updateShapeSize);
    shapeFolder.add(controls, 'rectangleWidth', 0.2, 4).name('Rectangle Width').onChange(updateShapeSize);
    shapeFolder.add(controls, 'rectangleHeight', 0.2, 4).name('Rectangle Height').onChange(updateShapeSize);
    shapeFolder.add(controls, 'enableWidthScaling').name('Enable Width Scaling').onChange(updateShapeSize);
    shapeFolder.add(controls, 'widthScaleFactor', 1.0, 5.0).name('Width Scale Factor').onChange(updateShapeSize);
    shapeFolder.open();


    // 테두리 두께
    gui.add(controls, 'borderThickness', 0.05, 0.5).name('Border Thickness').onChange(updateBorderThickness);

    // 축 회전
    const rotationFolder = gui.addFolder('Axis Rotations');
    rotationFolder.add(controls, 'rotationX', -Math.PI, Math.PI).name('Rotation X').onChange(updateAxisRotations);
    rotationFolder.add(controls, 'rotationY', -Math.PI, Math.PI).name('Rotation Y').onChange(updateAxisRotations);
    rotationFolder.add(controls, 'rotationZ', -Math.PI, Math.PI).name('Rotation Z').onChange(updateAxisRotations);
    rotationFolder.open();

    // 색상 그룹 1
    const group1 = gui.addFolder('Color Group 1');
    group1.add(controls.colorGroup1, 'syncColors').name('Sync Fill & Stroke').onChange(() => {
      if (controls.colorGroup1.syncColors) {
        controls.colorGroup1.stroke = controls.colorGroup1.fill;
      } else {
        controls.colorGroup1.stroke = controls.colorGroup1.originalStroke;
      }
      updateColors();
      saveColorSettings();
    });
    group1.addColor(controls.colorGroup1, 'fill').onChange(() => {
      if (controls.colorGroup1.syncColors) {
        controls.colorGroup1.stroke = controls.colorGroup1.fill;
      }
      updateColors();
      saveColorSettings();
    });
    group1.addColor(controls.colorGroup1, 'stroke').onChange(() => {
      if (!controls.colorGroup1.syncColors) {
        controls.colorGroup1.originalStroke = controls.colorGroup1.stroke;
        updateColors();
      }
      saveColorSettings();
    });
    group1.add(controls.colorGroup1, 'fillOpacity', 0, 1).name('Fill Opacity').onChange(() => {
      updateColors();
      saveColorSettings();
    });
    group1.add(controls.colorGroup1, 'strokeOpacity', 0, 1).name('Stroke Opacity').onChange(() => {
      updateColors();
      saveColorSettings();
    });
    group1.add(controls.colorGroup1, 'frequency', 0, 5).onChange(saveColorSettings);
    group1.open();

    // 색상 그룹 2
    const group2 = gui.addFolder('Color Group 2');
    group2.add(controls.colorGroup2, 'syncColors').name('Sync Fill & Stroke').onChange(() => {
      if (controls.colorGroup2.syncColors) {
        controls.colorGroup2.stroke = controls.colorGroup2.fill;
      } else {
        controls.colorGroup2.stroke = controls.colorGroup2.originalStroke;
      }
      updateColors();
      saveColorSettings();
    });
    group2.addColor(controls.colorGroup2, 'fill').onChange(() => {
      if (controls.colorGroup2.syncColors) {
        controls.colorGroup2.stroke = controls.colorGroup2.fill;
      }
      updateColors();
      saveColorSettings();
    });
    group2.addColor(controls.colorGroup2, 'stroke').onChange(() => {
      if (!controls.colorGroup2.syncColors) {
        controls.colorGroup2.originalStroke = controls.colorGroup2.stroke;
        updateColors();
      }
      saveColorSettings();
    });
    group2.add(controls.colorGroup2, 'fillOpacity', 0, 1).name('Fill Opacity').onChange(() => {
      updateColors();
      saveColorSettings();
    });
    group2.add(controls.colorGroup2, 'strokeOpacity', 0, 1).name('Stroke Opacity').onChange(() => {
      updateColors();
      saveColorSettings();
    });
    group2.add(controls.colorGroup2, 'frequency', 0, 5).onChange(saveColorSettings);
    group2.open();

    // 색상 그룹 3
    const group3 = gui.addFolder('Color Group 3');
    group3.add(controls.colorGroup3, 'syncColors').name('Sync Fill & Stroke').onChange(() => {
      if (controls.colorGroup3.syncColors) {
        controls.colorGroup3.stroke = controls.colorGroup3.fill;
      } else {
        controls.colorGroup3.stroke = controls.colorGroup3.originalStroke;
      }
      updateColors();
      saveColorSettings();
    });
    group3.addColor(controls.colorGroup3, 'fill').onChange(() => {
      if (controls.colorGroup3.syncColors) {
        controls.colorGroup3.stroke = controls.colorGroup3.fill;
      }
      updateColors();
      saveColorSettings();
    });
    group3.addColor(controls.colorGroup3, 'stroke').onChange(() => {
      if (!controls.colorGroup3.syncColors) {
        controls.colorGroup3.originalStroke = controls.colorGroup3.stroke;
        updateColors();
      }
      saveColorSettings();
    });
    group3.add(controls.colorGroup3, 'fillOpacity', 0, 1).name('Fill Opacity').onChange(() => {
      updateColors();
      saveColorSettings();
    });
    group3.add(controls.colorGroup3, 'strokeOpacity', 0, 1).name('Stroke Opacity').onChange(() => {
      updateColors();
      saveColorSettings();
    });
    group3.add(controls.colorGroup3, 'frequency', 0, 5).onChange(saveColorSettings);
    group3.open();

    // 색상 재생성
    controls.regenerateColors = createCircles;
    gui.add(controls, 'regenerateColors').name('Regenerate Colors');

    // 카메라 리셋
    controls.resetCamera = resetCameraPosition;
    gui.add(controls, 'resetCamera').name('Reset Camera View');

    // 카메라 컨트롤
    const cameraFolder = gui.addFolder('📹 Camera Controls');
    
    // 카메라 위치
    const cameraPosFolder = cameraFolder.addFolder('Camera Position');
    cameraPosFolder.add(controls, 'cameraPositionX', -50, 50).name('Position X').onChange(updateCameraPosition);
    cameraPosFolder.add(controls, 'cameraPositionY', -50, 50).name('Position Y').onChange(updateCameraPosition);
    cameraPosFolder.add(controls, 'cameraPositionZ', -50, 50).name('Position Z').onChange(updateCameraPosition);
    
    // 카메라 회전
    const cameraRotFolder = cameraFolder.addFolder('Camera Rotation');
    cameraRotFolder.add(controls, 'cameraRotationX', -Math.PI, Math.PI).name('Rotation X').onChange(updateCameraRotation);
    cameraRotFolder.add(controls, 'cameraRotationY', -Math.PI, Math.PI).name('Rotation Y').onChange(updateCameraRotation);
    cameraRotFolder.add(controls, 'cameraRotationZ', -Math.PI, Math.PI).name('Rotation Z').onChange(updateCameraRotation);
    
    // 카메라 설정
    const cameraSettingsFolder = cameraFolder.addFolder('Camera Settings');
    cameraSettingsFolder.add(controls, 'cameraMinDistance', 1, 20).name('Min Distance').onChange(updateCameraControls);
    cameraSettingsFolder.add(controls, 'cameraMaxDistance', 20, 200).name('Max Distance').onChange(updateCameraControls);
    cameraSettingsFolder.add(controls, 'cameraEnablePan').name('Enable Pan').onChange(updateCameraControls);
    
    // 오브젝트 변형
    const objectFolder = gui.addFolder('🎯 Object Transform');
    
    // 오브젝트 위치
    const objectPosFolder = objectFolder.addFolder('Object Position');
    objectPosFolder.add(controls, 'objectPositionX', -20, 20).name('Position X').onChange(updateObjectTransform);
    objectPosFolder.add(controls, 'objectPositionY', -20, 20).name('Position Y').onChange(updateObjectTransform);
    objectPosFolder.add(controls, 'objectPositionZ', -20, 20).name('Position Z').onChange(updateObjectTransform);
    
    // 오브젝트 회전
    const objectRotFolder = objectFolder.addFolder('Object Rotation');
    objectRotFolder.add(controls, 'objectRotationX', -Math.PI, Math.PI).name('Rotation X').onChange(updateObjectTransform);
    objectRotFolder.add(controls, 'objectRotationY', -Math.PI, Math.PI).name('Rotation Y').onChange(updateObjectTransform);
    objectRotFolder.add(controls, 'objectRotationZ', -Math.PI, Math.PI).name('Rotation Z').onChange(updateObjectTransform);
    
    cameraFolder.open();
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

  useEffect(() => {
    loadColorSettings(); // 저장된 색상 설정 로드
    initScene();
    createCircles();
    initGUI();
    animate();

    window.addEventListener('resize', handleResize);

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (guiRef.current) {
        guiRef.current.destroy();
        guiRef.current = null;
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

  return <div ref={mountRef} className="w-full h-screen" />;
};

export default ThreeScene;