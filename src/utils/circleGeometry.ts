import * as THREE from 'three';
import { CircleData, CircleGridConfig } from '../types';

export const createCircleGeometry = (radius: number): THREE.BufferGeometry => {
  const geometry = new THREE.CircleGeometry(radius, 32);
  return geometry;
};

export const createCircleMaterial = (fillColor: string, strokeColor: string): THREE.Material[] => {
  const fillMaterial = new THREE.MeshBasicMaterial({ 
    color: fillColor,
    side: THREE.DoubleSide
  });
  
  const strokeGeometry = new THREE.RingGeometry(0.95, 1, 32);
  const strokeMaterial = new THREE.MeshBasicMaterial({ 
    color: strokeColor,
    side: THREE.DoubleSide
  });
  
  return [fillMaterial, strokeMaterial];
};

export const generateCirclePositions = (config: CircleGridConfig): CircleData[] => {
  const { rows, cols, circleRadius, spacing } = config;
  const circles: CircleData[] = [];
  
  const totalWidth = (cols - 1) * spacing;
  const totalHeight = (rows - 1) * spacing;
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * spacing - totalWidth / 2;
      const y = row * spacing - totalHeight / 2;
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
  config: CircleGridConfig
): void => {
  const radius = cylinderRadius;
  
  circles.forEach(circle => {
    if (!circle.mesh) return;
    
    const originalX = circle.position.x;
    const angle = (originalX / (config.cols * config.spacing)) * Math.PI * 2 * curvature;
    
    const newX = Math.sin(angle) * radius * curvature + originalX * (1 - curvature);
    const newZ = (Math.cos(angle) * radius - radius) * curvature;
    const newY = circle.position.y;
    
    circle.mesh.position.set(newX, newY, newZ);
    circle.mesh.rotation.y = angle;
  });
};