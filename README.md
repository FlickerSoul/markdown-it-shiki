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

### Display File Names

You can assign a file name to each of the code blocks. This will be displayed at the beginning of code block. 

```js
md.use(Shiki, {
  parseFilename: true
  // you can pass in a regex to parse the filename 
  // like the following 
  // filenameRE: /regex/
  // by default, the regex is /filename="([\w.\-_]+)"/
})
```

Then in the markdown, you can add a `filename` attribute to the code block.

~~~
```js {1-2} filename="index.js"
const md = new MarkdownIt()
md.use(Shiki)
```
~~~

A `<div class="shiki-filename">` containing the filename will be added to the beginning of the code. 

You can add the following CSS to style the filename.

```css
.shiki-filename {
  font-size: 0.8rem;
  color: #7f7f7f;
  padding: 1em 1.5em;
}
```

