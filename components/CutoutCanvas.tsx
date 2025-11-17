'use client';

import { useRef } from 'react';
import { Stage, Layer, Image as KonvaImage } from 'react-konva';
import { LayerElement } from '@/lib/assets-config';
import { useImageLoader } from '@/hooks/useImageLoader';
import Konva from 'konva';

interface CutoutCanvasProps {
    layers: LayerElement[];
    width: number;
    height: number;
    skipLoading?: boolean;
}

export default function CutoutCanvas({ layers, width, height, skipLoading = false }: CutoutCanvasProps) {
    const { loadedImages, isLoading, progress } = useImageLoader(layers);
    const stageRef = useRef<Konva.Stage>(null);

    if (isLoading && !skipLoading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-neutral-900">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-neutral-700 border-t-white rounded-full animate-spin mx-auto mb-4" />
                    <div className="text-neutral-400 text-sm">{Math.round(progress)}%</div>
                </div>
            </div>
        );
    }

    // Sort by zIndex for proper rendering order
    const sortedImages = [...loadedImages].sort((a, b) => a.layer.zIndex - b.layer.zIndex);

    return (
        <Stage width={width} height={height} ref={stageRef}>
            <Layer>
                {sortedImages.map(({ id, image, layer }) => {
                    const isBackground = layer.category === 'background';

                    // Calculate scaling to fit canvas while maintaining aspect ratio
                    const scale = Math.min(width / image.width, height / image.height);
                    const x = (width - image.width * scale) / 2;
                    const y = (height - image.height * scale) / 2;

                    return (
                        <KonvaImage
                            key={id}
                            image={image}
                            x={x}
                            y={y}
                            scaleX={scale}
                            scaleY={scale}
                            globalCompositeOperation={
                                layer.blendMode === 'source-over' ? 'source-over' :
                                    layer.blendMode === 'darken' ? 'darken' :
                                        layer.blendMode === 'lighten' ? 'lighten' :
                                            'luminosity'
                            }
                            filters={isBackground ? [] : [Konva.Filters.Blur]}
                            blurRadius={isBackground ? 0 : 100}
                            listening={false}
                        />
                    );
                })}
            </Layer>
        </Stage>
    );
}