import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, RotateCcw, Share2, Camera, Palette, Download, List } from 'lucide-react';

// 폴더 컴포넌트
interface FolderProps {
    title: string;
    children: React.ReactNode;
    defaultCollapsed?: boolean;
    icon?: React.ReactNode;
}

export const Folder: React.FC<FolderProps> = ({ title, children, defaultCollapsed = false, icon }) => {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
    const [isAnimating, setIsAnimating] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const [contentHeight, setContentHeight] = useState(0);

    // 내용 높이 측정
    const measureHeight = () => {
        if (contentRef.current) {
            const height = contentRef.current.scrollHeight;
            setContentHeight(height);
        }
    };

    // ResizeObserver를 사용한 높이 측정
    useEffect(() => {
        if (!contentRef.current) return;

        const resizeObserver = new ResizeObserver(() => {
            measureHeight();
        });

        resizeObserver.observe(contentRef.current);

        // 초기 높이 측정
        const timer = setTimeout(measureHeight, 100);

        return () => {
            resizeObserver.disconnect();
            clearTimeout(timer);
        };
    }, [children]);

    const handleToggle = () => {
        if (isAnimating) return; // 애니메이션 중에는 클릭 무시

        setIsAnimating(true);
        setIsCollapsed(!isCollapsed);

        // 애니메이션 완료 후 상태 초기화
        setTimeout(() => {
            setIsAnimating(false);
        }, 300);
    };

    return (
        <div className="glass-weak rounded-xl overflow-hidden">
            <button
                onClick={handleToggle}
                className="w-full px-4 py-3 flex items-center justify-between text-left font-medium hover:bg-white/10 heading-hover smooth-transition"
                style={{ color: 'var(--text-heading)' }}
            >
                <div className="flex items-center gap-2">
                    {icon && <span className="text-sm">{icon}</span>}
                    <span>{title}</span>
                </div>
                <div className={`smooth-transition ${isCollapsed ? 'rotate-0' : 'rotate-90'}`}>
                    <ChevronRight className="w-4 h-4" />
                </div>
            </button>
            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}
                style={{
                    maxHeight: isCollapsed ? '0px' : `${Math.max(contentHeight, 1)}px`
                }}
            >
                <div ref={contentRef} className="px-4 pt-3 pb-4 space-y-3">
                    {children}
                </div>
            </div>
        </div>
    );
};

// 슬라이더 컴포넌트
interface SliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (value: number) => void;
    resetValue?: number;
    onReset?: () => void;
    onAnimate?: () => void;
    isAnimating?: boolean;
}

export const Slider: React.FC<SliderProps> = ({
    label,
    value,
    min,
    max,
    step = 0.1,
    onChange,
    resetValue,
    onReset,
    onAnimate,
    isAnimating = false
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState(value.toString());
    const inputRef = useRef<HTMLInputElement>(null);

    const handleEditClick = () => {
        setInputValue(value.toString());
        setIsEditing(true);
        setTimeout(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
        }, 0);
    };

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newInputValue = e.target.value;
        setInputValue(newInputValue);

        if (newInputValue === '' || newInputValue === '-') {
            // 빈 문자열이나 마이너스 기호만 있을 때는 값을 업데이트하지 않음
            return;
        } else {
            const newValue = parseFloat(newInputValue);
            if (!isNaN(newValue)) {
                onChange(newValue);
            }
        }
    };

    const handleEditBlur = () => {
        setIsEditing(false);
        // 입력이 완료되면 현재 값으로 inputValue 업데이트
        setInputValue(value.toString());
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsEditing(false);
            setInputValue(value.toString());
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-sm text-[#666] font-medium">{label}</label>
                <div className="flex items-center gap-2">
                    {isEditing ? (
                        <input
                            ref={inputRef}
                            type="number"
                            min={min}
                            max={max}
                            step={step}
                            value={inputValue}
                            onChange={handleEditChange}
                            onBlur={handleEditBlur}
                            onKeyDown={handleKeyDown}
                            className="text-xs text-[#007AFF] font-mono bg-white/20 px-2 py-1 rounded border border-[#007AFF] focus:outline-none focus:border-[#0056CC] w-16 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                    ) : (
                        <button
                            onClick={handleEditClick}
                            className="text-xs text-[#007AFF] font-mono bg-white/10 px-2 py-1 rounded hover:bg-white/20 smooth-transition cursor-pointer"
                            title="Click to edit"
                        >
                            {value.toFixed(2)}
                        </button>
                    )}
                    {onReset && resetValue !== undefined && (
                        <button
                            onClick={onReset}
                            className="text-xs text-[#FF9500] hover:text-[#FF6B00] smooth-transition p-1 rounded"
                            title="Reset to default"
                        >
                            <RotateCcw className="w-3 h-3" />
                        </button>
                    )}
                    {onAnimate && (
                        <button
                            onClick={onAnimate}
                            disabled={isAnimating}
                            className={`text-xs px-2 py-1 rounded smooth-transition ${
                                isAnimating 
                                    ? 'bg-red-500 text-white cursor-not-allowed' 
                                    : 'bg-[#34C759] text-white hover:bg-[#28A745]'
                            }`}
                            title={isAnimating ? "Stop animation" : "Start rotation animation"}
                        >
                            {isAnimating ? '⏹️' : '▶️'}
                        </button>
                    )}
                </div>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
            />
        </div>
    );
};

