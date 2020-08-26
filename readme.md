[![npm](https://img.shields.io/npm/v/capsize-sass.svg?style=for-the-badge)](https://www.npmjs.com/package/capsize-sass)

<br/>

# Capsize in SCSS

> Capsize makes the sizing and layout of text as predictable as every other element on the screen.
>
> Using font metadata, text can now be sized according to the height of its capital letters while trimming the space above capital letters and below the baseline.

<br/>

This is a port of [Capsize](https://github.com/seek-oss/capsize) to scss. It also removes the need for any runtime javascript. All credit goes to the original Capsize project for figuring out all the necessary calculations

<br/>
<br/>

## Installation

<br/>

```
$ npm i capsize-sass
```

<br/>

Add the following options to "sass-loader" in your webpack config

```js
// webpack.common.js
const { fontImporter, utils } = require("capsize-sass")

{
  loader: "sass-loader",
  options: {
    sassOptions: {
      importer: [ fontImporter({ prefix: "prefix-" }) ],
      functions: { ...utils },
    },
  },
}
```

## Usage

Each font <ins>_name_</ins> is given it's own mixin. Modifiers like "weight" and "italic"ness are added to the end of the mixin name (as shown below).

Each mixin takes all the options that [capsize takes](https://github.com/seek-oss/capsize/blob/master/packages/capsize/README.md#options)

```scss
/* If the weight of the font is 400 you dont need to specify it in the url or the mixin */
@import "../assets/fonts/font.ttf?name=body";
@import "../assets/fonts/font-italic.ttf?name=body&italic";
@import "../assets/fonts/font-bold.ttf?name=title&700";
@import "../assets/fonts/font-bold-italic.ttf?name=body&italic&700";

p {
  @include prefix-body($capHeight: 14, $lineGap: 6);
}

p.italic {
  @include prefix-body-italic($capHeight: 18, $lineGap: 12);
}

p.bold.italic {
  @include prefix-body-700-italic($capHeight: 16, $lineGap: 8);
}
```

<br/>

### License

MIT.
