import type { LucideIcon } from 'lucide-react'
import {
  File,
  FileArchive,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  Folder,
  Globe,
  Lock,
} from 'lucide-react'
import { fileTypeOf, type DriveItem, type FileType } from '../drive/items'

const ICONS: Record<FileType, { icon: LucideIcon; color: string }> = {
  folder: { icon: Folder, color: '#4a4f57' },
  image: { icon: FileImage, color: '#c2410c' },
  pdf: { icon: FileText, color: '#b91c1c' },
  text: { icon: FileText, color: '#1d4ed8' },
  audio: { icon: FileAudio, color: '#a16207' },
  video: { icon: FileVideo, color: '#7e22ce' },
  archive: { icon: FileArchive, color: '#57534e' },
  other: { icon: File, color: '#64748b' },
}

interface FileIconProps {
  item: Pick<DriveItem, 'kind' | 'name' | 'contentType'>
  /** Area roots show a globe or a lock instead of a folder. */
  areaRoot?: 'public' | 'private'
  size?: number
}

export function FileIcon({ item, areaRoot, size = 20 }: FileIconProps) {
  if (areaRoot) {
    const AreaIcon = areaRoot === 'public' ? Globe : Lock
    return <AreaIcon size={size} color="#4a4f57" aria-hidden className="file-icon" />
  }

  const { icon: Icon, color } = ICONS[fileTypeOf(item)]
  return (
    <Icon
      size={size}
      color={color}
      fill={item.kind === 'folder' ? color : 'none'}
      fillOpacity={item.kind === 'folder' ? 1 : 0}
      aria-hidden
      className="file-icon"
    />
  )
}
