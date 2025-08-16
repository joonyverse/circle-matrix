import { useState, useCallback } from 'react';
import { STORAGE_KEYS, UI_CONSTANTS } from '../constants';

interface Project {
  name: string;
  settings: Record<string, unknown>;
  timestamp: number;
  previewImage?: string;
}

interface UseProjectManagerOptions {
  getCurrentSettings: () => Record<string, unknown>;
  applySettings: (settings: Record<string, unknown>) => void;
  resetCameraPosition?: () => void;
  rendererRef?: React.MutableRefObject<THREE.WebGLRenderer | undefined>;
  sceneRef?: React.MutableRefObject<THREE.Scene | undefined>;
  cameraRef?: React.MutableRefObject<THREE.PerspectiveCamera | undefined>;
}

export const useProjectManager = ({
  getCurrentSettings,
  applySettings,
  resetCameraPosition,
  rendererRef,
  sceneRef,
  cameraRef,
}: UseProjectManagerOptions) => {
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(false);

  // 프로젝트 저장 함수
  const saveProject = useCallback((name: string) => {
    const currentSettings = getCurrentSettings();

    // 프로젝트 캡처 이미지 생성
    let previewImage = '';
    try {
      if (rendererRef?.current && sceneRef?.current && cameraRef?.current) {
        // 렌더러 크기를 미리보기용으로 조정 (정사각형)
        const originalSize = rendererRef.current.getSize(new THREE.Vector2());
        const previewSize = UI_CONSTANTS.PREVIEW_SIZE;
        rendererRef.current.setSize(previewSize, previewSize);

        // 렌더링
        rendererRef.current.render(sceneRef.current, cameraRef.current);

        // 캔버스를 이미지로 변환
        const canvas = rendererRef.current.domElement;
        previewImage = canvas.toDataURL('image/png');

        // 원래 크기로 복원
        rendererRef.current.setSize(originalSize.x, originalSize.y);
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    } catch (error) {
      console.error('Failed to capture preview:', error);
    }

    const project: Project = {
      name,
      settings: currentSettings,
      timestamp: Date.now(),
      previewImage: previewImage
    };

    const savedProjects = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    const projects: Project[] = savedProjects ? JSON.parse(savedProjects) : [];

    // 같은 이름의 프로젝트가 있으면 업데이트, 없으면 추가
    const existingIndex = projects.findIndex(p => p.name === name);
    if (existingIndex >= 0) {
      projects[existingIndex] = project;
    } else {
      projects.push(project);
    }

    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    setActiveProject(name);

    return projects;
  }, [getCurrentSettings, rendererRef, sceneRef, cameraRef]);

  // 프로젝트 로드 후 씬 업데이트를 위한 함수
  const loadProjectAndUpdate = useCallback((name: string) => {
    const savedProjects = localStorage.getItem(STORAGE_KEYS.PROJECTS);

    if (!savedProjects) {
      return null;
    }

    const projects: Project[] = JSON.parse(savedProjects);
    const project = projects.find(p => p.name === name);

    if (project) {
      // 즉시 활성 프로젝트 설정 (UI 반응성 향상)
      setActiveProject(name);

      setIsLoadingProject(true);
      applySettings(project.settings);

      // 프로젝트 로드 후 카메라를 기본 위치로 리셋
      setTimeout(() => {
        if (resetCameraPosition) {
          resetCameraPosition();
        }
        setIsLoadingProject(false);
      }, UI_CONSTANTS.LOADING_DELAY);

      return project;
    }
    return null;
  }, [applySettings, resetCameraPosition]);

  // 프로젝트 로드 함수
  const loadProject = useCallback((name: string) => {
    return loadProjectAndUpdate(name);
  }, [loadProjectAndUpdate]);

  // 프로젝트 삭제 함수
  const deleteProject = useCallback((name: string) => {
    const savedProjects = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    if (!savedProjects) return [];

    const projects: Project[] = JSON.parse(savedProjects);
    const updatedProjects = projects.filter(p => p.name !== name);
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updatedProjects));
    
    // 삭제된 프로젝트가 활성 프로젝트였다면 활성 프로젝트 해제
    if (activeProject === name) {
      setActiveProject(null);
    }
    
    return updatedProjects;
  }, [activeProject]);

  // 프로젝트 이름 변경 함수
  const renameProject = useCallback((oldName: string, newName: string) => {
    const savedProjects = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    if (!savedProjects) return [];

    const projects: Project[] = JSON.parse(savedProjects);

    // 새 이름이 이미 존재하는지 확인
    if (projects.some(p => p.name === newName)) {
      throw new Error(`Project "${newName}" already exists.`);
    }

    // 프로젝트 찾기
    const projectIndex = projects.findIndex(p => p.name === oldName);
    if (projectIndex === -1) {
      throw new Error(`Project "${oldName}" not found.`);
    }

    // 이름 변경
    const updatedProjects = [...projects];
    updatedProjects[projectIndex] = {
      ...updatedProjects[projectIndex],
      name: newName,
      timestamp: Date.now() // 타임스탬프 업데이트
    };

    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updatedProjects));
    
    // 활성 프로젝트가 변경된 프로젝트였다면 활성 프로젝트도 업데이트
    if (activeProject === oldName) {
      setActiveProject(newName);
    }
    
    return updatedProjects;
  }, [activeProject]);

  // 프로젝트 목록 가져오기 함수
  const getProjects = useCallback(() => {
    const savedProjects = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    return savedProjects ? JSON.parse(savedProjects) : [];
  }, []);

  // 활성 프로젝트에 저장하는 함수
  const saveToActiveProject = useCallback(() => {
    if (!activeProject) {
      throw new Error('No active project to save to.');
    }

    const updatedProjects = saveProject(activeProject);
    return updatedProjects;
  }, [activeProject, saveProject]);

  // 기존 프로젝트 이름 목록 가져오기
  const getExistingProjectNames = useCallback(() => {
    const savedProjects = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    const projects: Project[] = savedProjects ? JSON.parse(savedProjects) : [];
    return projects.map((p: Project) => p.name);
  }, []);

  // URL 공유 기능
  const shareProject = useCallback(async (projectSettings: Record<string, unknown>) => {
    const projectData = encodeURIComponent(JSON.stringify(projectSettings));
    const shareURL = `${window.location.origin}${window.location.pathname}?project=${projectData}`;

    try {
      // TinyURL API를 사용하여 URL 단축
      const response = await fetch('https://tinyurl.com/api-create.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `url=${encodeURIComponent(shareURL)}`
      });

      if (response.ok) {
        const tinyURL = await response.text();
        await navigator.clipboard.writeText(tinyURL);
        return { success: true, url: tinyURL, type: 'tinyurl' };
      } else {
        // TinyURL 생성 실패 시 원본 URL 사용
        await navigator.clipboard.writeText(shareURL);
        return { success: true, url: shareURL, type: 'original' };
      }
    } catch (error) {
      console.warn('Failed to create TinyURL:', error);
      // 에러 발생 시 원본 URL 사용
      try {
        await navigator.clipboard.writeText(shareURL);
        return { success: true, url: shareURL, type: 'fallback' };
      } catch (clipboardError) {
        // 클립보드 복사 실패 시 URL을 반환만
        return { success: false, url: shareURL, type: 'error' };
      }
    }
  }, []);

  return {
    // State
    activeProject,
    isLoadingProject,
    
    // Actions
    saveProject,
    loadProject,
    deleteProject,
    renameProject,
    saveToActiveProject,
    shareProject,
    
    // Getters
    getProjects,
    getExistingProjectNames,
    
    // Internal setters (for external control)
    setActiveProject,
    setIsLoadingProject,
  };
};
