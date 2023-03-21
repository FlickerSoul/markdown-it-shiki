import type { IExtraProcessor } from './types'
import { ExtraPosition } from './types'

/**
*
* This extra processor will parse strings like `filename=""`
* , get the file name in between the quotes,
* and wrap them in a div with the class `shiki-filename`
*
* @param matched - the result of the regex match
* @returns the element to be inserted
*/
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
