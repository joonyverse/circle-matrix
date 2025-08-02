export interface CircleData {
  position: { x: number; y: number; z: number };
  colorGroup: number;
  mesh?: THREE.Mesh;
}

export interface GuiControls {
  backgroundColor: string;
  cylinderCurvature: number;
  cylinderRadius: number;
  borderThickness: number;
  colorGroup1: {
    fill: string;
    stroke: string;
    frequency: number;
  };
  colorGroup2: {
    fill: string;
    stroke: string;
    frequency: number;
  };
  colorGroup3: {
    fill: string;
    stroke: string;
    frequency: number;
  };
  regenerateColors: () => void;
}

export interface CircleGridConfig {
  rows: number;
  cols: number;
  circleRadius: number;
  spacing: number;
}