'use client';

import { useState, useEffect, useCallback } from 'react';
import CutoutCanvas from '@/components/CutoutCanvas';
import {
    generateInitialLayers,
    updateLayerCutout,
    updateLayerBlendMode,
    updateBackground,
} from '@/lib/layer-generator';
import { LayerElement, BlendMode, Category, Character } from '@/lib/assets-config';
import { cycleLayerImage } from '@/lib/layer-generator';

const Toggle = ({
                    label,
                    sublabel,
                    value,
                    onChange,
                }: {
    label: string;
    sublabel?: string;
    value: boolean;
    onChange: () => void;
}) => (
    <label className="flex items-center justify-between cursor-pointer group mb-6">
        <div className="flex-1">
            <div className="text-white text-sm">{label}</div>
            {sublabel && <div className="text-neutral-500 text-xs mt-1">{sublabel}</div>}
        </div>
        <div className="relative ml-6">
            <input
                type="checkbox"
                checked={value}
                onChange={onChange}
                className="sr-only peer"
            />
            <div className="w-12 h-6 bg-neutral-800 rounded-full peer-checked:bg-white transition-all cursor-pointer"></div>
            <div className="absolute left-1 top-1 w-4 h-4 bg-neutral-950 rounded-full transition-transform peer-checked:translate-x-6 cursor-pointer"></div>
        </div>
    </label>
);

