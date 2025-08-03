import React, { useState, useRef } from 'react';
import { ChevronDown, ChevronRight, RotateCcw, Share2, Camera, Palette } from 'lucide-react';

// 폴더 컴포넌트
interface FolderProps {
    title: string;
    children: React.ReactNode;
    defaultCollapsed?: boolean;
    icon?: React.ReactNode;
}

export const Folder: React.FC<FolderProps> = ({ title, children, defaultCollapsed = false, icon }) => {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

    return (
        <div className="glass-weak rounded-xl overflow-hidden">
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-full px-4 py-3 flex items-center justify-between text-left text-[#007AFF] font-medium hover:bg-white/10 smooth-transition"
            >
                <div className="flex items-center gap-2">
                    {icon && <span className="text-sm">{icon}</span>}
                    <span>{title}</span>
                </div>
                {isCollapsed ? (
                    <ChevronRight className="w-4 h-4" />
                ) : (
                    <ChevronDown className="w-4 h-4" />
                )}
            </button>
            {!isCollapsed && (
                <div className="px-4 pb-4 space-y-3">
                    {children}
                </div>
            )}
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
}

export const Slider: React.FC<SliderProps> = ({
    label,
    value,
    min,
    max,
    step = 0.1,
    onChange,
    resetValue,
    onReset
}) => {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-sm text-[#666] font-medium">{label}</label>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-[#007AFF] font-mono bg-white/10 px-2 py-1 rounded">
                        {value.toFixed(2)}
                    </span>
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
        const newValue = parseFloat(e.target.value);
        if (!isNaN(newValue)) {
            onChange(newValue);
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
}

export const Select: React.FC<SelectProps> = ({
    label,
    value,
    options,
    onChange,
    resetValue,
    onReset
}) => {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
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
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="input-glass w-full px-3 py-2 text-sm"
            >
                {Object.entries(options).map(([key, label]) => (
                    <option key={key} value={key}>
                        {label}
                    </option>
                ))}
            </select>
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
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-[#34C759]' : 'bg-white/20'
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
                    <span className="text-xs text-[#007AFF] font-mono w-8">
                        {value.a.toFixed(2)}
                    </span>
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
    const baseClasses = "font-medium rounded-lg smooth-transition focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center gap-2";

    const variantClasses = {
        primary: "bg-[#007AFF] text-white hover:bg-[#0056CC] focus:ring-[#007AFF]",
        secondary: "bg-white/10 text-[#007AFF] hover:bg-white/20 focus:ring-[#007AFF]",
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
    isVisible: boolean;
    onToggleVisibility: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
    settings,
    onSettingChange,
    onResetAll,
    onResetCamera,
    onRegenerateColors,
    onShareURL,
    isVisible,
    onToggleVisibility
}) => {
    return (
        <>
            {/* Toggle Button - 항상 표시 */}
            <button
                onClick={onToggleVisibility}
                className={`fixed top-4 right-4 z-30 p-3 rounded-2xl glass-strong text-[#007AFF] hover:text-[#0056CC] hover:scale-105 control-panel-toggle ${isVisible ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 scale-100'}`}
                title={isVisible ? "Hide Control Panel" : "Show Control Panel"}
            >
                <Palette className="w-6 h-6" />
            </button>

            {/* Control Panel - 슬라이드 애니메이션 */}
            <div className={`fixed top-4 right-4 w-80 max-h-[calc(100vh-2rem)] overflow-y-auto glass-strong rounded-2xl shadow-2xl border border-white/20 z-30 control-panel-slide ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-4 space-y-4">
                    {/* 헤더 */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/20">
                        <h2 className="text-lg font-semibold text-[#007AFF] flex items-center gap-2">
                            <Palette className="w-5 h-5" />
                            Controls
                        </h2>
                        <div className="flex gap-2">
                            <button
                                onClick={onToggleVisibility}
                                className="text-[#007AFF] hover:text-[#0056CC] smooth-transition p-2 rounded-xl hover:bg-white/10"
                                title="Hide Control Panel"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-[#007AFF]">Quick Actions</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="glass-weak rounded-xl p-1 flex items-center justify-center border border-white/20">
                                <Button
                                    label="Reset All"
                                    onClick={onResetAll}
                                    variant="secondary"
                                    size="sm"
                                    icon={<RotateCcw className="w-3 h-3" />}
                                />
                            </div>
                            <div className="glass-weak rounded-xl p-1 flex items-center justify-center border border-white/20">
                                <Button
                                    label="Reset Camera"
                                    onClick={onResetCamera}
                                    variant="secondary"
                                    size="sm"
                                    icon={<Camera className="w-3 h-3" />}
                                />
                            </div>
                            <div className="glass-weak rounded-xl p-1 flex items-center justify-center border border-white/20">
                                <Button
                                    label="Regenerate"
                                    onClick={onRegenerateColors}
                                    variant="secondary"
                                    size="sm"
                                    icon={<Palette className="w-3 h-3" />}
                                />
                            </div>
                            <div className="glass-weak rounded-xl p-1 flex items-center justify-center border border-white/20">
                                <Button
                                    label="Share"
                                    onClick={onShareURL}
                                    variant="secondary"
                                    size="sm"
                                    icon={<Share2 className="w-3 h-3" />}
                                />
                            </div>
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
                                options={{ Circle: 'Circle', Rectangle: 'Rectangle' }}
                                onChange={(value) => onSettingChange('shapeType', value)}
                                resetValue="Circle"
                                onReset={() => onSettingChange('shapeType', 'Circle')}
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
                                options={{ 'Y-Axis (Horizontal)': 'y', 'X-Axis (Vertical)': 'x' }}
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
                            </Folder>
                        </Folder>
                    </Folder>

                    {/* Appearance */}
                    <Folder title="🎨 Appearance" defaultCollapsed={true}>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm text-[#666] font-medium">Background Color</label>
                            </div>
                            <input
                                type="color"
                                value={settings.backgroundColor}
                                onChange={(e) => onSettingChange('backgroundColor', e.target.value)}
                                className="w-full h-10 rounded-lg border-2 border-white/20 cursor-pointer"
                            />
                        </div>

                        <Folder title="Color Group 1" defaultCollapsed={false}>
                            <Slider
                                label="Frequency"
                                value={settings.frequency1}
                                min={0}
                                max={5}
                                step={1}
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
                                value={settings.stroke1}
                                onChange={(value) => onSettingChange('stroke1', value)}
                                resetValue={{ r: 0, g: 122, b: 255, a: 1.0 }}
                                onReset={() => onSettingChange('stroke1', { r: 0, g: 122, b: 255, a: 1.0 })}
                            />
                        </Folder>

                        <Folder title="Color Group 2" defaultCollapsed={false}>
                            <Slider
                                label="Frequency"
                                value={settings.frequency2}
                                min={0}
                                max={5}
                                step={1}
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
                                value={settings.stroke2}
                                onChange={(value) => onSettingChange('stroke2', value)}
                                resetValue={{ r: 52, g: 199, b: 89, a: 1.0 }}
                                onReset={() => onSettingChange('stroke2', { r: 52, g: 199, b: 89, a: 1.0 })}
                            />
                        </Folder>

                        <Folder title="Color Group 3" defaultCollapsed={false}>
                            <Slider
                                label="Frequency"
                                value={settings.frequency3}
                                min={0}
                                max={5}
                                step={1}
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
                                value={settings.stroke3}
                                onChange={(value) => onSettingChange('stroke3', value)}
                                resetValue={{ r: 175, g: 82, b: 222, a: 1.0 }}
                                onReset={() => onSettingChange('stroke3', { r: 175, g: 82, b: 222, a: 1.0 })}
                            />
                        </Folder>
                    </Folder>

                    {/* Camera */}
                    <Folder title="📹 Camera" defaultCollapsed={true}>
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