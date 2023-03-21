import { createRequire } from 'module'
import type { HtmlRendererOptions, IShikiTheme, IThemeRegistration } from 'shiki'
import type MarkdownIt from 'markdown-it'
import { createSyncFn } from 'synckit'
import type { DarkModeThemes, ElementProcessorType, IElementIntel, IExtraProcessor, IProcessorOutput, Options } from './types'
import { ExtraPosition } from './types'

export {
  ExtraPosition,
  IElementIntel,
  IExtraProcessor,
  IProcessorOutput,
  ElementProcessorType,
  DarkModeThemes,
  Options,
}

function getThemeName(theme: IThemeRegistration) {
  if (typeof theme === 'string')
    return theme
  return (theme as IShikiTheme).name
}

// capture highlight
const HIGHLIGHT_RE = /{([\d,-]+)}/
// capture the highlight color of the actual code block
const BACKGROUND_STYLE_RE = /^<pre[^>]*style="([^"]*)"[^>]*>/

// the classes used to distinguish between dark and light mode
const DARK_CLASS = 'shiki-dark'
const LIGHT_CLASS = 'shiki-light'

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
    extra: options.extra || [],
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

const processExtra = (extra: IExtraProcessor[], attrs: string) => {
  const result: IProcessorOutput[] = []
  if (extra === undefined)
    return result

  extra.forEach((processor) => {
    const matched = processor.attrRe ? processor.attrRe.exec(attrs) : null
    result.push({
      light: processor.light(matched),
      dark: processor.dark === null ? undefined : (processor.dark || processor.light)(matched),
      position: processor.position,
    })
  })

  return result
}

const getStyleContent = (tag: string, regex: RegExp) => {
  const match = regex.exec(tag)
  let style_content = ''
  if (match)
    style_content = match[1]
  return style_content
}

const appendStyle = (intel: IElementIntel | undefined, style: string) => {
  if (!intel)
    return

  if (!style.endsWith(';'))
    style += ';'

  if (intel.attrs.style)
    intel.attrs.style += `;${style}`
  else
    intel.attrs.style = style
}

const appendClass = (intel: IElementIntel | undefined, className: string) => {
  if (!intel)
    return

  if (intel.attrs.class)
    intel.attrs.class += ` ${className}`
  else
    intel.attrs.class = className
}

export const h: ElementProcessorType = (intel) => {
  if (!intel)
    return ''

  const headPartal = `<${intel.tag} ${Object.entries(intel.attrs).reduce((prev, now) => {
      return `${prev} ${now[0]}="${now[1]}"`
    }, '')}`

  if (intel.content)
    return `${headPartal}>${intel.content}</${intel.tag}>`
  else
    return `${headPartal} />`
}

const wrapFinalContainer = (
  light: string,
  dark: string | undefined = undefined,
  processedExtra: IProcessorOutput[] | undefined = undefined) => {
  let prependResult = ''
  let appendResult = ''

  dark = dark || ''
  processedExtra = processedExtra || []

  const light_style_content = getStyleContent(light, BACKGROUND_STYLE_RE)
  const dark_style_content = getStyleContent(dark, BACKGROUND_STYLE_RE)

  processedExtra.forEach((extra) => {
    appendClass(extra.light, LIGHT_CLASS)
    appendStyle(extra.light, light_style_content)
    appendClass(extra.dark, DARK_CLASS)
    appendStyle(extra.dark, dark_style_content)

    const lightExtra = h(extra.light)
    const darkExtra = h(extra.dark)

    if (extra.position === ExtraPosition.before) {
      prependResult += lightExtra
      prependResult += darkExtra
    }
    else {
      appendResult += lightExtra
      appendResult += darkExtra
    }
  })

  return `<div class="shiki-container">${prependResult}${dark}${light}${appendResult}</div>`
}

const MarkdownItShiki: MarkdownIt.PluginWithOptions<Options> = (markdownit, options = {}) => {
  const _highlighter = options.highlighter

  const {
    langs,
    themes,
    darkModeThemes,
    highlightLines,
    extra,
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

  markdownit.options.highlight = (code, lang, attrs) => {
    // parse highlight lines
    let lineOptions
    if (highlightLines) {
      const match = HIGHLIGHT_RE.exec(attrs)
      if (match)
        lineOptions = attrsToLines(match[1])
    }

    // parse extra
    const processedExtra = processExtra(extra, attrs)

    // synthesize final output
    if (darkModeThemes) {
      const dark = highlightCode(code, lang, darkModeThemes.dark, lineOptions)
        .replace('<pre class="shiki', `<pre class="shiki ${DARK_CLASS}`)
      const light = highlightCode(code, lang || 'text', darkModeThemes.light, lineOptions)
        .replace('<pre class="shiki', `<pre class="shiki ${LIGHT_CLASS}`)
      return wrapFinalContainer(light, dark, processedExtra)
    }
    else {
      return wrapFinalContainer(
        highlightCode(
          code,
          lang || 'text',
          undefined,
          lineOptions,
        ),
        undefined,
        processedExtra,
      )
    }
  }
}

export default MarkdownItShiki
