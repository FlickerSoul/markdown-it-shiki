import { createRequire } from 'module'
import type { HtmlRendererOptions, IShikiTheme, IThemeRegistration } from 'shiki'
import type MarkdownIt from 'markdown-it'
import { createSyncFn } from 'synckit'
import { APPENDING_POSITIONS, DarkModeThemes, ElementProcessorType, ExtraPosition, FLOATING_BOTTOM, FLOATING_LEFT, FLOATING_POSITIONS, FLOATING_RIGHT, FLOATING_TOP, IElementIntel, IExtraProcessor, IProcessorOutput, Options, PREPENDING_POSITIONS } from './types'

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
const FLOAT_CLASS = 'shiki-float'
const FLOAT_CLASS_HIDE = 'shiki-float-hide'
const FLOAT_POS_CLASS_MAPPING = {
  'shiki-float-top': FLOATING_TOP,
  'shiki-float-bottom': FLOATING_BOTTOM,
  'shiki-float-right': FLOATING_RIGHT,
  'shiki-float-left': FLOATING_LEFT,
}
const FLOAT_POS_CLASS_ITER = Object.entries(FLOAT_POS_CLASS_MAPPING)

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

const processExtra = (extra: IExtraProcessor[], attrs: string, lang: string, code: string) => {
  const result: IProcessorOutput[] = []
  if (extra === undefined)
    return result

  extra.forEach((processor) => {
    const matched = processor.attrRe ? processor.attrRe.exec(attrs) : null
    result.push({
      light: processor.light(matched, lang, code),
      dark: processor.dark === null ? null : (processor.dark || processor.light)(matched, lang, code),
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

const prependStyle = (intel: IElementIntel | undefined, style: string) => {
  if (!intel)
    return

  if (!style.endsWith(';'))
    style += ';'

  if (intel.attrs.style)
    intel.attrs.style = `${style};${intel.attrs.style}`
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

  const headPartal = `<${intel.tag}${Object.entries(intel.attrs).reduce((prev, now) => {
      return `${prev} ${now[0]}="${now[1]}"`
    }, '')}`

  if (intel.content) {
    if (typeof intel.content === 'string')
      return `${headPartal}>${intel.content}</${intel.tag}>`
    else if (Array.isArray(intel.content))
      return `${headPartal}>${intel.content.reduce((prev, now) => prev + h(now), '')}</${intel.tag}>`
    else
      return `${headPartal}>${h(intel.content)}</${intel.tag}>`
  }
  else { return `${headPartal} />` }
}

const wrapFinalContainer = (
  light: string,
  dark: string | undefined = undefined,
  processedExtra: IProcessorOutput[] | undefined = undefined) => {
  const extraContentsOnPosition: string[] = Object.keys(ExtraPosition).map(() => '')

  dark = dark || ''
  processedExtra = processedExtra || []

  const light_style_content = getStyleContent(light, BACKGROUND_STYLE_RE)
  const dark_style_content = getStyleContent(dark, BACKGROUND_STYLE_RE)

  processedExtra.forEach((extra) => {
    if (extra.dark !== null) {
      // if extra dark is not null,
      // then the element is not universal
      // add theme specific classes to both light and dark mode
      appendClass(extra.light, LIGHT_CLASS)
      prependStyle(extra.light, light_style_content)
      appendClass(extra.dark, DARK_CLASS)
      prependStyle(extra.dark, dark_style_content)
    }
    else {
      // if extra dark is null, then the element is universal
      // don't add theme specific classes, and set dark to undefined
      extra.dark = undefined
    }

    if (FLOATING_POSITIONS.includes(extra.position)) {
      appendClass(extra.light, FLOAT_CLASS)
      appendClass(extra.dark, FLOAT_CLASS)
    }

    for (const [posClass, posCheckList] of FLOAT_POS_CLASS_ITER) {
      if (posCheckList.includes(extra.position)) {
        appendClass(extra.light, posClass)
        appendClass(extra.dark, posClass)
      }
    }

    const lightExtra = h(extra.light)
    const darkExtra = h(extra.dark)

    extraContentsOnPosition[extra.position] += lightExtra
    extraContentsOnPosition[extra.position] += darkExtra
  })

  const before = PREPENDING_POSITIONS.map(i => extraContentsOnPosition[i]).reduce((prev, exc) => prev + exc, '')
  const after = APPENDING_POSITIONS.map(i => extraContentsOnPosition[i]).reduce((prev, exc) => prev + exc, '')

  return `<div class="shiki-container" style="position: relative;">${before}${light}${dark}${after}</div>`
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
    const processedExtra = processExtra(extra, attrs, lang, code)

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
