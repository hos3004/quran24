export type QuranContentBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
  imageWidth: number;
  imageHeight: number;
};

const cache = new Map<string, QuranContentBounds>();

export async function detectQuranContentBounds(imagePath: string): Promise<QuranContentBounds> {
  const cached = cache.get(imagePath);
  if (cached) return cached;

  const bounds = await scanImageAlphaBounds(imagePath);
  cache.set(imagePath, bounds);
  return bounds;
}

async function scanImageAlphaBounds(imagePath: string): Promise<QuranContentBounds> {
  const image = await loadImage(imagePath);
  const imageWidth = image.naturalWidth;
  const imageHeight = image.naturalHeight;

  if (!imageWidth || !imageHeight) {
    return { x: 0, y: 0, width: imageWidth, height: imageHeight, imageWidth, imageHeight };
  }

  const sampleScale = Math.min(1, 512 / imageWidth);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(imageWidth * sampleScale));
  canvas.height = Math.max(1, Math.floor(imageHeight * sampleScale));

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    return { x: 0, y: 0, width: imageWidth, height: imageHeight, imageWidth, imageHeight };
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);

  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const alpha = data[(y * canvas.width + x) * 4 + 3];
      if (alpha <= 30) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) {
    return { x: 0, y: 0, width: imageWidth, height: imageHeight, imageWidth, imageHeight };
  }

  return {
    x: Math.floor(minX / sampleScale),
    y: Math.floor(minY / sampleScale),
    width: Math.ceil((maxX - minX + 1) / sampleScale),
    height: Math.ceil((maxY - minY + 1) / sampleScale),
    imageWidth,
    imageHeight
  };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load Quran page image: ${src}`));
    image.src = src;
  });
}
