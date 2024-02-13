import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ImageResponse } from 'next/og';
import { NextRequest } from "next/server";
import htmlHandler from "../h/page";
import { RouteParams } from '../types';


export async function GET(req: NextRequest, { params }: { params: RouteParams }) {
  const element = await htmlHandler({ params });
  const robotoMono400 = await fs.promises.readFile(path.join(
    fileURLToPath(import.meta.url),
    '../../../../../node_modules/@fontsource/roboto-mono/files/roboto-mono-latin-400-normal.woff'
  ));
  return new ImageResponse(element, {
    width: 1080,
    height: 566,
    emoji: 'noto',
    fonts: [{ name: 'Roboto_Mono_400', data: await robotoMono400, weight: 400 }],
  });
}
