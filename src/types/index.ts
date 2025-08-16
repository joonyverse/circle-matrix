import * as THREE from 'three';

export enum ShapeType {
  Circle = 'circle',
  Rectangle = 'rectangle'
}

export interface CircleData {
  position: { x: number; y: number; z: number };
  colorGroup: number;
  columnIndex: number;
  rowIndex: number;
  mesh?: THREE.Group; // Changed from THREE.Mesh to THREE.Group to support morphing
  // New properties for shape morphing
  currentShapeType?: ShapeType;
  lastRotationCheck?: number; // Track last rotation for shape changing
}

export interface GuiControls {
  backgroundColor: string;
  cylinderCurvature: number;
  cylinderRadius: number;
  cylinderAxis: 'x' | 'y';
  borderThickness: number;
  shapeType: ShapeType;
  circleRadius: number;
  rectangleWidth: number;
  rectangleHeight: number;
  enableWidthScaling: boolean;
  widthScaleFactor: number;
  rows: number;
  cols: number;
  rowSpacing: number;
  colSpacing: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  // Camera settings removed - using default values only
  cameraPositionX: number;
  cameraPositionY: number;
  cameraPositionZ: number;
  objectPositionX: number;
  objectPositionY: number;
  objectPositionZ: number;
  objectRotationX: number;
  objectRotationY: number;
  objectRotationZ: number;
  colorGroup1: {
    fill: string;
    stroke: string;
    originalStroke: string;
    fillOpacity: number;
    strokeOpacity: number;
    frequency: number;
    syncColors: boolean;
  };
  colorGroup2: {
    fill: string;
    stroke: string;
    originalStroke: string;
    fillOpacity: number;
    strokeOpacity: number;
    frequency: number;
    syncColors: boolean;
  };
  colorGroup3: {
    fill: string;
    stroke: string;
    originalStroke: string;
    fillOpacity: number;
    strokeOpacity: number;
    frequency: number;
    syncColors: boolean;
  };
  regenerateColors: () => void;
  resetCamera: () => void;
}

export interface CircleGridConfig {
  rows: number;
  cols: number;
  shapeType: ShapeType;
  circleRadius: number;
  rectangleWidth: number;
  rectangleHeight: number;
  rowSpacing: number;
  colSpacing: number;
}