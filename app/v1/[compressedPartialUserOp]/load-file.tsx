import { promises as fs } from 'fs';
import * as path from 'path';

// https://vercel.com/guides/loading-static-file-nextjs-api-route

async function getProjectRoot() {
  const metaURL = new URL(import.meta.url);
  let lastPath = metaURL.pathname;
  let rootPath = lastPath;

  while (true) {
    rootPath = path.join(lastPath, '..');
    if (rootPath === lastPath) {
      break;
    }

    const files = await fs.readdir(rootPath);
    if (files.find(file => file === 'jsconfig.json' || file === 'tsconfig.json')) {
      return rootPath;
    }

    lastPath = rootPath;
  }

  return rootPath;
}

export async function loadImageURIFromFile(pathFromProjectRoot: string, mimeType: string) {
  const data = await loadFile(pathFromProjectRoot);
  return `data:${mimeType};base64,${data.toString('base64')}`;
}

export async function loadFile(pathFromProjectRoot: string) {
  return await fs.readFile(path.join(await getProjectRoot(), pathFromProjectRoot));
}