const Dropdown = <T extends string>({
                                        label,
                                        value,
                                        options,
                                        onChange
                                    }: {
    label: string;
    value: T;
    options: Array<{ value: T; label: string }>;
    onChange: (value: T) => void;
}) => (
    <div className="space-y-2">
        <label className="block text-neutral-400 text-xs tracking-wide uppercase">
            {label}
        </label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value as T)}
            className="w-full bg-neutral-800 text-white text-sm px-4 py-3 rounded-sm border border-neutral-700 focus:border-white focus:outline-none transition-colors cursor-pointer hover:border-neutral-500"
        >
            {options.map(opt => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    </div>
);

export default function Home() {
    const [characterCount, setCharacterCount] = useState(2);
    const [useVariedBlending, setUseVariedBlending] = useState(false);
    const [globalBlendMode, setGlobalBlendMode] = useState<BlendMode>('source-over');
    const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isPanelVisible, setIsPanelVisible] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const [layers, setLayers] = useState<LayerElement[]>(() =>
        generateInitialLayers(2, false, 'source-over')
    );

    // Load localStorage values after mount to avoid hydration mismatch
    useEffect(() => {
        setIsClient(true);

        const savedBlending = localStorage.getItem('useVariedBlending');
        if (savedBlending) {
            const blendingValue = JSON.parse(savedBlending);
            setUseVariedBlending(blendingValue);
            setLayers(generateInitialLayers(characterCount, blendingValue, globalBlendMode));
        }

        const savedPanelVisible = localStorage.getItem('isPanelVisible');
        if (savedPanelVisible) {
            setIsPanelVisible(JSON.parse(savedPanelVisible));
        }
    }, []);

    const regenerate = useCallback(() => {
        setLayers(generateInitialLayers(characterCount, useVariedBlending, globalBlendMode));
    }, [characterCount, useVariedBlending, globalBlendMode]);

    // Detect mobile viewport
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Handle canvas dimensions
    useEffect(() => {
        const handleResize = () => {
            if (isMobile) {
                const panelHeight = isPanelVisible ? 500 : 0;
                setDimensions({
                    width: window.innerWidth,
                    height: window.innerHeight - panelHeight,
                });
            } else {
                const panelWidth = isPanelVisible ? 420 : 0;
                setDimensions({
                    width: window.innerWidth - panelWidth,
                    height: window.innerHeight,
                });
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isPanelVisible, isMobile]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'r' || e.key === 'R') {
                regenerate();
            }
            if (e.key === 'h' || e.key === 'H') {
                setIsPanelVisible(prev => {
                    const newValue = !prev;
                    localStorage.setItem('isPanelVisible', JSON.stringify(newValue));
                    return newValue;
                });
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [regenerate]);

    // Persist varied blending state
    useEffect(() => {
        localStorage.setItem('useVariedBlending', JSON.stringify(useVariedBlending));
    }, [useVariedBlending]);

    // Persist panel visibility state
    useEffect(() => {
        localStorage.setItem('isPanelVisible', JSON.stringify(isPanelVisible));
    }, [isPanelVisible]);

    const handleSliderChange = (newCount: number) => {
        setCharacterCount(newCount);
        setLayers(generateInitialLayers(newCount, useVariedBlending, globalBlendMode));
    };

    const handleBlendingToggle = () => {
        const newValue = !useVariedBlending;
        setUseVariedBlending(newValue);
        setLayers(generateInitialLayers(characterCount, newValue, globalBlendMode));
    };

    const handleGlobalBlendChange = (newMode: BlendMode) => {
        setGlobalBlendMode(newMode);
        setLayers(generateInitialLayers(characterCount, useVariedBlending, newMode));
    };

    const handleLayerCutoutChange = (layerId: string, category: Category, character: Character | null) => {
        setLayers(prev => {
            const oldLayer = prev.find(l => l.id === layerId);
            if (!oldLayer) return prev;

            const backgroundLayer = prev[0];
            const wasBackgroundFromThisLayer = backgroundLayer.imageUrl === oldLayer.backgroundUrl;

            const updatedLayers = prev.map(layer =>
                layer.id === layerId
                    ? updateLayerCutout(layer, category, character)
                    : layer
            );

            if (wasBackgroundFromThisLayer) {
                const cutoutLayers = updatedLayers.slice(1).filter(l => l.backgroundUrl);
                if (cutoutLayers.length > 0) {
                    const randomCutout = cutoutLayers[Math.floor(Math.random() * cutoutLayers.length)];
                    updatedLayers[0] = {
                        ...updatedLayers[0],
                        imageUrl: randomCutout.backgroundUrl,
                    };
                } else {
                    const randomEmptyBg = Math.floor(Math.random() * 4) + 1;
                    updatedLayers[0] = {
                        ...updatedLayers[0],
                        imageUrl: `https://cdn.byronic.art/HDA_CUTOUT/background/empty_0${randomEmptyBg}.webp`,
                    };
                }
            }

            return updatedLayers;
        });
    };

    const handleLayerBlendChange = (layerId: string, blendMode: BlendMode) => {
        setLayers(prev => prev.map(layer =>
            layer.id === layerId
                ? updateLayerBlendMode(layer, blendMode)
                : layer
        ));
    };

    const handleBackgroundChange = (option: 'empty-1' | 'empty-2' | 'empty-3' | 'empty-4' | 'random-empty' | 'random-cutout') => {
        setLayers(prev => updateBackground(prev, option));
    };

    const getCutoutOptions = () => {
        const options: Array<{ value: string; label: string }> = [];

        options.push({ value: 'back|none', label: 'Arrière' });
        options.push({ value: 'center|character-a', label: 'Centre A' });
        options.push({ value: 'center|character-b', label: 'Centre B' });
        options.push({ value: 'below|character-a', label: 'Dessous A' });
        options.push({ value: 'below|character-b', label: 'Dessous B' });
        options.push({ value: 'left|character-a', label: 'Gauche A' });
        options.push({ value: 'left|character-b', label: 'Gauche B' });
        options.push({ value: 'right|character-a', label: 'Droite A' });
        options.push({ value: 'right|character-b', label: 'Droite B' });

        return options;
    };

    const blendModeOptions: Array<{ value: BlendMode; label: string }> = [
        { value: 'source-over', label: 'Normal' },
        { value: 'darken', label: 'Assombrir' },
        { value: 'lighten', label: 'Éclaircir' },
        { value: 'luminosity', label: 'Luminosité' },
    ];

    const backgroundOptions: Array<{ value: string; label: string }> = [
        { value: 'random-empty', label: 'Vide Aléatoire' },
        { value: 'random-cutout', label: 'Découpe Aléatoire' },
        { value: 'empty-1', label: 'Vide 1' },
        { value: 'empty-2', label: 'Vide 2' },
        { value: 'empty-3', label: 'Vide 3' },
        { value: 'empty-4', label: 'Vide 4' },
    ];

    const cutoutLayers = layers.filter(l => l.category !== 'background');
    const handleCycleLayer = (layerId: string, direction: 'prev' | 'next') => {
        setLayers(prev => {
            const oldLayer = prev.find(l => l.id === layerId);
            if (!oldLayer) return prev;

            const backgroundLayer = prev[0];
            const wasBackgroundFromThisLayer = backgroundLayer.imageUrl === oldLayer.backgroundUrl;

            const updatedLayers = prev.map(layer =>
                layer.id === layerId
                    ? cycleLayerImage(layer, direction)
                    : layer
            );

            if (wasBackgroundFromThisLayer) {
                const updatedLayer = updatedLayers.find(l => l.id === layerId);
                if (updatedLayer) {
                    updatedLayers[0] = {
                        ...updatedLayers[0],
                        imageUrl: updatedLayer.backgroundUrl,
                    };
                }
            }

            return updatedLayers;
        });
    };

    // Desktop layout
    if (!isMobile) {
        return (
            <main className="w-screen h-screen bg-neutral-950 overflow-hidden flex relative">
                {/* Canvas */}
                <div className="flex-1 relative bg-neutral-900">
                    <CutoutCanvas
                        layers={layers}
                        width={dimensions.width}
                        height={dimensions.height}
                    />
                </div>

                {/* Toggle Panel Button */}
                <button
                    onClick={() => setIsPanelVisible(!isPanelVisible)}
                    className="fixed top-6 z-50 bg-neutral-800 hover:bg-neutral-700 text-white p-3 rounded-sm transition-all duration-300 cursor-pointer"
                    style={{ right: isPanelVisible ? '432px' : '24px' }}
                >
                    <svg
                        className={`w-5 h-5 transition-transform ${isPanelVisible ? '' : 'rotate-180'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>

                {/* Control Panel */}
                <div
                    className={`w-[420px] bg-neutral-900 border-l border-neutral-800 flex flex-col transition-transform duration-300 ease-in-out ${isPanelVisible ? 'translate-x-0' : 'translate-x-full'}`}
                >
                    {/* Header */}
                    <div className="px-12 pt-12 pb-10 border-b border-neutral-800">
                        <h1 className="text-white text-2xl font-light tracking-[0.2em] mb-2">
                            HDA AUTOPORTRAIT
                        </h1>
                        <p className="text-neutral-500 text-xs tracking-widest uppercase">
                            Liam CORNU - Prépa C
                        </p>
                    </div>

                    {/* Controls */}
                    <div className="flex-1 overflow-y-auto">
                        {/* Composite Mode */}
                        <div className="px-12 py-10 border-b border-neutral-800">
                            <div className="text-neutral-400 text-xs tracking-widest uppercase mb-8">
                                Mode de Composition
                            </div>

                            <Toggle
                                label="Aléatoire"
                                sublabel="par calque"
                                value={useVariedBlending}
                                onChange={handleBlendingToggle}
                            />

                            {!useVariedBlending && (
                                <div className="space-y-3">
                                    {blendModeOptions.map(mode => (
                                        <label key={mode.value} className="flex items-center cursor-pointer group">
                                            <input
                                                type="radio"
                                                name="blendMode"
                                                value={mode.value}
                                                checked={globalBlendMode === mode.value}
                                                onChange={() => handleGlobalBlendChange(mode.value)}
                                                className="w-4 h-4 cursor-pointer"
                                            />
                                            <span className="ml-4 text-sm text-neutral-300 group-hover:text-white transition-colors">
                                                {mode.label}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Character Count */}
                        <div className="px-12 py-10 border-b border-neutral-800">
                            <div className="flex items-baseline justify-between mb-8">
                                <div className="text-neutral-400 text-xs tracking-widest uppercase">
                                    Quantité
                                </div>
                                <div className="text-white text-4xl font-extralight tabular-nums">
                                    {characterCount}
                                </div>
                            </div>

                            <div className="relative">
                                <input
                                    type="range"
                                    min="1"
                                    max="8"
                                    value={characterCount}
                                    onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                                    className="w-full h-0.5 bg-neutral-800 appearance-none cursor-grab active:cursor-grabbing rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:active:cursor-grabbing [&::-moz-range-thumb]:shadow-lg"
                                />

                                <div className="flex justify-between mt-4 px-0.5">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                                        <div
                                            key={num}
                                            className={`text-xs transition-colors ${
                                                characterCount >= num
                                                    ? 'text-white font-medium'
                                                    : 'text-neutral-700'
                                            }`}
                                        >
                                            {num}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Layer Options */}
                        <div className="px-12 py-10">
                            <button
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="w-full flex items-center justify-between text-neutral-400 text-xs tracking-widest uppercase hover:text-white transition-colors mb-8 cursor-pointer"
                            >
                                <span>Paramètres</span>
                                <svg
                                    className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {showAdvanced && (
                                <div className="space-y-6 animate-in fade-in duration-200">
                                    <Dropdown
                                        label="Arrière-plan"
                                        value="random-empty"
                                        options={backgroundOptions}
                                        onChange={(v) => handleBackgroundChange(v as any)}
                                    />

                                    {cutoutLayers.map((layer, index) => (
                                        <div key={layer.id} className="pt-6 border-t border-neutral-800 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="text-white text-xs tracking-widest uppercase">
                                                    Calque {index + 1}
                                                </div>

                                                {/* Cycle arrows */}
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleCycleLayer(layer.id, 'prev')}
                                                        className="p-1.5 bg-neutral-800 hover:bg-neutral-700 rounded transition-colors cursor-pointer"
                                                        title="Image précédente"
                                                    >
                                                        <svg
                                                            className="w-3 h-3 text-white"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleCycleLayer(layer.id, 'next')}
                                                        className="p-1.5 bg-neutral-800 hover:bg-neutral-700 rounded transition-colors cursor-pointer"
                                                        title="Image suivante"
                                                    >
                                                        <svg
                                                            className="w-3 h-3 text-white"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>

                                            <Dropdown
                                                label="Position"
                                                value={`${layer.category}|${layer.character || 'none'}`}
                                                options={getCutoutOptions()}
                                                onChange={(v) => {
                                                    const [cat, char] = v.split('|');
                                                    handleLayerCutoutChange(
                                                        layer.id,
                                                        cat as Category,
                                                        char === 'none' ? null : char as Character
                                                    );
                                                }}
                                            />

                                            <Dropdown
                                                label="Mode de Fusion"
                                                value={layer.blendMode}
                                                options={blendModeOptions}
                                                onChange={(v) => handleLayerBlendChange(layer.id, v)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Generate Button */}
                    <div className="px-12 py-10 border-t border-neutral-800">
                        <button
                            onClick={regenerate}
                            className="w-full bg-white text-black py-5 rounded-sm hover:bg-neutral-200 active:bg-neutral-300 transition-all text-base tracking-[0.25em] uppercase font-medium shadow-lg hover:shadow-xl active:scale-[0.98] cursor-pointer"
                        >
                            CRÉER
                        </button>

                        <div className="mt-6 flex items-center justify-center gap-3 text-xs text-neutral-600">
                            <div className="flex items-center gap-2">
                                <kbd className="px-2 py-1 bg-neutral-800 text-neutral-400 rounded-sm font-mono">R</kbd>
                                <span>Créer</span>
                            </div>
                            <span>•</span>
                            <div className="flex items-center gap-2">
                                <kbd className="px-2 py-1 bg-neutral-800 text-neutral-400 rounded-sm font-mono">H</kbd>
                                <span>Masquer Panneau</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-12 py-6 border-t border-neutral-800">
                        <div className="text-neutral-600 text-xs tracking-widest text-center">
                            © 2025 <a className={"hover:underline"} href={"https://liam.social"}>liam.social</a>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    // Mobile layout
    return (
        <main className="w-screen h-screen bg-neutral-950 overflow-hidden flex flex-col relative">
            {/* Canvas */}
            <div className="flex-1 relative bg-neutral-900">
                <CutoutCanvas
                    layers={layers}
                    width={dimensions.width}
                    height={dimensions.height}
                />
            </div>

            {/* Toggle Panel Button */}
            <button
                onClick={() => setIsPanelVisible(!isPanelVisible)}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-neutral-800 hover:bg-neutral-700 text-white p-4 rounded-full transition-all duration-300 cursor-pointer shadow-lg"
                style={{
                    bottom: isPanelVisible ? 'calc(500px + 24px)' : '24px',
                    touchAction: 'manipulation'
                }}
            >
                <svg
                    className={`w-6 h-6 transition-transform ${isPanelVisible ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
            </button>

            {/* Control Panel  */}
            <div
                className={`fixed bottom-0 left-0 right-0 h-[500px] bg-neutral-900 border-t border-neutral-800 flex flex-col transition-transform duration-300 ease-in-out ${isPanelVisible ? 'translate-y-0' : 'translate-y-full'}`}
                style={{ touchAction: 'pan-y' }}
            >
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-neutral-800">
                    <h1 className="text-white text-xl font-light tracking-[0.2em] mb-1">
                        HDA AUTOPORTRAIT
                    </h1>
                    <p className="text-neutral-500 text-xs tracking-widest uppercase">
                        Liam CORNU - Prépa C
                    </p>
                </div>

                {/* Controls - Scrollable */}
                <div className="flex-1 overflow-y-auto overscroll-contain">
                    {/* Composite Mode */}
                    <div className="px-6 py-6 border-b border-neutral-800">
                        <div className="text-neutral-400 text-xs tracking-widest uppercase mb-6">
                            Mode de Composition
                        </div>

                        <Toggle
                            label="Mélange Varié"
                            sublabel="Aléatoire par calque"
                            value={useVariedBlending}
                            onChange={handleBlendingToggle}
                        />

                        {!useVariedBlending && (
                            <div className="space-y-4">
                                {blendModeOptions.map(mode => (
                                    <label key={mode.value} className="flex items-center cursor-pointer group min-h-[48px]">
                                        <input
                                            type="radio"
                                            name="blendMode"
                                            value={mode.value}
                                            checked={globalBlendMode === mode.value}
                                            onChange={() => handleGlobalBlendChange(mode.value)}
                                            className="w-5 h-5 cursor-pointer"
                                        />
                                        <span className="ml-4 text-base text-neutral-300 group-hover:text-white transition-colors">
                                            {mode.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Character Count */}
                    <div className="px-6 py-6 border-b border-neutral-800">
                        <div className="flex items-baseline justify-between mb-6">
                            <div className="text-neutral-400 text-xs tracking-widest uppercase">
                                Quantité
                            </div>
                            <div className="text-white text-3xl font-extralight tabular-nums">
                                {characterCount}
                            </div>
                        </div>

                        <div className="relative">
                            <input
                                type="range"
                                min="1"
                                max="8"
                                value={characterCount}
                                onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                                className="w-full h-1 bg-neutral-800 appearance-none rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg [&::-moz-range-thumb]:w-8 [&::-moz-range-thumb]:h-8 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-lg"
                                style={{ touchAction: 'none' }}
                            />

                            <div className="flex justify-between mt-4 px-0.5">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                                    <div
                                        key={num}
                                        className={`text-sm transition-colors ${
                                            characterCount >= num
                                                ? 'text-white font-medium'
                                                : 'text-neutral-700'
                                        }`}
                                    >
                                        {num}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Layer Options */}
                    <div className="px-6 py-6">
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="w-full flex items-center justify-between text-neutral-400 text-xs tracking-widest uppercase hover:text-white transition-colors mb-6 cursor-pointer min-h-[48px]"
                            style={{ touchAction: 'manipulation' }}
                        >
                            <span>Paramètres</span>
                            <svg
                                className={`w-5 h-5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {showAdvanced && (
                            <div className="space-y-6 animate-in fade-in duration-200">
                                <Dropdown
                                    label="Arrière-plan"
                                    value="random-empty"
                                    options={backgroundOptions}
                                    onChange={(v) => handleBackgroundChange(v as any)}
                                />

                                {cutoutLayers.map((layer, index) => (
                                    <div key={layer.id} className="pt-6 border-t border-neutral-800 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="text-white text-sm tracking-widest uppercase">
                                                Calque {index + 1}
                                            </div>

                                            {/* Cycle arrows */}
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => handleCycleLayer(layer.id, 'prev')}
                                                    className="p-3 bg-neutral-800 hover:bg-neutral-700 rounded transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                                                    title="Image précédente"
                                                    style={{ touchAction: 'manipulation' }}
                                                >
                                                    <svg
                                                        className="w-4 h-4 text-white"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleCycleLayer(layer.id, 'next')}
                                                    className="p-3 bg-neutral-800 hover:bg-neutral-700 rounded transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                                                    title="Image suivante"
                                                    style={{ touchAction: 'manipulation' }}
                                                >
                                                    <svg
                                                        className="w-4 h-4 text-white"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>

                                        <Dropdown
                                            label="Position"
                                            value={`${layer.category}|${layer.character || 'none'}`}
                                            options={getCutoutOptions()}
                                            onChange={(v) => {
                                                const [cat, char] = v.split('|');
                                                handleLayerCutoutChange(
                                                    layer.id,
                                                    cat as Category,
                                                    char === 'none' ? null : char as Character
                                                );
                                            }}
                                        />

                                        <Dropdown
                                            label="Mode de Fusion"
                                            value={layer.blendMode}
                                            options={blendModeOptions}
                                            onChange={(v) => handleLayerBlendChange(layer.id, v)}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Bottom spacing for safe area */}
                    <div className="h-24" />
                </div>

                <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-900">
                    <button
                        onClick={regenerate}
                        className="w-full bg-white text-black py-4 rounded-sm active:bg-neutral-300 transition-all text-base tracking-[0.25em] uppercase font-medium shadow-lg min-h-[56px]"
                        style={{ touchAction: 'manipulation' }}
                    >
                        Créer
                    </button>

                    <div className="mt-4 text-center text-xs text-neutral-600">
                        <div className="text-neutral-600 text-xs tracking-widest">
                            © 2025 <a className={"hover:underline"} href={"https://liam.social"}>liam.social</a>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}