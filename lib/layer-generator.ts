import {
    ASSET_COUNTS,
    Category,
    Character,
    BlendMode,
    LayerElement,
    getAssetUrl
} from './assets-config';

const BLEND_MODES: BlendMode[] = ['source-over', 'darken', 'lighten', 'luminosity'];

export type LayerConfig = {
    category: Category;
    character: Character | null;
    index: number;
};

function randomInt(max: number): number {
    return Math.floor(Math.random() * max) + 1;
}

function randomBlendMode(): BlendMode {
    return BLEND_MODES[Math.floor(Math.random() * BLEND_MODES.length)];
}

function selectRandomCharacter(category: Category): Character {
    const counts = ASSET_COUNTS[category];

    // Type guard: vérifier que counts est un objet avec character-a et character-b
    if (typeof counts === 'number') {
        return 'character-a'; // Fallback
    }

    const charCounts = counts as Record<Character, number>;
    const total = charCounts['character-a'] + charCounts['character-b'];
    const rand = Math.random() * total;
    return rand < charCounts['character-a'] ? 'character-a' : 'character-b';
}

export function generateInitialLayers(
    count: number,
    useVariedBlending: boolean = false,
    globalBlendMode: BlendMode = 'source-over'
): LayerElement[] {
    const layers: LayerElement[] = [];

    const getBlendMode = (): BlendMode => {
        return useVariedBlending ? randomBlendMode() : globalBlendMode;
    };

    // Pool of all possible positions
    const availablePositions: Array<{ category: Category; canBeMultiple: boolean }> = [
        { category: 'back', canBeMultiple: false },
        { category: 'center', canBeMultiple: true },
        { category: 'below', canBeMultiple: true },
        { category: 'left', canBeMultiple: true },
        { category: 'right', canBeMultiple: true },
    ];

    const selected: Array<{ category: Category; character: Character | null }> = [];
    const backgroundCandidates: string[] = [];

    const useComplexMode = count > 5;

    if (useComplexMode) {
        // Just randomly pick from all positions
        for (let i = 0; i < count; i++) {
            const pos = availablePositions[Math.floor(Math.random() * availablePositions.length)];
            const character = pos.category === 'back' ? null : selectRandomCharacter(pos.category);
            selected.push({ category: pos.category, character });
        }
    } else {
        // Shuffle positions and pick up to count
        const shuffled = [...availablePositions].sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(count, availablePositions.length); i++) {
            const pos = shuffled[i];
            const character = pos.category === 'back' ? null : selectRandomCharacter(pos.category);
            selected.push({ category: pos.category, character });
        }
    }

    let tempZIndex = 0;

    // Create layers
    selected.forEach(({ category, character }, idx) => {
        if (category === 'back') {
            const backIndex = randomInt(ASSET_COUNTS.back as number);
            const backBgUrl = getAssetUrl('back', backIndex, undefined, true);
            backgroundCandidates.push(backBgUrl);

            layers.push({
                id: `layer-${idx}`,
                category: 'back',
                imageUrl: getAssetUrl('back', backIndex),
                backgroundUrl: backBgUrl,
                blendMode: getBlendMode(),
                zIndex: tempZIndex++,
            });
        } else {
            const counts = ASSET_COUNTS[category];
            const charCounts = counts as Record<Character, number>;
            const maxIndex = charCounts[character as Character];
            const index = randomInt(maxIndex);
            const bgUrl = getAssetUrl(category, index, character as Character, true);
            backgroundCandidates.push(bgUrl);

            layers.push({
                id: `layer-${idx}`,
                category,
                character,
                imageUrl: getAssetUrl(category, index, character as Character),
                backgroundUrl: bgUrl,
                blendMode: getBlendMode(),
                zIndex: tempZIndex++,
            });
        }
    });

    // Randomize z-index properly - back always at 1, others randomized above it
    const backLayer = layers.find(l => l.category === 'back');
    const nonBackLayers = layers.filter(l => l.category !== 'back');

    // Shuffle non-back layers
    nonBackLayers.sort(() => Math.random() - 0.5);

    // Rebuild layers array with proper z-index
    layers.length = 0;

    if (backLayer) {
        backLayer.zIndex = 1; // ✅ Explicitly set back to z-index 1
        layers.push(backLayer);
    }

    // Assign z-index to non-back layers starting from 2
    nonBackLayers.forEach((layer, idx) => {
        layer.zIndex = (backLayer ? 2 : 1) + idx;
        layers.push(layer);
    });

    // Choose background
    let backgroundUrl: string;
    const useEmptyBackground = Math.random() < 0.3 || backgroundCandidates.length === 0;

    if (useEmptyBackground) {
        backgroundUrl = getAssetUrl('background', randomInt(ASSET_COUNTS.background as number));
    } else {
        backgroundUrl = backgroundCandidates[Math.floor(Math.random() * backgroundCandidates.length)];
    }

    // Add background
    layers.unshift({
        id: 'background',
        category: 'background',
        imageUrl: backgroundUrl,
        backgroundUrl: '',
        blendMode: 'source-over',
        zIndex: 0,
    });

    return layers;
}

