import { useState, useCallback, useRef } from 'react';
import { ShapeType } from '../types';
import { STORAGE_KEYS } from '../constants';

// 기본 설정값
const defaultSettings = {
  // 구조 설정
  rows: 3,
  cols: 12,
  rowSpacing: 2,
  colSpacing: 2,
  shapeType: ShapeType.Circle,
  circleRadius: 0.8,
  rectangleWidth: 1.6,
  rectangleHeight: 1.2,
  enableWidthScaling: false,
  widthScaleFactor: 2.0,
  borderThickness: 0.15,

  // 변환 설정
  cylinderAxis: 'y' as const,
  cylinderCurvature: 0,
  cylinderRadius: 8,
  objectPositionX: 0,
  objectPositionY: 0,
  objectPositionZ: 0,
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0,

  // 외관 - 라이트 테마 색상
  backgroundColor: '#f5f7fa',
  frequency1: 1,
  syncColors1: false,
  fill1: { r: 0, g: 122, b: 255, a: 0.8 },
  stroke1: { r: 0, g: 0, b: 0, a: 1.0 },
  frequency2: 1,
  syncColors2: false,
  fill2: { r: 52, g: 199, b: 89, a: 0.8 },
  stroke2: { r: 0, g: 0, b: 0, a: 1.0 },
  frequency3: 1,
  syncColors3: false,
  fill3: { r: 175, g: 82, b: 222, a: 0.8 },
  stroke3: { r: 0, g: 0, b: 0, a: 1.0 },
  frequency4: 1,
  syncColors4: false,
  fill4: { r: 255, g: 159, b: 10, a: 0.8 },
  stroke4: { r: 0, g: 0, b: 0, a: 1.0 },

  // 애니메이션 설정
  animationSpeed: 1.0,

  // 카메라 설정
  cameraPositionX: 0,
  cameraPositionY: 0,
  cameraPositionZ: 15,
  cameraControlType: 'orbit' as const
};

interface UseSettingsOptions {
  onCameraControlTypeChange?: (type: 'trackball' | 'orbit') => void;
}

export const useSettings = (options: UseSettingsOptions = {}) => {
  const { onCameraControlTypeChange } = options;
  
  // 색상 시드 관리
  const colorSeedRef = useRef<number>(Math.floor(Math.random() * 1000000));

  /**
   * localStorage에서 저장된 설정을 로드합니다.
   */
  const getDefaultValues = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) {
        const settings = JSON.parse(saved);

        if (settings.colorSeed !== undefined) {
          colorSeedRef.current = settings.colorSeed;
        }

        const mergedSettings = { ...defaultSettings, ...settings };

        if (settings.cameraControlType && onCameraControlTypeChange) {
          onCameraControlTypeChange(settings.cameraControlType);
        }

        return mergedSettings;
      }
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error);
    }

    return defaultSettings;
  }, [onCameraControlTypeChange]);

  // 설정 상태
  const [settings, setSettings] = useState(getDefaultValues);

  // 설정 변경 핸들러
  const handleSettingChange = useCallback((key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // 현재 설정을 가져오는 함수 (카메라 위치 제외)
  const getCurrentSettings = useCallback(() => {
    const { cameraPositionX, cameraPositionY, cameraPositionZ, ...settingsWithoutCamera } = settings;
    return {
      ...settingsWithoutCamera,
      colorSeed: colorSeedRef.current,
    };
  }, [settings]);

  // 모든 설정 저장 (카메라 위치 제외)
  const saveSettings = useCallback(() => {
    const { cameraPositionX, cameraPositionY, cameraPositionZ, ...settingsWithoutCamera } = settings;
    const settingsToSave = {
      ...settingsWithoutCamera,
      colorSeed: colorSeedRef.current,
    };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settingsToSave));
  }, [settings]);

  // 설정을 적용하는 함수 (카메라 위치 제외)
  const applySettings = useCallback((newSettings: Record<string, unknown>) => {
    // 색상 시드 적용
    if (newSettings.colorSeed !== undefined) {
      colorSeedRef.current = newSettings.colorSeed as number;
    }

    // 카메라 컨트롤 타입 적용
    if (newSettings.cameraControlType !== undefined && onCameraControlTypeChange) {
      onCameraControlTypeChange(newSettings.cameraControlType as 'trackball' | 'orbit');
    }

    // 카메라 위치를 제외한 설정만 localStorage에 저장
    const { cameraPositionX, cameraPositionY, cameraPositionZ, ...settingsWithoutCamera } = newSettings;
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settingsWithoutCamera));

    // 설정 적용
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, [onCameraControlTypeChange]);

  // URL에서 프로젝트 설정 로드
  const loadProjectFromURL = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const projectData = urlParams.get('project');

    if (projectData) {
      try {
        const settings = JSON.parse(decodeURIComponent(projectData));

        // 색상 시드 적용
        if (settings.colorSeed !== undefined) {
          colorSeedRef.current = settings.colorSeed as number;
        }

        // 카메라 컨트롤 타입 적용
        if (settings.cameraControlType !== undefined && onCameraControlTypeChange) {
          onCameraControlTypeChange(settings.cameraControlType as 'trackball' | 'orbit');
        }

        // 현재 settings 상태에 적용
        setSettings(prev => ({ ...prev, ...settings }));

        // 카메라 위치를 제외한 설정만 localStorage에 저장
        const { cameraPositionX, cameraPositionY, cameraPositionZ, ...settingsWithoutCamera } = settings;
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settingsWithoutCamera));

        // URL에서 프로젝트 파라미터 제거
        const newURL = window.location.pathname;
        window.history.replaceState({}, '', newURL);

        return true;
      } catch (error) {
        console.error('Error loading project from URL:', error);
        return false;
      }
    }
    return false;
  }, [onCameraControlTypeChange]);

  // 모든 설정을 기본값으로 리셋
  const resetAllSettings = useCallback(() => {
    setSettings(defaultSettings);
    colorSeedRef.current = Math.floor(Math.random() * 1000000);
  }, []);

  // 색상 재생성
  const regenerateColors = useCallback(() => {
    colorSeedRef.current = Math.floor(Math.random() * 1000000);
  }, []);

  return {
    settings,
    colorSeedRef,
    handleSettingChange,
    getCurrentSettings,
    saveSettings,
    applySettings,
    loadProjectFromURL,
    resetAllSettings,
    regenerateColors,
    defaultSettings,
  };
};
