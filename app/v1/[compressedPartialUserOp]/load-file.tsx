import { promises as fs } from 'fs';
import * as path from 'path';

// https://vercel.com/guides/loading-static-file-nextjs-api-route

async function getProjectRoot() {
  const metaURL = new URL(import.meta.url);
  const hierarchy = metaURL.pathname.split('/');
  const appIndex = hierarchy.findIndex(dir => dir === 'app');
  const rootHierarchy = hierarchy.slice(0, appIndex);
  return path.join('/', ...rootHierarchy);
}

export async function loadImageURIFromFile(pathFromProjectRoot: string, mimeType: string) {
  const data = await loadFile(pathFromProjectRoot);
  return `data:${mimeType};base64,${data.toString('base64')}`;
}

export async function loadFile(pathFromProjectRoot: string) {
  return await fs.readFile(path.join(await getProjectRoot(), pathFromProjectRoot));
}
