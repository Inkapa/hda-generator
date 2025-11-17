export const CDN_BASE = 'https://cdn.byronic.art/HDA_CUTOUT';

export const ASSET_COUNTS = {
    background: 4,
    back: 15,
    center: {
        'character-a': 5,
        'character-b': 2,
    },
    below: {
        'character-a': 3,
        'character-b': 2,
    },
    left: {
        'character-a': 1,
        'character-b': 3,
    },
    right: {
        'character-a': 6,
        'character-b': 9,
    },
} as const;

export type Category = 'back' | 'center' | 'below' | 'left' | 'right';
export type Character = 'character-a' | 'character-b';
export type BlendMode = 'source-over' | 'darken' | 'lighten' | 'luminosity';

export interface LayerElement {
    id: string;
category: Category | 'background';
character?: Character | null;
imageUrl: string;
backgroundUrl: string;
blendMode: BlendMode;
zIndex: number;
}

export function getAssetUrl(
    category: Category | 'background',
index: number,
character?: Character,
isBackground = false
): string {
    const paddedIndex = index.toString().padStart(2, '0');
const suffix = isBackground ? '_bg.webp' : '.webp';

if (category === 'background') {
return `${CDN_BASE}/background/empty_${paddedIndex}.webp`;
}

if (category === 'back') {
return `${CDN_BASE}/back/${paddedIndex}${suffix}`;
}

return `${CDN_BASE}/${category}/${character}/${paddedIndex}${suffix}`;
}