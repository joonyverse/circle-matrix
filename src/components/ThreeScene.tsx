import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import * as dat from 'dat.gui';
import { CircleData, GuiControls, CircleGridConfig } from '../types';
import {
  createCircleGeometry,
  createCircleMaterial,
  generateCirclePositions,
  assignColorGroups,
  applyCylindricalTransform
} from '../utils/circleGeometry';

const ThreeScene: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const controlsRef = useRef<any>();
  const circlesRef = useRef<CircleData[]>([]);
  const guiRef = useRef<dat.GUI>();
  const animationIdRef = useRef<number>();

  const config: CircleGridConfig = {
    rows: 3,
    cols: 12,
    circleRadius: 0.8,
    spacing: 2
  };

  const controls: GuiControls = {
    backgroundColor: '#1a1a2e',
    cylinderCurvature: 0,
    cylinderRadius: 8,
    borderThickness: 0.15,
    colorGroup1: {
      fill: '#ff6b6b',
      stroke: '#ff5252',
      frequency: 1
    },
    colorGroup2: {
      fill: '#4ecdc4',
      stroke: '#26a69a',
      frequency: 1
    },
    colorGroup3: {
      fill: '#45b7d1',
      stroke: '#2196f3',
      frequency: 1
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

    // OrbitControls 설정
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;
    orbitControls.screenSpacePanning = false;
    orbitControls.minDistance = 5;
    orbitControls.maxDistance = 50;
    controlsRef.current = orbitControls;
  };

  const createCircles = () => {
    if (!sceneRef.current) return;

    // 기존 원들 제거
    circlesRef.current.forEach(circle => {
      if (circle.mesh) {
        sceneRef.current!.remove(circle.mesh);
      }
    });

    // 새로운 원들 생성
    const circles = generateCirclePositions(config);
    assignColorGroups(circles, [
      controls.colorGroup1.frequency,
      controls.colorGroup2.frequency,
      controls.colorGroup3.frequency
    ]);

    const geometry = createCircleGeometry(config.circleRadius);
    
    const createStrokeGeometry = () => {
      const innerRadius = config.circleRadius * (1 - controls.borderThickness);
      return new THREE.RingGeometry(innerRadius, config.circleRadius, 32);
    };

    circles.forEach(circle => {
      const group = new THREE.Group();
      
      // 색상 그룹에 따른 재료 선택
      let fillColor, strokeColor;
      switch (circle.colorGroup) {
        case 0:
          fillColor = controls.colorGroup1.fill;
          strokeColor = controls.colorGroup1.stroke;
          break;
        case 1:
          fillColor = controls.colorGroup2.fill;
          strokeColor = controls.colorGroup2.stroke;
          break;
        case 2:
          fillColor = controls.colorGroup3.fill;
          strokeColor = controls.colorGroup3.stroke;
          break;
        default:
          fillColor = controls.colorGroup1.fill;
          strokeColor = controls.colorGroup1.stroke;
      }

      // 채우기
      const fillMaterial = new THREE.MeshBasicMaterial({ 
        color: fillColor,
        side: THREE.DoubleSide
      });
      const fillMesh = new THREE.Mesh(geometry, fillMaterial);
      group.add(fillMesh);

      // 테두리
      const strokeMaterial = new THREE.MeshBasicMaterial({ 
        color: strokeColor,
        side: THREE.DoubleSide
      });
      const strokeGeometry = createStrokeGeometry();
      const strokeMesh = new THREE.Mesh(strokeGeometry, strokeMaterial);
      group.add(strokeMesh);

      group.position.set(circle.position.x, circle.position.y, circle.position.z);
      sceneRef.current!.add(group);
      circle.mesh = group;
    });

    circlesRef.current = circles;
    applyCylindricalTransform(circles, controls.cylinderCurvature, controls.cylinderRadius, config);
  };

  const updateColors = () => {
    circlesRef.current.forEach(circle => {
      if (!circle.mesh) return;
      
      let fillColor, strokeColor;
      switch (circle.colorGroup) {
        case 0:
          fillColor = controls.colorGroup1.fill;
          strokeColor = controls.colorGroup1.stroke;
          break;
        case 1:
          fillColor = controls.colorGroup2.fill;
          strokeColor = controls.colorGroup2.stroke;
          break;
        case 2:
          fillColor = controls.colorGroup3.fill;
          strokeColor = controls.colorGroup3.stroke;
          break;
        default:
          fillColor = controls.colorGroup1.fill;
          strokeColor = controls.colorGroup1.stroke;
      }

      const fillMesh = circle.mesh.children[0] as THREE.Mesh;
      const strokeMesh = circle.mesh.children[1] as THREE.Mesh;
      
      (fillMesh.material as THREE.MeshBasicMaterial).color.set(fillColor);
      (strokeMesh.material as THREE.MeshBasicMaterial).color.set(strokeColor);
    });
  };

  const updateBorderThickness = () => {
    circlesRef.current.forEach(circle => {
      if (!circle.mesh) return;
      
      const strokeMesh = circle.mesh.children[1] as THREE.Mesh;
      const innerRadius = config.circleRadius * (1 - controls.borderThickness);
      const newStrokeGeometry = new THREE.RingGeometry(innerRadius, config.circleRadius, 32);
      
      strokeMesh.geometry.dispose();
      strokeMesh.geometry = newStrokeGeometry;
    });
  };

  const updateCylindricalTransform = () => {
    applyCylindricalTransform(
      circlesRef.current, 
      controls.cylinderCurvature, 
      controls.cylinderRadius, 
      config
    );
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
    cylinderFolder.add(controls, 'cylinderCurvature', 0, 1).name('Curvature').onChange(updateCylindricalTransform);
    cylinderFolder.add(controls, 'cylinderRadius', 2, 20).name('Radius').onChange(updateCylindricalTransform);
    cylinderFolder.open();

    // 테두리 두께
    gui.add(controls, 'borderThickness', 0.05, 0.5).name('Border Thickness').onChange(updateBorderThickness);

    // 색상 그룹 1
    const group1 = gui.addFolder('Color Group 1');
    group1.addColor(controls.colorGroup1, 'fill').onChange(updateColors);
    group1.addColor(controls.colorGroup1, 'stroke').onChange(updateColors);
    group1.add(controls.colorGroup1, 'frequency', 0, 5);
    group1.open();

    // 색상 그룹 2
    const group2 = gui.addFolder('Color Group 2');
    group2.addColor(controls.colorGroup2, 'fill').onChange(updateColors);
    group2.addColor(controls.colorGroup2, 'stroke').onChange(updateColors);
    group2.add(controls.colorGroup2, 'frequency', 0, 5);
    group2.open();

    // 색상 그룹 3
    const group3 = gui.addFolder('Color Group 3');
    group3.addColor(controls.colorGroup3, 'fill').onChange(updateColors);
    group3.addColor(controls.colorGroup3, 'stroke').onChange(updateColors);
    group3.add(controls.colorGroup3, 'frequency', 0, 5);
    group3.open();

    // 색상 재생성
    controls.regenerateColors = createCircles;
    gui.add(controls, 'regenerateColors').name('Regenerate Colors');
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
        guiRef.current = null;
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