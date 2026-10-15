import { areaOfPath, isFolderPath, nameOf, type Area, type StoragePath } from './paths'

/** A file or folder as the file list shows it. */
export interface DriveItem {
  kind: 'file' | 'folder'
  path: StoragePath
  name: string
  area: Area
  /** File metadata from the homeserver; folders have none. */
  sizeBytes?: number
  contentType?: string
  modifiedMs?: number
}

/** A file or folder known only by its path, before its metadata was read. */
export function itemFromPath(path: StoragePath): DriveItem {
  return {
    kind: isFolderPath(path) ? 'folder' : 'file',
    path,
    name: nameOf(path),
    area: areaOfPath(path),
  }
}

/** Broad file categories for icons, filters and previews. */
export type FileType = 'folder' | 'image' | 'pdf' | 'text' | 'audio' | 'video' | 'archive' | 'other'

const EXTENSION_TYPES: Record<string, FileType> = {
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  avif: 'image',
  bmp: 'image',
  ico: 'image',
  pdf: 'pdf',
  txt: 'text',
  md: 'text',
  markdown: 'text',
  json: 'text',
  csv: 'text',
  tsv: 'text',
  xml: 'text',
  yml: 'text',
  yaml: 'text',
  toml: 'text',
  log: 'text',
  ini: 'text',
  js: 'text',
  mjs: 'text',
  ts: 'text',
  tsx: 'text',
  jsx: 'text',
  css: 'text',
  html: 'text',
  rs: 'text',
  py: 'text',
  go: 'text',
  sh: 'text',
  c: 'text',
  h: 'text',
  java: 'text',
  kt: 'text',
  swift: 'text',
  rb: 'text',
  php: 'text',
  sql: 'text',
  mp3: 'audio',
  wav: 'audio',
  ogg: 'audio',
  oga: 'audio',
  m4a: 'audio',
  flac: 'audio',
  aac: 'audio',
  opus: 'audio',
  mp4: 'video',
  webm: 'video',
  mov: 'video',
  m4v: 'video',
  ogv: 'video',
  mkv: 'video',
  zip: 'archive',
  tar: 'archive',
  gz: 'archive',
  tgz: 'archive',
  '7z': 'archive',
  rar: 'archive',
  bz2: 'archive',
  xz: 'archive',
}

/** Classifies an item by its media type, falling back to the file extension. */
export function fileTypeOf(item: Pick<DriveItem, 'kind' | 'name' | 'contentType'>): FileType {
  if (item.kind === 'folder') return 'folder'

  const fromContentType = fileTypeFromContentType(item.contentType)
  if (fromContentType) return fromContentType

  const extension = item.name.includes('.') ? item.name.split('.').pop()!.toLowerCase() : ''
  return EXTENSION_TYPES[extension] ?? 'other'
}

function fileTypeFromContentType(contentType: string | undefined): FileType | undefined {
  if (!contentType || contentType === 'application/octet-stream') return undefined
  const mediaType = contentType.split(';')[0].trim().toLowerCase()

  if (mediaType.startsWith('image/')) return 'image'
  if (mediaType.startsWith('audio/')) return 'audio'
  if (mediaType.startsWith('video/')) return 'video'
  if (mediaType === 'application/pdf') return 'pdf'
  if (mediaType.startsWith('text/') || /json|xml|javascript|yaml|toml/.test(mediaType))
    return 'text'
  if (/zip|tar|gzip|x-7z|rar|bzip|xz/.test(mediaType)) return 'archive'
  return undefined
}

/** Human-readable name of a file type, for the details pane. */
export const FILE_TYPE_LABELS: Record<FileType, string> = {
  folder: 'Folder',
  image: 'Image',
  pdf: 'PDF',
  text: 'Text',
  audio: 'Audio',
  video: 'Video',
  archive: 'Archive',
  other: 'File',
}
