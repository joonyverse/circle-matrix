// 애니메이션 관련 상수
export const ANIMATION_CONSTANTS = {
  DEFAULT_DURATION: 4000, // 4초
  MIN_SPEED: 0.1,
  MAX_SPEED: 5.0,
  DEFAULT_SPEED: 1.0,
  SHAPE_CHANGE_THRESHOLD: 0.1, // 각도 임계값
  SHAPE_CHANGE_ANGLES: {
    FIRST: Math.PI / 2,  // 90도
    SECOND: 3 * Math.PI / 2, // 270도
  },
} as const;

// UI 관련 상수
export const UI_CONSTANTS = {
  LOADING_DELAY: 300,
  TOAST_DURATION: 3000,
  AUTO_SAVE_DELAY: 500,
  COLOR_UPDATE_DEBOUNCE: 16, // 약 60fps
  PREVIEW_SIZE: 600,
} as const;

// 3D 렌더링 상수
export const RENDER_CONSTANTS = {
  DEFAULT_FOV: 75,
  NEAR_PLANE: 0.1,
  FAR_PLANE: 1000,
  DEFAULT_CAMERA_POSITION: { x: 0, y: 0, z: 15 },
  Z_FIGHTING_OFFSET: 0.001,
} as const;

// 카메라 기본값
export const CAMERA_DEFAULTS = {
  MIN_DISTANCE: 5,
  MAX_DISTANCE: 50,
  ENABLE_PAN: true,
  ROTATE_SPEED: 2.0,
  ZOOM_SPEED: 1.5,
  PAN_SPEED: 1.5,
  DYNAMIC_DAMPING_FACTOR: 0.1,
  KEYBOARD_MOVE_SPEED: 0.2, // 부드러운 이돔을 위해 기본 속도 조정
} as const;

// localStorage 키
export const STORAGE_KEYS = {
  SETTINGS: 'circle-matrix-settings',
  PROJECTS: 'circle-matrix-projects',
  CAPTURES: 'circle-matrix-captures',
} as const;

// 키보드 단축키
export const KEYBOARD_SHORTCUTS = {
  SAVE: 's',
  ZEN_MODE: 'z',
  ZEN_MODE_UPPER: 'Z',
  HELP_1: '?',
  HELP_2: '/',
  CAMERA_FORWARD: 'KeyW',
  CAMERA_BACKWARD: 'KeyS',
  CAMERA_LEFT: 'KeyA',
  CAMERA_RIGHT: 'KeyD',
  CAMERA_UP: 'KeyQ',
  CAMERA_DOWN: 'KeyE',
} as const;

// 프로젝트 관리 상수
export const PROJECT_CONSTANTS = {
  MAX_CAPTURES: 50,
  PROJECT_LOAD_TIMEOUT: 300,
  SCENE_UPDATE_DELAY: 500,
} as const;
