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
  folder: { icon: Folder, color: '#444746' },
  image: { icon: FileImage, color: '#d93025' },
  pdf: { icon: FileText, color: '#d93025' },
  text: { icon: FileText, color: '#1a73e8' },
  audio: { icon: FileAudio, color: '#e37400' },
  video: { icon: FileVideo, color: '#d93025' },
  archive: { icon: FileArchive, color: '#5f6368' },
  other: { icon: File, color: '#5f6368' },
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
    return <AreaIcon size={size} color="#444746" aria-hidden className="file-icon" />
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
