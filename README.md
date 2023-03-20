# markdown-it-shiki

[Markdown It](https://markdown-it.github.io/) plugin for [Shiki](https://github.com/shikijs/shiki)

## Install 

```bash
npm i -D markdown-it-shiki
```

## Usage

```ts
import MarkdownIt from 'markdown-it'
import Shiki from 'markdown-it-shiki'

const md = MarkdownIt()

md.use(Shiki, {
  theme: 'nord'
})
```

### Dark mode

```js
md.use(Shiki, {
  theme: {
    dark: 'min-dark',
    light: 'min-light'
  }
})
```

Add then these to your CSS


```css
/* Query based dark mode */

@media (prefers-color-scheme: dark) {
  .shiki-light {
    display: none;
  }
}

@media (prefers-color-scheme: light), (prefers-color-scheme: no-preference) {
  .shiki-dark {
    display: none;
  }
}

```

```css
/* Class based dark mode */

html.dark .shiki-light {
  display: none;
}

html:not(.dark) .shiki-dark {
  display: none;
}
```

### Highlight lines

```js
md.use(Shiki, {
  highlightLines: true
})
```

Add these to your CSS

```css
code[v-pre] { 
  display: flex;
  flex-direction: column;
}

.shiki .highlighted {
  background: #7f7f7f20;
  display: block;
  margin: 0 -1rem;
  padding: 0 1rem;
}
```

Then you can highlight lines in code block.

~~~
```js {1-2}
const md = new MarkdownIt()
md.use(Shiki)

const res = md.render(/** ... */)
console.log(res)
```
~~~

### Generic Prepending and Appending Extra

A code block will be parsed into 

```html
<div class="shiki-container">
  <div class="shiki">
    <code>
    ...
    </code>
  </div>
</div>
```

You can now prepend or append any html tags to the code block by specifying the extra processors in the `extra` option field. For example, the following code

```js
import { FilenameProcessor } from '@uniob/markdown-it-shiki/utils'
md.use(Shiki, {
  extra: [FilenameProcessor]
})
```

will add a filename div to the beginning of the code block if your code block is written in the following format: 

~~~
```js {1-2} filename="index.js"
const md = new MarkdownIt()
md.use(Shiki)
```
~~~

An `extra` processor has the following type:

```typescript
interface ExtraProcessor {
  light: Processor
  dark?: Processor | null
  position: ExtraPosition
  attrRe?: RegExp
}
```

where `attrRe` is the regex expression that matches the attributes passed into the code block, which is the string right after the first triple tilda. 

~~~
```html {1-2} filename="hi.html"
```
~~~

`light` and `dark` are function that takes in a `RegExpExecArray` or `null` and returns a `string`. `null` is pass to the processor only when the `attrRe` did not match anything or the `attrRe` is undefined. If `dark` is undefined, then the `light` will be reused for the dark theme. If `dark` is `null`, then the processor will not be applied to the dark theme. The `position` field specifies where the processor should be applied. 


