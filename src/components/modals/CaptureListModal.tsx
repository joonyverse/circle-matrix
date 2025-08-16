import React, { useState, useEffect } from 'react';
import { Download, Trash2, Share2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../controls/ControlPanel';
import JSZip from 'jszip';

interface CaptureItem {
    id: string;
    name: string;
    dataUrl: string;
    timestamp: number;
    settings: any;
}

interface CaptureListModalProps {
    isOpen: boolean;
    onClose: () => void;
    toast: any;
}

export const CaptureListModal: React.FC<CaptureListModalProps> = ({ isOpen, onClose, toast }) => {
    const [captures, setCaptures] = useState<CaptureItem[]>([]);
    const [selectedCapture, setSelectedCapture] = useState<CaptureItem | null>(null);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [isSelectMode, setIsSelectMode] = useState(false);

    // 로컬스토리지에서 캡처 목록 로드
    useEffect(() => {
        if (isOpen) {
            const savedCaptures = localStorage.getItem('circle-matrix-captures');
            if (savedCaptures) {
                try {
                    setCaptures(JSON.parse(savedCaptures));
                } catch (error) {
                    console.error('Failed to load captures:', error);
                    setCaptures([]);
                }
            }
        }
    }, [isOpen]);

    // 캡처 목록을 로컬스토리지에 저장
    const saveCaptures = (newCaptures: CaptureItem[]) => {
        localStorage.setItem('circle-matrix-captures', JSON.stringify(newCaptures));
        setCaptures(newCaptures);
    };

    // 캡처 삭제
    const handleDeleteCapture = (id: string) => {
        const newCaptures = captures.filter(capture => capture.id !== id);
        saveCaptures(newCaptures);
        if (selectedCapture?.id === id) {
            setSelectedCapture(null);
        }
        if (toast && toast.success) {
            toast.success('Capture deleted');
        }
    };

    // 캡처 다운로드
    const handleDownloadCapture = (capture: CaptureItem) => {
        const link = document.createElement('a');
        link.href = capture.dataUrl;
        link.download = `${capture.name}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        if (toast && toast.success) {
            toast.success('Capture downloaded');
        }
    };

    // 캡처 공유 (URL 생성)
    const handleShareCapture = async (capture: CaptureItem) => {
        try {
            const shareData = {
                settings: capture.settings,
                timestamp: capture.timestamp
            };

            const url = `${window.location.origin}${window.location.pathname}?project=${encodeURIComponent(JSON.stringify(shareData))}`;

            // TinyURL로 단축
            const response = await fetch('https://tinyurl.com/api-create.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `url=${encodeURIComponent(url)}`
            });

            if (response.ok) {
                const shortUrl = await response.text();
                await navigator.clipboard.writeText(shortUrl);
                if (toast && toast.success) {
                    toast.success('Share URL copied to clipboard!');
                }
            } else {
                await navigator.clipboard.writeText(url);
                if (toast && toast.success) {
                    toast.success('Share URL copied to clipboard!');
                }
            }
        } catch (error) {
            console.error('Failed to share capture:', error);
            if (toast && toast.error) {
                toast.error('Failed to share capture');
            }
        }
    };

    // 다중 선택 관련 함수들
    const toggleSelectMode = () => {
        setIsSelectMode(!isSelectMode);
        if (isSelectMode) {
            setSelectedItems(new Set());
            setSelectedCapture(null);
        }
    };

    const toggleSelectAll = () => {
        if (selectedItems.size === captures.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(captures.map(c => c.id)));
        }
    };

    const toggleSelectItem = (id: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedItems(newSelected);
    };

    const deleteSelectedItems = () => {
        const newCaptures = captures.filter(capture => !selectedItems.has(capture.id));
        saveCaptures(newCaptures);
        setSelectedItems(new Set());
        setIsSelectMode(false);
        if (selectedCapture && selectedItems.has(selectedCapture.id)) {
            setSelectedCapture(null);
        }
        if (toast && toast.success) {
            toast.success(`${selectedItems.size} capture(s) deleted`);
        }
    };

    const downloadSelectedItems = async () => {
        const selectedCaptures = captures.filter(capture => selectedItems.has(capture.id));

        if (selectedCaptures.length === 0) return;

        try {
            const zip = new JSZip();

            // 각 캡처를 ZIP에 추가
            selectedCaptures.forEach((capture) => {
                // dataUrl에서 base64 데이터 추출
                const base64Data = capture.dataUrl.split(',')[1];
                zip.file(`${capture.name}.png`, base64Data, { base64: true });
            });

            // ZIP 파일 생성
            const zipBlob = await zip.generateAsync({ type: 'blob' });

            // 다운로드
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            link.download = `captures_${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // 메모리 정리
            URL.revokeObjectURL(link.href);

            if (toast && toast.success) {
                toast.success(`${selectedItems.size} capture(s) downloaded as ZIP`);
            }
        } catch (error) {
            console.error('Failed to create ZIP:', error);
            if (toast && toast.error) {
                toast.error('Failed to create ZIP file');
            }
        }
    };

    // 날짜 포맷팅
    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Capture List"
            maxWidth="w-[70vw]"
        >
            <div className="flex flex-col h-[70vh] capture-modal" style={{ maxHeight: '70vh' }}>
                {/* 선택 모드 헤더 */}
                {isSelectMode && (
                    <div className="glass-strong rounded-xl p-3 border border-white/20 mb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={toggleSelectAll}
                                    className="text-sm smooth-transition"
                                    style={{ color: 'var(--text-heading)' }}
                                >
                                    {selectedItems.size === captures.length ? 'Deselect All' : 'Select All'}
                                </button>
                                <span className="text-sm text-[#666]">
                                    {selectedItems.size} of {captures.length} selected
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={downloadSelectedItems}
                                    disabled={selectedItems.size === 0}
                                    className="px-3 py-1 text-sm bg-[#007AFF] text-white rounded-lg hover:bg-[#0056CC] disabled:opacity-50 disabled:cursor-not-allowed smooth-transition"
                                >
                                    Download ZIP ({selectedItems.size})
                                </button>
                                <button
                                    onClick={deleteSelectedItems}
                                    disabled={selectedItems.size === 0}
                                    className="px-3 py-1 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed smooth-transition"
                                >
                                    Delete ({selectedItems.size})
                                </button>
                                <button
                                    onClick={toggleSelectMode}
                                    className="px-3 py-1 text-sm bg-white/10 rounded-lg hover:bg-white/20 smooth-transition"
                                    style={{ color: 'var(--text-heading)' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 일반 모드에서 선택 모드 버튼 */}
                {!isSelectMode && captures.length > 0 && (
                    <div className="flex justify-end mb-4">
                        <button
                            onClick={toggleSelectMode}
                            className="px-3 py-1 text-sm bg-white/10 rounded-lg hover:bg-white/20 smooth-transition"
                            style={{ color: 'var(--text-heading)' }}
                        >
                            Select Mode
                        </button>
                    </div>
                )}

                <div className="flex flex-1 gap-4">
                    {/* 캡처 목록 */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="grid grid-cols-3 gap-3">
                            {captures.length === 0 ? (
                                <div className="col-span-3 text-center py-12 text-[#666]">
                                    <p className="text-lg font-medium mb-2">No captures yet</p>
                                    <p className="text-sm">Your captures will appear here</p>
                                </div>
                            ) : (
                                captures.map((capture) => (
                                    <div
                                        key={capture.id}
                                        className={`glass-weak rounded-xl p-3 cursor-pointer border-2 transition-all hover:border-[#007AFF]/50 ${isSelectMode
                                            ? selectedItems.has(capture.id)
                                                ? 'border-[#007AFF] bg-[#007AFF]/10'
                                                : 'border-white/20'
                                            : selectedCapture?.id === capture.id
                                                ? 'border-[#007AFF]'
                                                : 'border-white/20'
                                            }`}
                                        onClick={() => {
                                            if (isSelectMode) {
                                                toggleSelectItem(capture.id);
                                            } else {
                                                setSelectedCapture(capture);
                                            }
                                        }}
                                    >
                                        <div className="relative">
                                            {isSelectMode && (
                                                <div className="absolute top-3 left-3 z-10">
                                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${selectedItems.has(capture.id)
                                                        ? 'bg-[#007AFF] border-[#007AFF] shadow-lg shadow-[#007AFF]/30'
                                                        : 'bg-white/90 backdrop-blur-sm border-white/60 hover:border-[#007AFF]/60 hover:bg-white/95'
                                                        }`}>
                                                        {selectedItems.has(capture.id) && (
                                                            <svg
                                                                className="w-4 h-4 text-white"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={3}
                                                                    d="M5 13l4 4L19 7"
                                                                />
                                                            </svg>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="aspect-video bg-white/10 rounded-lg mb-3 overflow-hidden">
                                                <img
                                                    src={capture.dataUrl}
                                                    alt={capture.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="font-medium text-sm truncate" style={{ color: 'var(--text-heading)' }}>
                                                {capture.name}
                                            </h3>
                                            <p className="text-xs text-[#666]">
                                                {formatDate(capture.timestamp)}
                                            </p>
                                            {!isSelectMode && (
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDownloadCapture(capture);
                                                        }}
                                                        className="p-1 hover:bg-gray-100 rounded smooth-transition"
                                                        style={{ color: 'var(--text-heading)' }}
                                                        title="Download"
                                                    >
                                                        <Download className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleShareCapture(capture);
                                                        }}
                                                        className="p-1 hover:bg-gray-100 rounded smooth-transition"
                                                        style={{ color: 'var(--text-heading)' }}
                                                        title="Share"
                                                    >
                                                        <Share2 className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteCapture(capture.id);
                                                        }}
                                                        className="p-1 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded smooth-transition"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* 선택된 캡처 상세보기 */}
                    {selectedCapture && !isSelectMode && (
                        <div className="w-72 glass-weak rounded-xl p-4 border border-white/20">
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-semibold mb-2" style={{ color: 'var(--text-heading)' }}>
                                        {selectedCapture.name}
                                    </h3>
                                    <p className="text-sm text-[#666]">
                                        {formatDate(selectedCapture.timestamp)}
                                    </p>
                                </div>

                                <div className="aspect-video bg-white/10 rounded-lg overflow-hidden">
                                    <img
                                        src={selectedCapture.dataUrl}
                                        alt={selectedCapture.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>Settings</h4>
                                    <div className="text-xs text-[#666] space-y-1 max-h-32 overflow-y-auto">
                                        <div>Rows: {selectedCapture.settings.rows}</div>
                                        <div>Columns: {selectedCapture.settings.cols}</div>
                                        <div>Row Spacing: {selectedCapture.settings.rowSpacing}</div>
                                        <div>Column Spacing: {selectedCapture.settings.colSpacing}</div>
                                        <div>Circle Size: {selectedCapture.settings.circleSize}</div>
                                        <div>Background: {selectedCapture.settings.backgroundColor}</div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        label="Download"
                                        onClick={() => handleDownloadCapture(selectedCapture)}
                                        variant="secondary"
                                        size="sm"
                                        icon={<Download className="w-3 h-3" />}
                                    />
                                    <Button
                                        label="Share"
                                        onClick={() => handleShareCapture(selectedCapture)}
                                        variant="secondary"
                                        size="sm"
                                        icon={<Share2 className="w-3 h-3" />}
                                    />
                                    <Button
                                        label="Delete"
                                        onClick={() => handleDeleteCapture(selectedCapture.id)}
                                        variant="danger"
                                        size="sm"
                                        icon={<Trash2 className="w-3 h-3" />}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}; 