import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls, TrackballControls } from 'three-stdlib';
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
  const controlsRef = useRef<OrbitControls | TrackballControls | null>(null);
  const circlesRef = useRef<CircleData[]>([]);
  const guiRef = useRef<dat.GUI>();
  const animationIdRef = useRef<number>();

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
    cameraControlType: 'trackball' as const,
    cameraAutoRotate: false,
    cameraAutoRotateSpeed: 2.0,
    cameraMinDistance: 5,
    cameraMaxDistance: 50,
    cameraEnablePan: true,
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
    regenerateColors: () => {}
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

    // 카메라 컨트롤 설정 (OrbitControls 또는 TrackballControls)
    let cameraControls: OrbitControls | TrackballControls;
    
    if (controls.cameraControlType === 'orbit') {
      const orbitControls = new OrbitControls(camera, renderer.domElement);
      orbitControls.enableDamping = true;
      orbitControls.dampingFactor = 0.05;
      orbitControls.screenSpacePanning = false;
      orbitControls.enablePan = controls.cameraEnablePan;
      orbitControls.minDistance = controls.cameraMinDistance;
      orbitControls.maxDistance = controls.cameraMaxDistance;
      orbitControls.autoRotate = controls.cameraAutoRotate;
      orbitControls.autoRotateSpeed = controls.cameraAutoRotateSpeed;
      // 완전한 360도 상하 회전을 위해 극각 제한 완전 제거
      orbitControls.minPolarAngle = 0;
      orbitControls.maxPolarAngle = Math.PI * 2;
      cameraControls = orbitControls;
    } else {
      const trackballControls = new TrackballControls(camera, renderer.domElement);
      trackballControls.minDistance = controls.cameraMinDistance;
      trackballControls.maxDistance = controls.cameraMaxDistance;
      trackballControls.noPan = !controls.cameraEnablePan;
      // TrackballControls는 자동 회전 기능이 없으므로 수동 구현 필요
      cameraControls = trackballControls;
    }
    
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
    
    if (controlsRef.current instanceof OrbitControls) {
      controlsRef.current.autoRotate = controls.cameraAutoRotate;
      controlsRef.current.autoRotateSpeed = controls.cameraAutoRotateSpeed;
      controlsRef.current.enablePan = controls.cameraEnablePan;
    } else if (controlsRef.current instanceof TrackballControls) {
      controlsRef.current.noPan = !controls.cameraEnablePan;
      // TrackballControls는 자동 회전 기능이 없음
    }
  };

  const initGUI = () => {
    if (guiRef.current) {
      guiRef.current.destroy();
      guiRef.current = null;
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
    });
    group1.addColor(controls.colorGroup1, 'fill').onChange(() => {
      if (controls.colorGroup1.syncColors) {
        controls.colorGroup1.stroke = controls.colorGroup1.fill;
      }
      updateColors();
    });
    group1.addColor(controls.colorGroup1, 'stroke').onChange(() => {
      if (!controls.colorGroup1.syncColors) {
        controls.colorGroup1.originalStroke = controls.colorGroup1.stroke;
        updateColors();
      }
    });
    group1.add(controls.colorGroup1, 'fillOpacity', 0, 1).name('Fill Opacity').onChange(updateColors);
    group1.add(controls.colorGroup1, 'strokeOpacity', 0, 1).name('Stroke Opacity').onChange(updateColors);
    group1.add(controls.colorGroup1, 'frequency', 0, 5);
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
    });
    group2.addColor(controls.colorGroup2, 'fill').onChange(() => {
      if (controls.colorGroup2.syncColors) {
        controls.colorGroup2.stroke = controls.colorGroup2.fill;
      }
      updateColors();
    });
    group2.addColor(controls.colorGroup2, 'stroke').onChange(() => {
      if (!controls.colorGroup2.syncColors) {
        controls.colorGroup2.originalStroke = controls.colorGroup2.stroke;
        updateColors();
      }
    });
    group2.add(controls.colorGroup2, 'fillOpacity', 0, 1).name('Fill Opacity').onChange(updateColors);
    group2.add(controls.colorGroup2, 'strokeOpacity', 0, 1).name('Stroke Opacity').onChange(updateColors);
    group2.add(controls.colorGroup2, 'frequency', 0, 5);
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
    });
    group3.addColor(controls.colorGroup3, 'fill').onChange(() => {
      if (controls.colorGroup3.syncColors) {
        controls.colorGroup3.stroke = controls.colorGroup3.fill;
      }
      updateColors();
    });
    group3.addColor(controls.colorGroup3, 'stroke').onChange(() => {
      if (!controls.colorGroup3.syncColors) {
        controls.colorGroup3.originalStroke = controls.colorGroup3.stroke;
        updateColors();
      }
    });
    group3.add(controls.colorGroup3, 'fillOpacity', 0, 1).name('Fill Opacity').onChange(updateColors);
    group3.add(controls.colorGroup3, 'strokeOpacity', 0, 1).name('Stroke Opacity').onChange(updateColors);
    group3.add(controls.colorGroup3, 'frequency', 0, 5);
    group3.open();

    // 색상 재생성
    controls.regenerateColors = createCircles;
    gui.add(controls, 'regenerateColors').name('Regenerate Colors');

    // 카메라 컨트롤
    const cameraFolder = gui.addFolder('Camera Controls');
    cameraFolder.add(controls, 'cameraControlType', {
      'Orbit Controls': 'orbit',
      'Trackball Controls': 'trackball'
    }).name('Control Type').onChange(() => {
      // 컨트롤 타입이 변경되면 Scene을 다시 초기화
      initScene();
    });
    cameraFolder.add(controls, 'cameraAutoRotate').name('Auto Rotate').onChange(updateCameraControls);
    cameraFolder.add(controls, 'cameraAutoRotateSpeed', -10, 10).name('Rotate Speed').onChange(updateCameraControls);
    cameraFolder.add(controls, 'cameraMinDistance', 1, 20).name('Min Distance').onChange(updateCameraControls);
    cameraFolder.add(controls, 'cameraMaxDistance', 20, 200).name('Max Distance').onChange(updateCameraControls);
    cameraFolder.add(controls, 'cameraEnablePan').name('Enable Pan').onChange(updateCameraControls);
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