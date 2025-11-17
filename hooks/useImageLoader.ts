import { useState, useEffect } from 'react';
import { LayerElement } from '@/lib/assets-config';

interface LoadedImage {
    id: string;
    image: HTMLImageElement;
    layer: LayerElement;
}

export function useImageLoader(layers: LayerElement[]) {
    const [loadedImages, setLoadedImages] = useState<LoadedImage[]>([]);
    const [progress, setProgress] = useState(0);
    const [loadingKey, setLoadingKey] = useState(0);

    const isLoading = loadedImages.length === 0 && progress < 100;

    useEffect(() => {
        // Reset state for new layers
        setLoadedImages([]);
        setProgress(0);
        setLoadingKey(prev => prev + 1);

        const imagesToLoad = layers.map(layer => layer.imageUrl);
        const loadedCount = { current: 0 };
        const images: LoadedImage[] = [];

        const loadImage = (layer: LayerElement): Promise<LoadedImage> => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';

                img.onload = () => {
                    loadedCount.current++;
                    setProgress((loadedCount.current / imagesToLoad.length) * 100);
                    resolve({ id: layer.id, image: img, layer });
                };

                img.onerror = reject;
                img.src = layer.imageUrl;
            });
        };

        Promise.all(layers.map(loadImage))
            .then(results => {
                setLoadedImages(results);
            })
            .catch(err => {
                console.error('Failed to load images:', err);
            });
    }, [layers]);

    return { loadedImages, isLoading, progress };
}