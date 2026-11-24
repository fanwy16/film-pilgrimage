import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const projectRoot = process.cwd();
const rawRoot = path.join(projectRoot, 'public', 'raw');
const reportPath = path.join(projectRoot, 'scripts', 'image-report.json');
const imageExtensions = new Set(['.jpg', '.png']);
const layoutTolerance = 0.1;

async function findImages(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT' && directory === rawRoot) return [];
    throw error;
  }

  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findImages(fullPath)));
    } else if (entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

const files = (await findImages(rawRoot)).sort((a, b) => a.localeCompare(b));
const images = await Promise.all(files.map(async (filePath) => {
  const metadata = await sharp(filePath).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`Unable to read image dimensions: ${filePath}`);
  }

  const topHeight = Math.ceil(metadata.height / 2);
  const bottomHeight = Math.floor(metadata.height / 2);
  return {
    path: path.relative(projectRoot, filePath).split(path.sep).join('/'),
    folder: path.dirname(path.relative(rawRoot, filePath)).split(path.sep).join('/'),
    width: metadata.width,
    height: metadata.height,
    aspectRatio: metadata.width / metadata.height,
    topHalf: { width: metadata.width, height: topHeight },
    bottomHalf: { width: metadata.width, height: bottomHeight },
  };
}));

const byFolder = new Map();
for (const image of images) {
  const siblings = byFolder.get(image.folder) ?? [];
  siblings.push(image);
  byFolder.set(image.folder, siblings);
}

for (const image of images) {
  const siblingRatios = byFolder.get(image.folder).map(({ aspectRatio }) => aspectRatio);
  const typicalRatio = median(siblingRatios);
  image.flags = [];
  if (image.width < 1080) image.flags.push('⚠️ LOW-RES');
  if (siblingRatios.length > 1 && Math.abs(image.aspectRatio - typicalRatio) / typicalRatio > layoutTolerance) {
    image.flags.push('⚠️ LAYOUT');
  }
  delete image.folder;
}

await writeFile(reportPath, `${JSON.stringify(images, null, 2)}\n`);

const rows = images.map((image) => ({
  'Relative path': image.path,
  'Width × height': `${image.width} × ${image.height}`,
  'Aspect ratio': image.aspectRatio.toFixed(4),
  'Top half': `${image.topHalf.width} × ${image.topHalf.height}`,
  'Bottom half': `${image.bottomHalf.width} × ${image.bottomHalf.height}`,
  Flags: image.flags.join(' '),
}));

if (rows.length === 0) {
  console.log(`No .jpg, .JPG, or .png images found under ${path.relative(projectRoot, rawRoot)}.`);
} else {
  console.table(rows);
}
console.log(`Wrote ${path.relative(projectRoot, reportPath)} (${images.length} images).`);
