import * as fs from 'fs';

type DetectedCategory =
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/webp'
  | 'application/pdf'
  | 'application/zip'
  | 'application/ole2'
  | 'video/webm'
  | 'video/mp4'
  | null;

export function detectMimeCategory(filePath: string): DetectedCategory {
  const buf = Buffer.alloc(12);
  const fd = fs.openSync(filePath, 'r');
  try {
    fs.readSync(fd, buf, 0, 12, 0);
  } finally {
    fs.closeSync(fd);
  }

  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return 'image/gif';
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return 'image/webp';
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return 'application/pdf';
  if (buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07)) return 'application/zip';
  if (buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) return 'application/ole2';
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return 'video/webm';
  // MP4/MOV: 4-byte big-endian size + 'ftyp' at offset 4
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) return 'video/mp4';

  return null;
}

const EXT_TO_CATEGORY: Record<string, DetectedCategory> = {
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.pdf':  'application/pdf',
  '.docx': 'application/zip',
  '.xlsx': 'application/zip',
  '.pptx': 'application/zip',
  '.doc':  'application/ole2',
  '.xls':  'application/ole2',
  '.ppt':  'application/ole2',
  '.webm': 'video/webm',
  '.mp4':  'video/mp4',
  '.mov':  'video/mp4',
};

export function extensionMatchesMagicBytes(ext: string, filePath: string): boolean {
  const expected = EXT_TO_CATEGORY[ext];
  if (!expected) return false;
  const actual = detectMimeCategory(filePath);
  return actual === expected;
}
