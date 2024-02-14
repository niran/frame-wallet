import { promises as fs } from 'fs';
import * as path from 'path';

// https://vercel.com/guides/loading-static-file-nextjs-api-route

function getProjectRoot() {
  return process.cwd();
}

export async function loadImageURIFromFile(pathFromProjectRoot: string, mimeType: string) {
  const data = await loadFile(pathFromProjectRoot);
  return `data:${mimeType};base64,${data.toString('base64')}`;
}

export async function loadFile(pathFromProjectRoot: string) {
  return await fs.readFile(path.join(getProjectRoot(), pathFromProjectRoot));
}
