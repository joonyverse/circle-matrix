import { useRef, useEffect, useCallback } from 'react';
import { TrackballControls, OrbitControls } from 'three-stdlib';
import { KEYBOARD_SHORTCUTS, CAMERA_DEFAULTS, isKeyMatch } from '../constants';

interface UseSmoothCameraControlsOptions {
  controlsRef: React.MutableRefObject<TrackballControls | OrbitControls | null>;
  isEnabled?: boolean;
}

interface KeyState {
  [key: string]: boolean;
}

export const useSmoothCameraControls = ({
  controlsRef,
  isEnabled = true,
}: UseSmoothCameraControlsOptions) => {
  // 키 상태 추적
  const keysRef = useRef<KeyState>({});
  const animationIdRef = useRef<number>();
  
  // 카메라 이동 속도 (더 빠르고 부드럽게)
  const moveSpeed = CAMERA_DEFAULTS.KEYBOARD_MOVE_SPEED * 3; // 3배 더 빠르게
  const acceleration = 1.2; // 가속도
  const maxSpeed = moveSpeed * 2; // 최대 속도
  
  // 현재 속도 벡터
  const velocityRef = useRef({
    x: 0,
    y: 0,
    z: 0
  });

  // 키 상태 업데이트
  const updateKeyState = useCallback((key: string, pressed: boolean) => {
    keysRef.current[key] = pressed;
  }, []);

  // 부드러운 카메라 이동 업데이트
  const updateCameraPosition = useCallback(() => {
    if (!controlsRef.current || !isEnabled) {
      animationIdRef.current = requestAnimationFrame(updateCameraPosition);
      return;
    }

    const camera = controlsRef.current.object;
    const keys = keysRef.current;
    const velocity = velocityRef.current;

    // 각 축별 목표 속도 계산
    let targetVelocityX = 0;
    let targetVelocityY = 0;
    let targetVelocityZ = 0;

    // WASD + 한글 키 확인
    // 왼쪽 (A/ᄀ)
    if (keys['KeyA'] || keys['ᄀ']) {
      targetVelocityX = -moveSpeed;
    }
    // 오른쪽 (D/ᄋ)
    if (keys['KeyD'] || keys['ᄋ']) {
      targetVelocityX = moveSpeed;
    }
    // 앞 (W/ᄉ)
    if (keys['KeyW'] || keys['ᄉ']) {
      targetVelocityZ = -moveSpeed;
    }
    // 뒤 (S/ᄂ)
    if (keys['KeyS'] || keys['ᄂ']) {
      targetVelocityZ = moveSpeed;
    }
    // 위 (Q/ㅂ)
    if (keys['KeyQ'] || keys['ㅂ']) {
      targetVelocityY = moveSpeed;
    }
    // 아래 (E/ㄷ)
    if (keys['KeyE'] || keys['ㄷ']) {
      targetVelocityY = -moveSpeed;
    }

    // 부드러운 가속/감속 적용
    const damping = 0.85; // 감속 계수 (높을수록 빠르게 멈춤)
    const smoothing = 0.15; // 가속 스무딩 (낮을수록 부드러움)

    // 목표 속도로 점진적 변경
    velocity.x = velocity.x * damping + targetVelocityX * smoothing;
    velocity.y = velocity.y * damping + targetVelocityY * smoothing;
    velocity.z = velocity.z * damping + targetVelocityZ * smoothing;

    // 최대 속도 제한
    velocity.x = Math.max(-maxSpeed, Math.min(maxSpeed, velocity.x));
    velocity.y = Math.max(-maxSpeed, Math.min(maxSpeed, velocity.y));
    velocity.z = Math.max(-maxSpeed, Math.min(maxSpeed, velocity.z));

    // 매우 작은 속도는 0으로 처리 (떨림 방지)
    const threshold = 0.001;
    if (Math.abs(velocity.x) < threshold) velocity.x = 0;
    if (Math.abs(velocity.y) < threshold) velocity.y = 0;
    if (Math.abs(velocity.z) < threshold) velocity.z = 0;

    // 카메라 위치 업데이트 (실제로 이동이 있을 때만)
    if (velocity.x !== 0 || velocity.y !== 0 || velocity.z !== 0) {
      camera.position.x += velocity.x;
      camera.position.y += velocity.y;
      camera.position.z += velocity.z;
      
      // 컨트롤 업데이트
      controlsRef.current.update();
    }

    // 다음 프레임 예약
    animationIdRef.current = requestAnimationFrame(updateCameraPosition);
  }, [controlsRef, isEnabled, moveSpeed, maxSpeed]);

  // 키보드 이벤트 핸들러
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // 입력 모드 확인
    const activeElement = document.activeElement;
    const isInputMode = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      (activeElement as HTMLElement).contentEditable === 'true' ||
      activeElement.getAttribute('contenteditable') === 'true'
    );

    if (isInputMode || !isEnabled) return;

    // WASD + QE + 한글 키 처리
    const cameraKeys = [
      'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', // 영어
      'ᄉ', 'ᄀ', 'ᄂ', 'ᄋ', 'ㅂ', 'ㄷ', // 한글
    ];

    // 코드기반(KeyA, KeyW 등) 또는 문자기반(ᄀ, ᄉ 등) 둘 다 지원
    const isCodeMatch = cameraKeys.includes(event.code);
    const isKeyMatch = cameraKeys.includes(event.key);
    
    if (isCodeMatch || isKeyMatch) {
      event.preventDefault();
      // 코드 우선, 없으면 키 사용
      const keyToStore = isCodeMatch ? event.code : event.key;
      updateKeyState(keyToStore, true);
    }
  }, [isEnabled, updateKeyState]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (!isEnabled) return;

    const cameraKeys = [
      'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', // 영어
      'ᄉ', 'ᄀ', 'ᄂ', 'ᄋ', 'ㅂ', 'ㄷ', // 한글
    ];

    // keyDown과 동일한 로직
    const isCodeMatch = cameraKeys.includes(event.code);
    const isKeyMatch = cameraKeys.includes(event.key);
    
    if (isCodeMatch || isKeyMatch) {
      const keyToStore = isCodeMatch ? event.code : event.key;
      updateKeyState(keyToStore, false);
    }
  }, [isEnabled, updateKeyState]);

  // 포커스 잃었을 때 모든 키 해제
  const handleBlur = useCallback(() => {
    keysRef.current = {};
    velocityRef.current = { x: 0, y: 0, z: 0 };
  }, []);

  // 이벤트 리스너 및 애니메이션 설정
  useEffect(() => {
    if (!isEnabled) return;

    // 애니메이션 시작
    animationIdRef.current = requestAnimationFrame(updateCameraPosition);

    // 이벤트 리스너 등록
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleBlur); // 포커스 돌아올 때도 리셋

    return () => {
      // 정리
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleBlur);
      
      // 상태 리셋
      keysRef.current = {};
      velocityRef.current = { x: 0, y: 0, z: 0 };
    };
  }, [isEnabled, updateCameraPosition, handleKeyDown, handleKeyUp, handleBlur]);

  // 카메라 이동 중지
  const stopMovement = useCallback(() => {
    keysRef.current = {};
    velocityRef.current = { x: 0, y: 0, z: 0 };
  }, []);

  return {
    stopMovement,
    isMoving: Object.values(keysRef.current).some(Boolean),
  };
};
