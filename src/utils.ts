import type { IExtraProcessor } from '.'
import { ExtraPosition } from '.'

export const FilenameProcessor: IExtraProcessor = {
  attrRe: /filename="([\w.\-_]+)"/,
  position: ExtraPosition.before,
  light: (matched) => {
    if (matched === null)
      return undefined

    return `<div class="shiki-filename">${matched[1]}</div>`
  },
}
