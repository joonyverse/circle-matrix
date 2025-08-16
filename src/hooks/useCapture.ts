import { useCallback } from 'react';
import * as THREE from 'three';
import { STORAGE_KEYS, PROJECT_CONSTANTS } from '../constants';

interface UseCaptureOptions {
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | undefined>;
  sceneRef: React.MutableRefObject<THREE.Scene | undefined>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | undefined>;
  settings: any;
}

export const useCapture = ({
  rendererRef,
  sceneRef,
  cameraRef,
  settings,
}: UseCaptureOptions) => {

  // 캡처 기능
  const handleCapture = useCallback(async () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) {
      throw new Error('Renderer not available');
    }

    try {
      // 현재 렌더러의 캔버스를 캡처
      const canvas = rendererRef.current.domElement;

      // 렌더러를 한 번 더 렌더링하여 최신 상태 캡처
      rendererRef.current.render(sceneRef.current, cameraRef.current);

      // 캔버스를 blob으로 변환
      return new Promise<{ success: boolean; error?: string }>((resolve) => {
        canvas.toBlob(async (blob) => {
          if (!blob) {
            resolve({ success: false, error: 'Failed to create blob' });
            return;
          }

          try {
            // 클립보드에 복사
            await navigator.clipboard.write([
              new ClipboardItem({
                'image/png': blob
              })
            ]);

            // 임시로 이미지를 화면에 표시하여 확인
            const url = URL.createObjectURL(blob);
            const img = document.createElement('img');
            img.src = url;
            img.style.position = 'fixed';
            img.style.top = '10px';
            img.style.right = '10px';
            img.style.width = '200px';
            img.style.height = 'auto';
            img.style.border = '2px solid red';
            img.style.zIndex = '9999';
            img.style.backgroundColor = 'white';
            img.style.padding = '10px';
            img.style.borderRadius = '8px';
            img.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            img.style.cursor = 'pointer';
            img.style.transform = 'translateX(100%) scale(0.8)';
            img.style.opacity = '0';
            img.style.transition = 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            img.title = 'Right-click to save image';
            document.body.appendChild(img);

            // 나타나는 애니메이션
            requestAnimationFrame(() => {
              img.style.transform = 'translateX(0) scale(1)';
              img.style.opacity = '1';
            });

            let timeoutId: number;
            let isContextMenuOpen = false;

            // 사라지는 애니메이션 함수
            const removeWithAnimation = () => {
              img.style.transform = 'translateX(100%) scale(0.8)';
              img.style.opacity = '0';
              setTimeout(() => {
                if (document.body.contains(img)) {
                  document.body.removeChild(img);
                  URL.revokeObjectURL(url);
                }
              }, 400);
            };

            // 3초 후 자동 제거
            const startAutoRemove = () => {
              timeoutId = setTimeout(() => {
                if (!isContextMenuOpen) {
                  removeWithAnimation();
                }
              }, 3000);
            };

            // 우클릭 이벤트 처리
            img.addEventListener('contextmenu', () => {
              isContextMenuOpen = true;
              clearTimeout(timeoutId);
            });

            // 컨텍스트 메뉴가 닫힐 때 감지
            document.addEventListener('click', () => {
              if (isContextMenuOpen) {
                isContextMenuOpen = false;
                startAutoRemove();
              }
            });

            // ESC 키로 수동 제거
            const handleKeyDown = (e: KeyboardEvent) => {
              if (e.key === 'Escape') {
                clearTimeout(timeoutId);
                removeWithAnimation();
                document.removeEventListener('keydown', handleKeyDown);
              }
            };
            document.addEventListener('keydown', handleKeyDown);

            // 자동 제거 시작
            startAutoRemove();

            // 로컬스토리지에 캡처 저장
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              const captureItem = {
                id: `capture-${Date.now()}`,
                name: `Capture_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`,
                dataUrl: dataUrl,
                timestamp: Date.now(),
                settings: { ...settings }
              };

              // 기존 캡처 목록 로드
              const existingCaptures = localStorage.getItem(STORAGE_KEYS.CAPTURES);
              const captures = existingCaptures ? JSON.parse(existingCaptures) : [];

              // 새 캡처 추가 (최대 50개 유지)
              captures.unshift(captureItem);
              if (captures.length > PROJECT_CONSTANTS.MAX_CAPTURES) {
                captures.pop();
              }

              // 로컬스토리지에 저장
              localStorage.setItem(STORAGE_KEYS.CAPTURES, JSON.stringify(captures));
            };
            reader.readAsDataURL(blob);

            resolve({ success: true });
          } catch (clipboardError) {
            // 클립보드 복사 실패 시 다운로드
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `circle-matrix-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            resolve({ success: true });
          }
        }, 'image/png');
      });
    } catch (error) {
      return { success: false, error: 'Failed to capture screenshot' };
    }
  }, [rendererRef, sceneRef, cameraRef, settings]);

  return {
    handleCapture,
  };
};
