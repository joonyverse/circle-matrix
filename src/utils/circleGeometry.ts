import * as THREE from 'three';
import { CircleData, CircleGridConfig, ShapeType } from '../types';

export const createCircleGeometry = (radius: number): THREE.BufferGeometry => {
  const geometry = new THREE.CircleGeometry(radius, 512);
  return geometry;
};

export const createRectangleGeometry = (width: number, height: number): THREE.BufferGeometry => {
  const geometry = new THREE.PlaneGeometry(width, height);
  return geometry;
};

export const calculateScaledWidth = (
  baseWidth: number,
  columnIndex: number,
  totalColumns: number,
  scaleFactor: number,
  enableScaling: boolean
): number => {
  if (!enableScaling || totalColumns <= 1) {
    return baseWidth;
  }

  // Calculate progression from 0 to 1 across columns
  const progression = columnIndex / (totalColumns - 1);

  // Apply scaling: start at baseWidth, scale up by factor
  return baseWidth * (1 + (scaleFactor - 1) * progression);
};

export const createShapeGeometry = (config: CircleGridConfig, columnIndex?: number, enableWidthScaling?: boolean, widthScaleFactor?: number): THREE.BufferGeometry => {
  switch (config.shapeType) {
    case ShapeType.Circle:
      return createCircleGeometry(config.circleRadius);
    case ShapeType.Rectangle: {
      const width = columnIndex !== undefined && enableWidthScaling
        ? calculateScaledWidth(config.rectangleWidth, columnIndex, config.cols, widthScaleFactor || 1, enableWidthScaling)
        : config.rectangleWidth;
      return createRectangleGeometry(width, config.rectangleHeight);
    }
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
  shape.moveTo(-width / 2, -height / 2);
  shape.lineTo(width / 2, -height / 2);
  shape.lineTo(width / 2, height / 2);
  shape.lineTo(-width / 2, height / 2);
  shape.lineTo(-width / 2, -height / 2);

  // 절대 두께 값으로 계산 (비율이 아닌 고정 크기)
  const absoluteThickness = Math.min(width, height) * thickness; // 작은 쪽 크기를 기준으로
  const innerWidth = width - 2 * absoluteThickness;
  const innerHeight = height - 2 * absoluteThickness;

  if (innerWidth > 0 && innerHeight > 0) {
    const hole = new THREE.Path();
    hole.moveTo(-innerWidth / 2, -innerHeight / 2);
    hole.lineTo(innerWidth / 2, -innerHeight / 2);
    hole.lineTo(innerWidth / 2, innerHeight / 2);
    hole.lineTo(-innerWidth / 2, innerHeight / 2);
    hole.lineTo(-innerWidth / 2, -innerHeight / 2);
    shape.holes.push(hole);
  }

  const geometry = new THREE.ShapeGeometry(shape);
  return geometry;
};

export const createShapeStrokeGeometry = (config: CircleGridConfig, borderThickness: number, columnIndex?: number, enableWidthScaling?: boolean, widthScaleFactor?: number): THREE.BufferGeometry => {
  switch (config.shapeType) {
    case ShapeType.Circle: {
      const innerRadius = config.circleRadius * (1 - borderThickness);
      return new THREE.RingGeometry(innerRadius, config.circleRadius, 32);
    }
    case ShapeType.Rectangle: {
      const width = columnIndex !== undefined && enableWidthScaling
        ? calculateScaledWidth(config.rectangleWidth, columnIndex, config.cols, widthScaleFactor || 1, enableWidthScaling)
        : config.rectangleWidth;
      return createRectangleStrokeGeometry(width, config.rectangleHeight, borderThickness);
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
        colorGroup: 0, // Will be assigned later
        columnIndex: col,
        rowIndex: row
      });
    }
  }

  return circles;
};

// Seeded random number generator (simple LCG)
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

export const assignColorGroups = (
  circles: CircleData[],
  frequencies: [number, number, number],
  seed?: number
): void => {
  const totalFreq = frequencies[0] + frequencies[1] + frequencies[2];
  const normalizedFreq = frequencies.map(f => f / totalFreq);

  // Use seeded random if seed is provided, otherwise use Math.random
  const random = seed !== undefined ? new SeededRandom(seed) : null;

  circles.forEach(circle => {
    const rand = random ? random.next() : Math.random();
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

    // 원본 위치 가져오기 (userData에서)
    const originalPosition = circle.mesh.userData.originalPosition || circle.position;

    if (axis === 'y') {
      // Y축 중심 회전 (기존 방식 - X 좌표를 기준으로 회전)
      const originalX = originalPosition.x;
      const angle = (originalX / (config.cols * config.colSpacing)) * Math.PI * 2 * curvature;

      const newX = Math.sin(angle) * radius * curvature + originalX * (1 - curvature);
      const newZ = (Math.cos(angle) * radius - radius) * curvature;
      const newY = originalPosition.y;

      circle.mesh.position.set(newX, newY, newZ);
      circle.mesh.rotation.y = angle + rotationY;
    } else {
      // X축 중심 회전 (Y 좌표를 기준으로 회전)
      const originalY = originalPosition.y;
      const angle = (originalY / (config.rows * config.rowSpacing)) * Math.PI * 2 * curvature;

      const newY = Math.sin(angle) * radius * curvature + originalY * (1 - curvature);
      const newZ = (Math.cos(angle) * radius - radius) * curvature;
      const newX = originalPosition.x;

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