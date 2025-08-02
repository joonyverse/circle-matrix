import * as THREE from 'three';
import { CircleData, CircleGridConfig, ShapeType } from '../types';

export const createCircleGeometry = (radius: number): THREE.BufferGeometry => {
  const geometry = new THREE.CircleGeometry(radius, 32);
  return geometry;
};

export const createRectangleGeometry = (width: number, height: number): THREE.BufferGeometry => {
  const geometry = new THREE.PlaneGeometry(width, height);
  return geometry;
};

export const createShapeGeometry = (config: CircleGridConfig): THREE.BufferGeometry => {
  switch (config.shapeType) {
    case ShapeType.Circle:
      return createCircleGeometry(config.circleRadius);
    case ShapeType.Rectangle:
      return createRectangleGeometry(config.rectangleWidth, config.rectangleHeight);
    default:
      return createCircleGeometry(config.circleRadius);
  }
};

export const createCircleMaterial = (fillColor: string, strokeColor: string): THREE.Material[] => {
  const fillMaterial = new THREE.MeshBasicMaterial({ 
    color: fillColor,
    side: THREE.DoubleSide
  });
  
  const strokeMaterial = new THREE.MeshBasicMaterial({ 
    color: strokeColor,
    side: THREE.DoubleSide
  });
  
  return [fillMaterial, strokeMaterial];
};

export const createRectangleStrokeGeometry = (width: number, height: number, thickness: number): THREE.BufferGeometry => {
  // 더 간단한 방법: Shape과 holes를 사용해서 테두리 생성
  const shape = new THREE.Shape();
  
  // 외부 직사각형
  shape.moveTo(-width/2, -height/2);
  shape.lineTo(width/2, -height/2);
  shape.lineTo(width/2, height/2);
  shape.lineTo(-width/2, height/2);
  shape.lineTo(-width/2, -height/2);
  
  // 내부 구멍 (테두리 두께만큼 안쪽)
  const innerWidth = width * (1 - thickness);
  const innerHeight = height * (1 - thickness);
  
  if (innerWidth > 0 && innerHeight > 0) {
    const hole = new THREE.Path();
    hole.moveTo(-innerWidth/2, -innerHeight/2);
    hole.lineTo(innerWidth/2, -innerHeight/2);
    hole.lineTo(innerWidth/2, innerHeight/2);
    hole.lineTo(-innerWidth/2, innerHeight/2);
    hole.lineTo(-innerWidth/2, -innerHeight/2);
    shape.holes.push(hole);
  }
  
  const geometry = new THREE.ShapeGeometry(shape);
  return geometry;
};

export const createShapeStrokeGeometry = (config: CircleGridConfig, borderThickness: number): THREE.BufferGeometry => {
  switch (config.shapeType) {
    case ShapeType.Circle: {
      const innerRadius = config.circleRadius * (1 - borderThickness);
      return new THREE.RingGeometry(innerRadius, config.circleRadius, 32);
    }
    case ShapeType.Rectangle: {
      return createRectangleStrokeGeometry(config.rectangleWidth, config.rectangleHeight, borderThickness);
    }
    default: {
      const innerRadius = config.circleRadius * (1 - borderThickness);
      return new THREE.RingGeometry(innerRadius, config.circleRadius, 32);
    }
  }
};

export const generateCirclePositions = (config: CircleGridConfig): CircleData[] => {
  const { rows, cols, rowSpacing, colSpacing } = config;
  const circles: CircleData[] = [];
  
  const totalWidth = (cols - 1) * colSpacing;
  const totalHeight = (rows - 1) * rowSpacing;
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * colSpacing - totalWidth / 2;
      const y = row * rowSpacing - totalHeight / 2;
      const z = 0;
      
      circles.push({
        position: { x, y, z },
        colorGroup: 0 // Will be assigned later
      });
    }
  }
  
  return circles;
};

export const assignColorGroups = (
  circles: CircleData[], 
  frequencies: [number, number, number]
): void => {
  const totalFreq = frequencies[0] + frequencies[1] + frequencies[2];
  const normalizedFreq = frequencies.map(f => f / totalFreq);
  
  circles.forEach(circle => {
    const rand = Math.random();
    if (rand < normalizedFreq[0]) {
      circle.colorGroup = 0;
    } else if (rand < normalizedFreq[0] + normalizedFreq[1]) {
      circle.colorGroup = 1;
    } else {
      circle.colorGroup = 2;
    }
  });
};

export const applyCylindricalTransform = (
  circles: CircleData[],
  curvature: number,
  cylinderRadius: number,
  config: CircleGridConfig,
  axis: 'x' | 'y',
  rotationY: number = 0
): void => {
  const radius = cylinderRadius;
  
  circles.forEach(circle => {
    if (!circle.mesh) return;
    
    if (axis === 'y') {
      // Y축 중심 회전 (기존 방식 - X 좌표를 기준으로 회전)
      const originalX = circle.position.x;
      const angle = (originalX / (config.cols * config.colSpacing)) * Math.PI * 2 * curvature;
      
      const newX = Math.sin(angle) * radius * curvature + originalX * (1 - curvature);
      const newZ = (Math.cos(angle) * radius - radius) * curvature;
      const newY = circle.position.y;
      
      circle.mesh.position.set(newX, newY, newZ);
      circle.mesh.rotation.y = angle + rotationY;
    } else {
      // X축 중심 회전 (Y 좌표를 기준으로 회전)
      const originalY = circle.position.y;
      const angle = (originalY / (config.rows * config.rowSpacing)) * Math.PI * 2 * curvature;
      
      const newY = Math.sin(angle) * radius * curvature + originalY * (1 - curvature);
      const newZ = (Math.cos(angle) * radius - radius) * curvature;
      const newX = circle.position.x;
      
      circle.mesh.position.set(newX, newY, newZ);
      circle.mesh.rotation.x = angle + rotationY;
    }
  });
};

export const applyAxisRotations = (
  circles: CircleData[],
  rotationX: number,
  rotationZ: number
): void => {
  circles.forEach(circle => {
    if (!circle.mesh) return;
    
    circle.mesh.rotation.x = rotationX;
    circle.mesh.rotation.z = rotationZ;
  });
};