import type { IExtraProcessor } from '.'
import { ExtraPosition } from '.'

export const FilenameProcessor: IExtraProcessor = {
  attrRe: /filename="([\w.\-_]+)"/,
  position: ExtraPosition.before,
  light: (matched) => {
    if (matched === null)
      return undefined

    return {
      tag: 'div',
      attrs: {
        class: 'shiki-filename',
      },
      content: matched[1],
    }
  },
}
