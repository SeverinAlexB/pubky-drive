import { describe, expect, test } from 'vitest'
import { nameProblem, splitExtension, uniqueName } from './names'

describe('nameProblem', () => {
  test.each(['report.pdf', 'My Photos', 'ü-ñ 2026', '.hidden', 'a:b,c'])('accepts %s', (name) => {
    expect(nameProblem(name)).toBeUndefined()
  })

  test.each([
    ['', 'Enter a name.'],
    ['   ', 'Enter a name.'],
    ['a/b', 'Names can’t contain / or \\.'],
    ['a\\b', 'Names can’t contain / or \\.'],
    ['..', 'Names can’t be . or ..'],
    ['.keep', '.keep is reserved.'],
    ['trailing ', 'Names can’t end with a space.'],
    ['tab\there', 'Names can’t contain control characters.'],
  ])('rejects %j', (name, problem) => {
    expect(nameProblem(name)).toBe(problem)
  })

  test('rejects names over 255 bytes, counting UTF-8 bytes', () => {
    expect(nameProblem('ü'.repeat(127))).toBeUndefined()
    expect(nameProblem('ü'.repeat(128))).toBe('This name is too long.')
  })
})

describe('splitExtension', () => {
  test('splits at the last dot of a file name', () => {
    expect(splitExtension('photo.final.jpg')).toEqual({ base: 'photo.final', extension: '.jpg' })
  })

  test('treats dotfiles and folders as having no extension', () => {
    expect(splitExtension('.env')).toEqual({ base: '.env', extension: '' })
    expect(splitExtension('v1.2', 'folder')).toEqual({ base: 'v1.2', extension: '' })
  })
})

describe('uniqueName', () => {
  test('keeps a free name', () => {
    expect(uniqueName('a.txt', new Set(['b.txt']), 'file')).toBe('a.txt')
  })

  test('numbers a taken file name before its extension', () => {
    const taken = new Set(['a.txt', 'a (1).txt'])
    expect(uniqueName('a.txt', taken, 'file')).toBe('a (2).txt')
  })

  test('numbers a taken folder name at the end', () => {
    expect(uniqueName('v1.2', new Set(['v1.2']), 'folder')).toBe('v1.2 (1)')
  })
})