// 숫자 입력 컴포넌트
interface NumberInputProps {
    label: string;
    value: number;
    min?: number;
    max?: number;
    step?: number;
    onChange: (value: number) => void;
    resetValue?: number;
    onReset?: () => void;
}

export const NumberInput: React.FC<NumberInputProps> = ({
    label,
    value,
    min,
    max,
    step = 1,
    onChange,
    resetValue,
    onReset
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleEditClick = () => {
        setIsEditing(true);
        setTimeout(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
        }, 0);
    };

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        if (inputValue === '' || inputValue === '-') {
            // 빈 문자열이나 마이너스 기호만 있을 때는 값을 업데이트하지 않음
            return;
        } else {
            const newValue = parseFloat(inputValue);
            if (!isNaN(newValue)) {
                onChange(newValue);
            }
        }
    };

    const handleEditBlur = () => {
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsEditing(false);
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-sm text-[#666] font-medium">{label}</label>
                <div className="flex items-center gap-2">
                    {isEditing ? (
                        <input
                            ref={inputRef}
                            type="number"
                            min={min}
                            max={max}
                            step={step}
                            value={value}
                            onChange={handleEditChange}
                            onBlur={handleEditBlur}
                            onKeyDown={handleKeyDown}
                            className="text-xs text-[#007AFF] font-mono bg-white/20 px-2 py-1 rounded border border-[#007AFF] focus:outline-none focus:border-[#0056CC] w-16 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                    ) : (
                        <button
                            onClick={handleEditClick}
                            className="text-xs text-[#007AFF] font-mono bg-white/10 px-2 py-1 rounded hover:bg-white/20 smooth-transition cursor-pointer"
                            title="Click to edit"
                        >
                            {value}
                        </button>
                    )}
                    {onReset && resetValue !== undefined && (
                        <button
                            onClick={onReset}
                            className="text-xs text-[#FF9500] hover:text-[#FF6B00] smooth-transition p-1 rounded"
                            title="Reset to default"
                        >
                            <RotateCcw className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>
            {min !== undefined && max !== undefined && (
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                />
            )}
        </div>
    );
};

// 선택 컴포넌트
interface SelectProps {
    label: string;
    value: string;
    options: { [key: string]: string };
    onChange: (value: string) => void;
    resetValue?: string;
    onReset?: () => void;
    disabledOptions?: string[];
}

export const Select: React.FC<SelectProps> = ({
    label,
    value,
    options,
    onChange,
    resetValue,
    onReset,
    disabledOptions = []
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // 외부 클릭 시 드롭다운 닫기
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedLabel = options[value] || value;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>
                {onReset && resetValue !== undefined && (
                    <button
                        onClick={onReset}
                        className="text-xs text-[#FF9500] hover:text-[#FF6B00] smooth-transition p-1 rounded"
                        title="Reset to default"
                    >
                        <RotateCcw className="w-3 h-3" />
                    </button>
                )}
            </div>
            <div className="relative" ref={dropdownRef}>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="input-glass w-full text-sm pr-8 text-left flex items-center justify-between smooth-transition hover:bg-white/10"
                    style={{ color: 'var(--text-primary)' }}
                >
                    <span className="truncate">{selectedLabel}</span>
                    <svg
                        className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isOpen && (
                    <div className="absolute z-50 w-full mt-1 rounded-xl shadow-2xl max-h-48 overflow-y-auto custom-dropdown-enter" style={{
                        background: 'var(--dropdown-bg)',
                        border: '1px solid var(--dropdown-border)'
                    }}>
                        {Object.entries(options).map(([key, optionLabel]) => {
                            const isDisabled = disabledOptions.includes(key);
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => {
                                        if (!isDisabled) {
                                            onChange(key);
                                            setIsOpen(false);
                                        }
                                    }}
                                    className={`w-full px-3 py-2 text-sm text-left smooth-transition ${key === value ? 'bg-[#007AFF] text-white' :
                                        isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
                                        }`}
                                    style={{
                                        color: key === value ? 'white' :
                                            isDisabled ? 'var(--text-tertiary)' : 'var(--text-primary)'
                                    }}
                                    disabled={isDisabled}
                                >
                                    {optionLabel}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

// 토글 컴포넌트
interface ToggleProps {
    label: string;
    value: boolean;
    onChange: (value: boolean) => void;
    resetValue?: boolean;
    onReset?: () => void;
}

export const Toggle: React.FC<ToggleProps> = ({
    label,
    value,
    onChange,
    resetValue,
    onReset
}) => {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <label className="text-sm text-[#666] font-medium">{label}</label>
                {onReset && resetValue !== undefined && (
                    <button
                        onClick={onReset}
                        className="text-xs text-[#FF9500] hover:text-[#FF6B00] smooth-transition p-1 rounded"
                        title="Reset to default"
                    >
                        <RotateCcw className="w-3 h-3" />
                    </button>
                )}
            </div>
            <button
                onClick={() => onChange(!value)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-[#34C759]' : 'bg-gray-400'
                    }`}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-1'
                        }`}
                />
            </button>
        </div>
    );
};

// 색상 선택 컴포넌트
interface ColorPickerProps {
    label: string;
    value: { r: number; g: number; b: number; a: number };
    onChange: (value: { r: number; g: number; b: number; a: number }) => void;
    resetValue?: { r: number; g: number; b: number; a: number };
    onReset?: () => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
    label,
    value,
    onChange,
    resetValue,
    onReset
}) => {
    const rgbToHex = (r: number, g: number, b: number) => {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    };

    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    };

    const [hexValue, setHexValue] = useState(rgbToHex(value.r, value.g, value.b));
    const [isAlphaEditing, setIsAlphaEditing] = useState(false);
    const alphaInputRef = useRef<HTMLInputElement>(null);

    const handleColorChange = (hex: string) => {
        const rgb = hexToRgb(hex);
        if (rgb) {
            onChange({ ...value, ...rgb });
            setHexValue(hex);
        }
    };

    const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const hex = e.target.value;
        setHexValue(hex);

        if (hex.length === 7 && hex.startsWith('#')) {
            const rgb = hexToRgb(hex);
            if (rgb) {
                onChange({ ...value, ...rgb });
            }
        }
    };

    const handleAlphaChange = (alpha: number) => {
        onChange({ ...value, a: alpha });
    };

    const handleAlphaEditClick = () => {
        setIsAlphaEditing(true);
        setTimeout(() => {
            alphaInputRef.current?.focus();
            alphaInputRef.current?.select();
        }, 0);
    };

    const handleAlphaEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        if (inputValue === '' || inputValue === '-') {
            // 빈 문자열이나 마이너스 기호만 있을 때는 값을 업데이트하지 않음
            return;
        } else {
            const newValue = parseFloat(inputValue);
            if (!isNaN(newValue) && newValue >= 0 && newValue <= 1) {
                handleAlphaChange(newValue);
            }
        }
    };

    const handleAlphaEditBlur = () => {
        setIsAlphaEditing(false);
    };

    const handleAlphaKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsAlphaEditing(false);
        }
    };

    // value가 변경될 때 hexValue 업데이트
    React.useEffect(() => {
        setHexValue(rgbToHex(value.r, value.g, value.b));
    }, [value.r, value.g, value.b]);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-sm text-[#666] font-medium">{label}</label>
                {onReset && resetValue && (
                    <button
                        onClick={onReset}
                        className="text-xs text-[#FF9500] hover:text-[#FF6B00] smooth-transition p-1 rounded"
                        title="Reset to default"
                    >
                        <RotateCcw className="w-3 h-3" />
                    </button>
                )}
            </div>

            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <input
                        type="color"
                        value={rgbToHex(value.r, value.g, value.b)}
                        onChange={(e) => handleColorChange(e.target.value)}
                        className="w-8 h-8 rounded-lg border-2 border-white/20 cursor-pointer flex-shrink-0"
                    />
                    <input
                        type="text"
                        value={hexValue}
                        onChange={handleHexChange}
                        className="input-glass w-20 px-2 py-1 text-xs font-mono h-8"
                        placeholder="#000000"
                        maxLength={7}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-[#666]">A:</span>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={value.a}
                        onChange={(e) => handleAlphaChange(parseFloat(e.target.value))}
                        className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                    />
                    {isAlphaEditing ? (
                        <input
                            ref={alphaInputRef}
                            type="number"
                            min="0"
                            max="1"
                            step="0.01"
                            value={value.a}
                            onChange={handleAlphaEditChange}
                            onBlur={handleAlphaEditBlur}
                            onKeyDown={handleAlphaKeyDown}
                            className="text-xs text-[#007AFF] font-mono bg-white/20 px-2 py-1 rounded border border-[#007AFF] focus:outline-none focus:border-[#0056CC] w-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                    ) : (
                        <button
                            onClick={handleAlphaEditClick}
                            className="text-xs text-[#007AFF] font-mono bg-white/10 px-2 py-1 rounded hover:bg-white/20 smooth-transition cursor-pointer w-8"
                            title="Click to edit alpha"
                        >
                            {value.a.toFixed(2)}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// 버튼 컴포넌트
interface ButtonProps {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    label,
    onClick,
    variant = 'primary',
    size = 'md',
    icon
}) => {
    const baseClasses = "font-medium rounded-lg smooth-transition focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center gap-2 quick-action-hover";

    const variantClasses = {
        primary: "bg-[#007AFF] text-white hover:bg-[#0056CC] focus:ring-[#007AFF]",
        secondary: "focus:ring-[#007AFF] border",
        danger: "bg-[#FF3B30] text-white hover:bg-[#D70015] focus:ring-[#FF3B30]"
    };

    const sizeClasses = {
        sm: "px-2 py-1.5 text-xs min-w-0",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base"
    };

    return (
        <button
            onClick={onClick}
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} whitespace-nowrap overflow-hidden text-ellipsis`}
            style={variant === 'secondary' ? {
                color: 'var(--text-heading)',
                background: 'var(--quick-action-bg)',
                borderColor: 'var(--glass-border)'
            } : undefined}
        >
            {icon && <span className="text-sm flex-shrink-0">{icon}</span>}
            <span className="truncate">{label}</span>
        </button>
    );
};

// 메인 컨트롤 패널 컴포넌트
interface ControlPanelProps {
    settings: any;
    onSettingChange: (key: string, value: any) => void;
    onResetAll: () => void;
    onResetCamera: () => void;
    onRegenerateColors: () => void;
    onShareURL: () => void;
    onCapture: () => void;
    onOpenCaptureList: () => void;
    isVisible: boolean;
    onToggleVisibility: () => void;
    cameraControlType: 'trackball' | 'orbit';
    onCameraControlTypeChange: (type: 'trackball' | 'orbit') => void;
    onAnimateRotationY: () => void;
    isRotationAnimating: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
    settings,
    onSettingChange,
    onResetAll,
    onResetCamera,
    onRegenerateColors,
    onShareURL,
    onCapture,
    onOpenCaptureList,
    isVisible,
    onToggleVisibility,
    cameraControlType,
    onCameraControlTypeChange,
    onAnimateRotationY,
    isRotationAnimating
}) => {
    return (
        <>
            {/* Toggle Button - 항상 표시 */}
            <button
                onClick={onToggleVisibility}
                className={`fixed top-4 right-4 z-30 p-3 rounded-2xl glass-strong hover:scale-105 heading-hover control-panel-toggle ${isVisible ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 scale-100'}`}
                style={{ color: 'var(--text-heading)' }}
                title={isVisible ? "Hide Control Panel" : "Show Control Panel"}
            >
                <Palette className="w-6 h-6" />
            </button>

            {/* Control Panel - 슬라이드 애니메이션 */}
            <div className={`fixed top-4 right-4 w-80 max-h-[calc(100vh-2rem)] overflow-y-auto glass-strong rounded-2xl shadow-2xl border border-white/20 z-30 control-panel-slide scrollbar-hide ${isVisible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-[calc(100%-2px)] opacity-0 scale-95'}`} style={{ maxHeight: 'calc(100vh - 2rem)' }}>
                <div className="p-4 space-y-4">
                    {/* 헤더 */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/20">
                        <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
                            <Palette className="w-5 h-5" />
                            Control Panel
                        </h2>
                        <div className="flex gap-2">
                            <button
                                onClick={onToggleVisibility}
                                className="smooth-transition p-2 rounded-xl hover:bg-white/10"
                                style={{ color: 'var(--text-heading)' }}
                                title="Hide Control Panel"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>Quick Actions</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                label="Reset All"
                                onClick={onResetAll}
                                variant="secondary"
                                size="sm"
                                icon={<RotateCcw className="w-3 h-3" />}
                            />
                            <Button
                                label="Reset Camera"
                                onClick={onResetCamera}
                                variant="secondary"
                                size="sm"
                                icon={<Camera className="w-3 h-3" />}
                            />
                            <Button
                                label="Regenerate"
                                onClick={onRegenerateColors}
                                variant="secondary"
                                size="sm"
                                icon={<Palette className="w-3 h-3" />}
                            />
                            <Button
                                label="Share"
                                onClick={onShareURL}
                                variant="secondary"
                                size="sm"
                                icon={<Share2 className="w-3 h-3" />}
                            />
                            <Button
                                label="Capture"
                                onClick={onCapture}
                                variant="secondary"
                                size="sm"
                                icon={<Download className="w-3 h-3" />}
                            />
                            <Button
                                label="Captures"
                                onClick={onOpenCaptureList}
                                variant="secondary"
                                size="sm"
                                icon={<List className="w-3 h-3" />}
                            />
                        </div>
                    </div>

                    {/* Structure */}
                    <Folder title="📐 Structure" defaultCollapsed={true}>
                        <Folder title="Grid Layout" defaultCollapsed={false}>
                            <NumberInput
                                label="Rows"
                                value={settings.rows}
                                min={1}
                                max={50}
                                step={1}
                                onChange={(value) => onSettingChange('rows', value)}
                                resetValue={3}
                                onReset={() => onSettingChange('rows', 3)}
                            />
                            <NumberInput
                                label="Columns"
                                value={settings.cols}
                                min={1}
                                max={100}
                                step={1}
                                onChange={(value) => onSettingChange('cols', value)}
                                resetValue={12}
                                onReset={() => onSettingChange('cols', 12)}
                            />
                            <Slider
                                label="Row Spacing"
                                value={settings.rowSpacing}
                                min={0.1}
                                max={20}
                                step={0.1}
                                onChange={(value) => onSettingChange('rowSpacing', value)}
                                resetValue={2}
                                onReset={() => onSettingChange('rowSpacing', 2)}
                            />
                            <Slider
                                label="Column Spacing"
                                value={settings.colSpacing}
                                min={0.1}
                                max={20}
                                step={0.1}
                                onChange={(value) => onSettingChange('colSpacing', value)}
                                resetValue={2}
                                onReset={() => onSettingChange('colSpacing', 2)}
                            />
                        </Folder>

                        <Folder title="Shape Settings" defaultCollapsed={false}>
                            <Select
                                label="Shape Type"
                                value={settings.shapeType}
                                options={{ circle: 'Circle', rectangle: 'Rectangle' }}
                                onChange={(value) => onSettingChange('shapeType', value)}
                                resetValue="circle"
                                onReset={() => onSettingChange('shapeType', 'circle')}
                            />
                            <Slider
                                label="Circle Radius"
                                value={settings.circleRadius}
                                min={0.1}
                                max={12}
                                step={0.1}
                                onChange={(value) => onSettingChange('circleRadius', value)}
                                resetValue={0.8}
                                onReset={() => onSettingChange('circleRadius', 0.8)}
                            />
                            <Slider
                                label="Rectangle Width"
                                value={settings.rectangleWidth}
                                min={0.2}
                                max={12}
                                step={0.1}
                                onChange={(value) => onSettingChange('rectangleWidth', value)}
                                resetValue={1.6}
                                onReset={() => onSettingChange('rectangleWidth', 1.6)}
                            />
                            <Slider
                                label="Rectangle Height"
                                value={settings.rectangleHeight}
                                min={0.2}
                                max={12}
                                step={0.1}
                                onChange={(value) => onSettingChange('rectangleHeight', value)}
                                resetValue={1.2}
                                onReset={() => onSettingChange('rectangleHeight', 1.2)}
                            />
                            <Toggle
                                label="Enable Width Scaling"
                                value={settings.enableWidthScaling}
                                onChange={(value) => onSettingChange('enableWidthScaling', value)}
                                resetValue={false}
                                onReset={() => onSettingChange('enableWidthScaling', false)}
                            />
                            <Slider
                                label="Width Scale Factor"
                                value={settings.widthScaleFactor}
                                min={1.0}
                                max={10.0}
                                step={0.1}
                                onChange={(value) => onSettingChange('widthScaleFactor', value)}
                                resetValue={2.0}
                                onReset={() => onSettingChange('widthScaleFactor', 2.0)}
                            />
                            <Slider
                                label="Border Thickness"
                                value={settings.borderThickness}
                                min={0.05}
                                max={0.5}
                                step={0.01}
                                onChange={(value) => onSettingChange('borderThickness', value)}
                                resetValue={0.15}
                                onReset={() => onSettingChange('borderThickness', 0.15)}
                            />
                        </Folder>
                    </Folder>

                    {/* Transforms */}
                    <Folder title="🔄 Transforms" defaultCollapsed={true}>
                        <Folder title="Cylinder Roll" defaultCollapsed={false}>
                            <Select
                                label="Cylinder Axis"
                                value={settings.cylinderAxis}
                                options={{ 'y': 'Y-Axis (Horizontal)', 'x': 'X-Axis (Vertical)' }}
                                onChange={(value) => onSettingChange('cylinderAxis', value)}
                                resetValue="y"
                                onReset={() => onSettingChange('cylinderAxis', 'y')}
                            />
                            <Slider
                                label="Cylinder Curvature"
                                value={settings.cylinderCurvature}
                                min={0}
                                max={1}
                                step={0.01}
                                onChange={(value) => onSettingChange('cylinderCurvature', value)}
                                resetValue={0}
                                onReset={() => onSettingChange('cylinderCurvature', 0)}
                            />
                            <Slider
                                label="Cylinder Radius"
                                value={settings.cylinderRadius}
                                min={2}
                                max={20}
                                step={0.1}
                                onChange={(value) => onSettingChange('cylinderRadius', value)}
                                resetValue={8}
                                onReset={() => onSettingChange('cylinderRadius', 8)}
                            />
                        </Folder>

                        <Folder title="Object Transform" defaultCollapsed={false}>
                            <Folder title="Position" defaultCollapsed={false}>
                                <Slider
                                    label="Position X"
                                    value={settings.objectPositionX}
                                    min={-20}
                                    max={20}
                                    step={0.1}
                                    onChange={(value) => onSettingChange('objectPositionX', value)}
                                    resetValue={0}
                                    onReset={() => onSettingChange('objectPositionX', 0)}
                                />
                                <Slider
                                    label="Position Y"
                                    value={settings.objectPositionY}
                                    min={-20}
                                    max={20}
                                    step={0.1}
                                    onChange={(value) => onSettingChange('objectPositionY', value)}
                                    resetValue={0}
                                    onReset={() => onSettingChange('objectPositionY', 0)}
                                />
                                <Slider
                                    label="Position Z"
                                    value={settings.objectPositionZ}
                                    min={-20}
                                    max={20}
                                    step={0.1}
                                    onChange={(value) => onSettingChange('objectPositionZ', value)}
                                    resetValue={0}
                                    onReset={() => onSettingChange('objectPositionZ', 0)}
                                />
                            </Folder>
                            <Folder title="Rotation" defaultCollapsed={false}>
                                <Slider
                                    label="Rotation X"
                                    value={settings.rotationX}
                                    min={-Math.PI}
                                    max={Math.PI}
                                    step={0.1}
                                    onChange={(value) => onSettingChange('rotationX', value)}
                                    resetValue={0}
                                    onReset={() => onSettingChange('rotationX', 0)}
                                />
                                <Slider
                                    label="Rotation Y"
                                    value={settings.rotationY}
                                    min={-Math.PI}
                                    max={Math.PI}
                                    step={0.1}
                                    onChange={(value) => onSettingChange('rotationY', value)}
                                    resetValue={0}
                                    onReset={() => onSettingChange('rotationY', 0)}
                                    onAnimate={onAnimateRotationY}
                                    isAnimating={isRotationAnimating}
                                />
                                <Slider
                                    label="Rotation Z"
                                    value={settings.rotationZ}
                                    min={-Math.PI}
                                    max={Math.PI}
                                    step={0.1}
                                    onChange={(value) => onSettingChange('rotationZ', value)}
                                    resetValue={0}
                                    onReset={() => onSettingChange('rotationZ', 0)}
                                />
                                <Slider
                                    label="Animation Speed"
                                    value={settings.animationSpeed}
                                    min={0.1}
                                    max={5.0}
                                    step={0.1}
                                    onChange={(value) => onSettingChange('animationSpeed', value)}
                                    resetValue={1.0}
                                    onReset={() => onSettingChange('animationSpeed', 1.0)}
                                />
                            </Folder>
                        </Folder>
                    </Folder>

                    {/* Appearance */}
                    <Folder title="🎨 Appearance" defaultCollapsed={true}>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm text-[#666] font-medium">Background Color</label>
                                <button
                                    onClick={() => onSettingChange('backgroundColor', '#f5f7fa')}
                                    className="text-xs text-[#FF9500] hover:text-[#FF6B00] smooth-transition p-1 rounded"
                                    title="Reset to default"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={settings.backgroundColor}
                                    onChange={(e) => onSettingChange('backgroundColor', e.target.value)}
                                    className="w-8 h-8 rounded-lg border-2 border-white/20 cursor-pointer flex-shrink-0"
                                />
                                <input
                                    type="text"
                                    value={settings.backgroundColor}
                                    onChange={(e) => onSettingChange('backgroundColor', e.target.value)}
                                    className="w-20 h-8 px-2 text-xs font-mono bg-white/10 rounded-lg border border-white/20 text-[#007AFF] focus:outline-none focus:border-[#007AFF]"
                                    placeholder="#000000"
                                />
                            </div>
                        </div>

                        <Folder title="Color Group 1" defaultCollapsed={false}>
                            <Slider
                                label="Frequency"
                                value={settings.frequency1}
                                min={0}
                                max={5}
                                step={0.1}
                                onChange={(value) => onSettingChange('frequency1', value)}
                                resetValue={1}
                                onReset={() => onSettingChange('frequency1', 1)}
                            />
                            <Toggle
                                label="Sync Colors"
                                value={settings.syncColors1}
                                onChange={(value) => onSettingChange('syncColors1', value)}
                                resetValue={false}
                                onReset={() => onSettingChange('syncColors1', false)}
                            />
                            <ColorPicker
                                label="Fill Color"
                                value={settings.fill1}
                                onChange={(value) => onSettingChange('fill1', value)}
                                resetValue={{ r: 0, g: 122, b: 255, a: 0.8 }}
                                onReset={() => onSettingChange('fill1', { r: 0, g: 122, b: 255, a: 0.8 })}
                            />
                            <ColorPicker
                                label="Stroke Color"
                                value={settings.syncColors1 ? settings.fill1 : settings.stroke1}
                                onChange={(value) => onSettingChange('stroke1', value)}
                                resetValue={{ r: 0, g: 0, b: 0, a: 1.0 }}
                                onReset={() => onSettingChange('stroke1', { r: 0, g: 0, b: 0, a: 1.0 })}
                            />
                        </Folder>

                        <Folder title="Color Group 2" defaultCollapsed={false}>
                            <Slider
                                label="Frequency"
                                value={settings.frequency2}
                                min={0}
                                max={5}
                                step={0.1}
                                onChange={(value) => onSettingChange('frequency2', value)}
                                resetValue={1}
                                onReset={() => onSettingChange('frequency2', 1)}
                            />
                            <Toggle
                                label="Sync Colors"
                                value={settings.syncColors2}
                                onChange={(value) => onSettingChange('syncColors2', value)}
                                resetValue={false}
                                onReset={() => onSettingChange('syncColors2', false)}
                            />
                            <ColorPicker
                                label="Fill Color"
                                value={settings.fill2}
                                onChange={(value) => onSettingChange('fill2', value)}
                                resetValue={{ r: 52, g: 199, b: 89, a: 0.8 }}
                                onReset={() => onSettingChange('fill2', { r: 52, g: 199, b: 89, a: 0.8 })}
                            />
                            <ColorPicker
                                label="Stroke Color"
                                value={settings.syncColors2 ? settings.fill2 : settings.stroke2}
                                onChange={(value) => onSettingChange('stroke2', value)}
                                resetValue={{ r: 0, g: 0, b: 0, a: 1.0 }}
                                onReset={() => onSettingChange('stroke2', { r: 0, g: 0, b: 0, a: 1.0 })}
                            />
                        </Folder>

                        <Folder title="Color Group 3" defaultCollapsed={false}>
                            <Slider
                                label="Frequency"
                                value={settings.frequency3}
                                min={0}
                                max={5}
                                step={0.1}
                                onChange={(value) => onSettingChange('frequency3', value)}
                                resetValue={1}
                                onReset={() => onSettingChange('frequency3', 1)}
                            />
                            <Toggle
                                label="Sync Colors"
                                value={settings.syncColors3}
                                onChange={(value) => onSettingChange('syncColors3', value)}
                                resetValue={false}
                                onReset={() => onSettingChange('syncColors3', false)}
                            />
                            <ColorPicker
                                label="Fill Color"
                                value={settings.fill3}
                                onChange={(value) => onSettingChange('fill3', value)}
                                resetValue={{ r: 175, g: 82, b: 222, a: 0.8 }}
                                onReset={() => onSettingChange('fill3', { r: 175, g: 82, b: 222, a: 0.8 })}
                            />
                            <ColorPicker
                                label="Stroke Color"
                                value={settings.syncColors3 ? settings.fill3 : settings.stroke3}
                                onChange={(value) => onSettingChange('stroke3', value)}
                                resetValue={{ r: 0, g: 0, b: 0, a: 1.0 }}
                                onReset={() => onSettingChange('stroke3', { r: 0, g: 0, b: 0, a: 1.0 })}
                            />
                        </Folder>
                    </Folder>

                    {/* Camera */}
                    <Folder title="📹 Camera" defaultCollapsed={true}>
                        <Select
                            label="Control Type"
                            value={cameraControlType}
                            options={{ trackball: 'Trackball (Disabled)', orbit: 'Orbit' }}
                            onChange={(value) => onCameraControlTypeChange(value as 'trackball' | 'orbit')}
                            resetValue="orbit"
                            onReset={() => onCameraControlTypeChange('orbit')}
                            disabledOptions={['trackball']}
                        />
                        <Folder title="Position" defaultCollapsed={false}>
                            <Slider
                                label="Camera X"
                                value={settings.cameraPositionX}
                                min={-50}
                                max={50}
                                step={0.1}
                                onChange={(value) => onSettingChange('cameraPositionX', value)}
                                resetValue={0}
                                onReset={() => onSettingChange('cameraPositionX', 0)}
                            />
                            <Slider
                                label="Camera Y"
                                value={settings.cameraPositionY}
                                min={-50}
                                max={50}
                                step={0.1}
                                onChange={(value) => onSettingChange('cameraPositionY', value)}
                                resetValue={0}
                                onReset={() => onSettingChange('cameraPositionY', 0)}
                            />
                            <Slider
                                label="Camera Z"
                                value={settings.cameraPositionZ}
                                min={-50}
                                max={50}
                                step={0.1}
                                onChange={(value) => onSettingChange('cameraPositionZ', value)}
                                resetValue={15}
                                onReset={() => onSettingChange('cameraPositionZ', 15)}
                            />
                        </Folder>
                    </Folder>
                </div>
            </div>
        </>
    );
}; 