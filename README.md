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

You can add extra html tags at the beginning or end of the code block by specifying the `extra` option field, illustrated in the following example:

```js

```html
<div class="shiki-container">
  <!-- extra html tags prepended -->
  <pre class="shiki">
    <code>
    ...
    </code>
  </pre>
  <!-- extra html tags appended -->
</div>
```

Extra tag processors are specified the extra processors in the `extra` option field. For example, 

```js
import { FilenameProcessor } from '@uniob/markdown-it-shiki/utils'
md.use(Shiki, {
  extra: [FilenameProcessor]
})
```

If the code block is written in the following format: 

~~~
```js {1-2} filename="index.js"
const md = new MarkdownIt()
md.use(Shiki)
```
~~~

the result of adding `FilenameProcessor` will be 

```html
<div class="shiki-container">
  <div class="shiki-filename">index.js</div>
  <pre class="shiki">
    <code>
    ...
    </code>
  </pre>
  <!-- extra html tags appended -->
</div>
```

The actual code block content might have gap between the prepended and appended extra tags. This is probably due to user agent default styling. You can add the following css to fix this issue:

```css
.shiki-container pre.shiki {
  margin: 0;
}
```

There are four positions you can append, 'before', 'after', 'f_top_right', 'f_bottom_right', 'f_top_left', 'f_bottom_left'. The 'before' and 'after' positions will direct the extra tag to be prepended or appended to the actual code block. The positions with names starting with 'f_' will direct the extra tag to floated on the according corners. You need to add the following CSS to your stylesheet. Every class except `shiki-float-hide` is added automatically. 

```css
div.shiki-container {
  --shiki-float-visible: none;
  --float-right-dist: 10px;
  --float-top-dist: 10px;
  --float-bottom-dist: 10px;
  --float-left-dist: 10px;
}

div.shiki-container:hover {
  --shiki-float-visible: div;
}

.shiki-float {
  position: absolute;
}

.shiki-float-right {
  right: var(--float-right-dist);
}

.shiki-float-top {
  top: var(--float-top-dist);
}

.shiki-float-bottom {
  bottom: var(--float-bottom-dist);
}

.shiki-float-left {
  left: var(--float-left-dist);
}

.shiki-float-hide {
  display: var(--shiki-float-visible)
}
```



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

`light` and `dark` are function that takes in a `RegExpExecArray` or `null` and returns a `ElementIntel` object which will be turned into a html tag string later in the processing pipeline. `null` is pass to the processor only when the `attrRe` did not match anything or the `attrRe` is undefined. An `ElementIntel` object has the following type 

```typescript
interface IElementIntel {
  tag: string
  attrs: Record<string, string>
  content?: string | IElementIntel
}
```

If `dark` is undefined, then the `light` will be reused for the dark theme. If `dark` is `null`, then the processor will not be applied to the dark theme. The `position` field specifies where the processor should be applied. `ExtraPosition.before` and `ExtraPosition.after` are the only two options available for now, which will prepend and append, respectively, the extra html tags with respect to the actual code block. 

