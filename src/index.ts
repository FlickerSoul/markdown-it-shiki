import { createRequire } from 'module'
import type { Highlighter, HtmlRendererOptions, ILanguageRegistration, IShikiTheme, IThemeRegistration } from 'shiki'
import type MarkdownIt from 'markdown-it'
import { createSyncFn } from 'synckit'

export interface DarkModeThemes {
  dark: IThemeRegistration
  light: IThemeRegistration
}

export interface Options {
  theme?: IThemeRegistration | DarkModeThemes
  langs?: ILanguageRegistration[]
  timeout?: number
  highlighter?: Highlighter
  highlightLines?: boolean
  parseFilename?: boolean
  filenameRe?: RegExp
}

function getThemeName(theme: IThemeRegistration) {
  if (typeof theme === 'string')
    return theme
  return (theme as IShikiTheme).name
}

const HIGHLIGHT_RE = /{([\d,-]+)}/
const FILENAME_RE = /filename="([\w.\-_]+)"/
const BACKGROUND_STYLE_RE = /^<pre[^>]*style="([^"]*)"[^>]*>/

export function resolveOptions(options: Options) {
  const themes: IThemeRegistration[] = []
  let darkModeThemes: DarkModeThemes | undefined

  if (!options.theme) {
    themes.push('nord')
  }
  else if (typeof options.theme === 'string') {
    themes.push(options.theme)
  }
  else {
    if ('dark' in options.theme || 'light' in options.theme) {
      darkModeThemes = options.theme as DarkModeThemes
      themes.push(darkModeThemes.dark)
      themes.push(darkModeThemes.light)
    }
    else {
      themes.push(options.theme)
    }
  }

  return {
    ...options,
    themes,
    darkModeThemes: darkModeThemes
      ? {
          dark: getThemeName(darkModeThemes.dark),
          light: getThemeName(darkModeThemes.light),
        }
      : undefined,
  }
}

const attrsToLines = (attrs: string): HtmlRendererOptions['lineOptions'] => {
  const result: number[] = []
  if (!attrs.trim())
    return []

  attrs
    .split(',')
    .map(v => v.split('-').map(v => parseInt(v, 10)))
    .forEach(([start, end]) => {
      if (start && end) {
        result.push(
          ...Array.from({ length: end - start + 1 }, (_, i) => start + i),
        )
      }
      else {
        result.push(start)
      }
    })
  return result.map(v => ({
    line: v,
    classes: ['highlighted'],
  }))
}

const MarkdownItShiki: MarkdownIt.PluginWithOptions<Options> = (markdownit, options = {}) => {
  const _highlighter = options.highlighter

  const {
    langs,
    themes,
    darkModeThemes,
    highlightLines,
    parseFilename,
    filenameRe,
  } = resolveOptions(options)

  let syncRun: any
  if (!_highlighter) {
    const require = createRequire(import.meta.url)
    syncRun = createSyncFn(require.resolve('./worker'))
    syncRun('getHighlighter', { langs, themes })
  }

  const highlightCode = (code: string, lang: string, theme?: string, lineOptions?: HtmlRendererOptions['lineOptions']): string => {
    if (_highlighter)
      return _highlighter.codeToHtml(code, { lang: lang || 'text', theme, lineOptions })

    return syncRun('codeToHtml', {
      code,
      theme,
      lang: lang || 'text',
      lineOptions,
    })
  }

  const getStyleContent = (tag: string, regex: RegExp) => {
    const match = regex.exec(tag)
    let style_content = ''
    if (match)
      style_content = match[1]
    return style_content
  }

  const wrapFinalContainer = (
    light: string,
    dark: string | undefined = undefined,
    filename = '') => {
    let filenameContainer = filename

    const light_style_content = getStyleContent(light, BACKGROUND_STYLE_RE)

    if (dark) {
      const dark_style_content = getStyleContent(dark, BACKGROUND_STYLE_RE)

      filenameContainer = `<div class="shiki-filename shiki-light" style="${light_style_content}">${filename}</div>`
      filenameContainer += `<div class="shiki-filename shiki-dark" style="${dark_style_content}">${filename}</div>`
    }
    else {
      filenameContainer = `<div class="shiki-filename" style="${light_style_content}">${filename}</div>`
    }

    return `<div class="shiki-container">${filenameContainer}${dark}${light}</div>`
  }

  markdownit.options.highlight = (code, lang, attrs) => {
    // parse highlight lines
    let lineOptions
    if (highlightLines) {
      const match = HIGHLIGHT_RE.exec(attrs)
      if (match)
        lineOptions = attrsToLines(match[1])
    }

    // parse filename
    let filename
    if (parseFilename) {
      const match = (filenameRe || FILENAME_RE).exec(attrs)
      if (match)
        filename = match[1]
    }

    // synthesize final output
    if (darkModeThemes) {
      const dark = highlightCode(code, lang, darkModeThemes.dark, lineOptions)
        .replace('<pre class="shiki', '<pre class="shiki shiki-dark')
      const light = highlightCode(code, lang || 'text', darkModeThemes.light, lineOptions)
        .replace('<pre class="shiki', '<pre class="shiki shiki-light')
      return wrapFinalContainer(light, dark, filename)
    }
    else {
      return wrapFinalContainer(
        highlightCode(
          code,
          lang || 'text',
          undefined,
          lineOptions,
        ),
        filename = filename,
      )
    }
  }
}

export default MarkdownItShiki
