
/**
 * 배경색의 밝기를 계산합니다 (0-255)
 */
export const getBackgroundBrightness = (backgroundColor: string): number => {
    // hex 색상을 RGB로 변환
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // 밝기 계산 (ITU-R BT.709 표준)
    return 0.299 * r + 0.587 * g + 0.114 * b;
};

/**
 * 배경이 어두운지 판단합니다
 */
export const isDarkBackground = (backgroundColor: string): boolean => {
    const brightness = getBackgroundBrightness(backgroundColor);
    return brightness < 128; // 중간값 128을 기준으로 판단
};

/**
 * 배경색에 따른 텍스트 색상을 반환합니다
 */
export const getTextColorForBackground = (backgroundColor: string): string => {
    return isDarkBackground(backgroundColor) ? '#ffffff' : '#000000';
};

/**
 * 배경색에 따른 UI 요소 색상을 반환합니다
 */
export const getUIColorsForBackground = (backgroundColor: string) => {
    const isDark = isDarkBackground(backgroundColor);

    return {
        text: isDark ? '#ffffff' : '#000000',
        textSecondary: isDark ? '#a0a0a0' : '#666666',
        border: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
        background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        backgroundStrong: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
        focus: isDark ? '#007AFF' : '#007AFF', // 포커스 색상은 동일하게 유지
    };
}; 