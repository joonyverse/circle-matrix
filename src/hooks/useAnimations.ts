import { useState, useRef, useCallback } from 'react';
import { CircleData, CircleGridConfig, ShapeType } from '../types';
import { updateShapeGeometry } from '../utils/circleGeometry';
import { ANIMATION_CONSTANTS } from '../constants';

interface UseAnimationsOptions {
  settings: any;
  circlesRef: React.MutableRefObject<CircleData[]>;
  handleSettingChange: (key: string, value: any) => void;
}

export const useAnimations = ({
  settings,
  circlesRef,
  handleSettingChange,
}: UseAnimationsOptions) => {
  // 애니메이션 상태
  const [isRotationAnimating, setIsRotationAnimating] = useState(false);
  const rotationAnimationRef = useRef<number>();
  const lastShapeChangeAngleRef = useRef<number>(0);

  // 도형 변경 감지 함수
  const checkAndChangeShape = useCallback((rotationY: number) => {
    const normalizedAngle = ((rotationY % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const threshold = ANIMATION_CONSTANTS.SHAPE_CHANGE_THRESHOLD;
    
    // 90도 (π/2) 또는 270도 (3π/2) 근처에서 도형 변경
    const isNear90 = Math.abs(normalizedAngle - ANIMATION_CONSTANTS.SHAPE_CHANGE_ANGLES.FIRST) < threshold;
    const isNear270 = Math.abs(normalizedAngle - ANIMATION_CONSTANTS.SHAPE_CHANGE_ANGLES.SECOND) < threshold;
    
    if ((isNear90 || isNear270) && Math.abs(normalizedAngle - lastShapeChangeAngleRef.current) > threshold * 2) {
      // 현재 도형 타입과 반대로 변경
      const currentShapeType = settings.shapeType;
      const newShapeType = currentShapeType === ShapeType.Circle ? ShapeType.Rectangle : ShapeType.Circle;
      
      // 각 도형을 개별적으로 업데이트
      const config: CircleGridConfig = {
        rows: settings.rows,
        cols: settings.cols,
        shapeType: settings.shapeType,
        circleRadius: settings.circleRadius,
        rectangleWidth: settings.rectangleWidth,
        rectangleHeight: settings.rectangleHeight,
        rowSpacing: settings.rowSpacing,
        colSpacing: settings.colSpacing
      };
      
      circlesRef.current.forEach(circle => {
        if (circle.currentShapeType === currentShapeType) {
          updateShapeGeometry(
            circle,
            config,
            newShapeType,
            settings.borderThickness,
            settings.enableWidthScaling,
            settings.widthScaleFactor
          );
        }
      });
      
      // 전역 설정도 업데이트
      handleSettingChange('shapeType', newShapeType);
      lastShapeChangeAngleRef.current = normalizedAngle;
    }
  }, [settings, handleSettingChange, circlesRef]);

  // Y축 회전 애니메이션 함수
  const animateRotationY = useCallback(() => {
    if (isRotationAnimating) {
      // 이미 애니메이션 중이면 중지
      if (rotationAnimationRef.current) {
        cancelAnimationFrame(rotationAnimationRef.current);
      }
      setIsRotationAnimating(false);
      return;
    }

    setIsRotationAnimating(true);
    const startRotation = settings.rotationY;
    const targetRotation = startRotation + Math.PI * 2; // 360도 회전
    const baseDuration = ANIMATION_CONSTANTS.DEFAULT_DURATION;
    const duration = baseDuration / settings.animationSpeed;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // easeInOutCubic 이징 함수
      const easeProgress = progress < 0.5 
        ? 4 * progress * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
      const currentRotation = startRotation + (targetRotation - startRotation) * easeProgress;
      
      // 도형 변경 체크
      checkAndChangeShape(currentRotation);
      
      handleSettingChange('rotationY', currentRotation);
      
      if (progress < 1) {
        rotationAnimationRef.current = requestAnimationFrame(animate);
      } else {
        setIsRotationAnimating(false);
      }
    };
    
    animate();
  }, [settings.rotationY, settings.animationSpeed, isRotationAnimating, handleSettingChange, checkAndChangeShape]);

  // 애니메이션 정리 함수
  const cleanupAnimations = useCallback(() => {
    if (rotationAnimationRef.current) {
      cancelAnimationFrame(rotationAnimationRef.current);
    }
  }, []);

  return {
    // State
    isRotationAnimating,
    
    // Actions
    animateRotationY,
    checkAndChangeShape,
    cleanupAnimations,
    
    // Refs (for external cleanup)
    rotationAnimationRef,
    lastShapeChangeAngleRef,
  };
};