export function updateLayerCutout(
    layer: LayerElement,
    category: Category,
    character: Character | null,
    specificIndex?: number
): LayerElement {
    if (category === 'back') {
        const index = specificIndex || randomInt(ASSET_COUNTS.back as number);
        return {
            ...layer,
            category: 'back',
            character: null,  // ✅ Changé de undefined à null
            imageUrl: getAssetUrl('back', index),
            backgroundUrl: getAssetUrl('back', index, undefined, true),
        };
    }

    const counts = ASSET_COUNTS[category];
    const charCounts = counts as Record<Character, number>;
    const maxIndex = charCounts[character as Character];
    const index = specificIndex || randomInt(maxIndex);

    return {
        ...layer,
        category,
        character,
        imageUrl: getAssetUrl(category, index, character as Character),
        backgroundUrl: getAssetUrl(category, index, character as Character, true),
    };
}

export function cycleLayerImage(
    layer: LayerElement,
    direction: 'prev' | 'next'
): LayerElement {
    // Extraire l'index actuel de l'URL
    const urlParts = layer.imageUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    const currentIndex = parseInt(filename.split('.')[0].split('_').pop() || '1');

    // Obtenir le max pour cette catégorie/personnage
    let maxIndex: number;
    if (layer.category === 'back') {
        maxIndex = ASSET_COUNTS.back as number;
    } else {
        const counts = ASSET_COUNTS[layer.category];
        const charCounts = counts as Record<Character, number>;
        maxIndex = charCounts[layer.character as Character];
    }

    // Calculer le nouvel index (loop)
    let newIndex: number;
    if (direction === 'next') {
        newIndex = currentIndex >= maxIndex ? 1 : currentIndex + 1;
    } else {
        newIndex = currentIndex <= 1 ? maxIndex : currentIndex - 1;
    }

    // Générer les nouvelles URLs
    if (layer.category === 'back') {
        return {
            ...layer,
            imageUrl: getAssetUrl('back', newIndex),
            backgroundUrl: getAssetUrl('back', newIndex, undefined, true),
        };
    }

    return {
        ...layer,
        imageUrl: getAssetUrl(layer.category, newIndex, layer.character as Character),
        backgroundUrl: getAssetUrl(layer.category, newIndex, layer.character as Character, true),
    };
}

export function updateLayerBlendMode(
    layer: LayerElement,
    blendMode: BlendMode
): LayerElement {
    return {
        ...layer,
        blendMode,
    };
}

export function updateBackground(
    currentLayers: LayerElement[],
    option: 'empty-1' | 'empty-2' | 'empty-3' | 'empty-4' | 'random-empty' | 'random-cutout'
): LayerElement[] {
    const layers = [...currentLayers];
    const backgroundLayer = layers[0];

    let backgroundUrl: string;

    if (option === 'random-cutout') {
        const cutouts = layers.slice(1).filter(l => l.backgroundUrl);
        if (cutouts.length > 0) {
            const randomCutout = cutouts[Math.floor(Math.random() * cutouts.length)];
            backgroundUrl = randomCutout.backgroundUrl;
        } else {
            backgroundUrl = getAssetUrl('background', randomInt(ASSET_COUNTS.background as number));
        }
    } else if (option === 'random-empty') {
        backgroundUrl = getAssetUrl('background', randomInt(ASSET_COUNTS.background as number));
    } else {
        const bgIndex = parseInt(option.split('-')[1]);
        backgroundUrl = getAssetUrl('background', bgIndex);
    }

    layers[0] = {
        ...backgroundLayer,
        imageUrl: backgroundUrl,
    };

    return layers;
}