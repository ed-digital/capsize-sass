let fs = require("fs").promises
const { fromFile, fromUrl } = require("./get-font-metrics")
const md5 = require("md5")

let font = /\.ttf/
let remoteUrl = /^https?:\/\//
let whitespace = /\\n */g

const SAVE_FOLDER = process.cwd() + "/.cache"
const SAVE_FILE = name => SAVE_FOLDER + `/${md5(name)}.json`

async function saveResult(url, result) {
  try {
    await fs.mkdir(SAVE_FOLDER)
  } catch (e) {}
  let data = JSON.stringify(result).replace(whitespace, "")
  return fs.writeFile(SAVE_FILE(url), data, "utf8")
}

async function loadResult(url) {
  try {
    let result = await fs.readFile(SAVE_FILE(url))
    return JSON.parse(result)
  } catch (e) {
    return false
  }
}

async function getFontInfo(url, prev) {
  // This generates a stylesheet from scratch for `@import "foo.ttf"`.
  if (!(font.test(url) && url.includes("?"))) return null

  let cached = await loadResult(url)

  if (cached) {
    return cached
  }

  let { name: family, italic, ...rest } = parseQuery(url)

  let href = url.replace(/\?.*/, "")

  let styleVars = ""
  let fontMetrics = {}

  let weight =
    Object.keys(rest).find(key => {
      if (!isNaN(Number(key))) {
        return true
      }
    }) || 400

  if (remoteUrl.test(href)) {
    fontMetrics = await fromUrl(href).catch(err => {
      console.log({ err })
    })
  } else {
    let to = require.resolve(href)
    fontMetrics = await fromFile(to).catch(err => {
      console.log({ err })
    })
  }

  for (let [k, v] of Object.entries(fontMetrics || {})) {
    styleVars += `${prop(k)}: ${v};\n`
  }

  function name() {
    return `${family}${weight != 400 ? `-${weight}` : ""}${italic ? "-italic" : ""}`
  }

  function prop(varName) {
    return `--metric-${name()}-${varName}`
  }

  function value(name) {
    return `var(${prop(name)})`
  }

  function leadingTrim(preCalc) {
    return `calc(${preCalc} - #{$specifiedLineHeightOffset} / #{$specifiedFontSize} + #{$preventCollapse} / #{$specifiedFontSize})`
  }

  let result = {
    contents: /*scss*/ `
      @function roundTo ($num, $precision: 2) {
        $factor: pow(10, $precision);
        @return round($num * $factor) / $factor;
      }
      @function getCapHeight ($fontSize, $capHeight, $unitsPerEm, $precision: 2) {
        @return roundTo(($fontSize * $capHeight) / $unitsPerEm, $precision);
      }
      $preventCollapse: 0.05;

      @font-face {
        src: url(${href});
        font-family: ${family};
        ${italic ? "font-style: italic;" : ""}
        font-weight: ${weight};
      }

      :root {
        ${styleVars}
      }


      @mixin font-${name()} ($fontSize: false, $lineGap: false, $lineHeight: false, $letterSpacing: false, $leading: false, $capHeight: false, $weight: 400, $italic: false) {
        font-family: ${family}, var(--${name()}-stack, var(--${family}-stack));
        ${italic ? "font-style: italic;" : ""}
        ${weight !== 400 ? `font-weight: ${weight};` : ""}
        @if $fontSize != false and $lineHeight != false {
          font-size: $fontSize;
          line-height: ($lineHeight / $fontSize);
        } @else {
          @if $leading != false and  $lineGap != false {
            @error 'Only a single line height style can be provided. Please pass either "lineGap" OR "leading".';
          }
        
          @if $capHeight != false and $fontSize != false {
            @error 'Please pass either "capHeight" OR "fontSize", not both.';
          }
  
          $specifiedFontSize: false;
          $specifiedCapHeight: false;
  
          @if $capHeight != false {
            $specifiedFontSize: calc(#{$capHeight} / ${value("capHeightScale")});
            $specifiedCapHeight: $capHeight;
          } @else if $fontSize != false {
            $specifiedFontSize: $fontSize;
            $specifiedCapHeight: calc(#{$specifiedFontSize} * ${value("capHeightScale")});
          } @else {
            @error 'Please pass either "capHeight" OR "fontSize".';
          }
  
          $specifiedLineHeight: 0;
  
          @if $lineGap != false {
            $specifiedLineHeight: calc(#{$specifiedCapHeight} + #{$lineGap});
          } @else if $leading != false {
            $specifiedLineHeight: $leading;
          }
          
          $lineHeightNormal: calc(${value("lineHeightScale")} * #{$specifiedFontSize});
          
          $specifiedLineHeightOffset: 0;
          @if $specifiedLineHeight {
            $specifiedLineHeightOffset: calc((#{$lineHeightNormal} - #{$specifiedLineHeight}) / 2);
          }
  
          font-size: calc(#{$specifiedFontSize} * 1px);
  
          @if $specifiedLineHeight and $specifiedLineHeight != 0 {
            line-height: calc(#{$specifiedLineHeight} * 1px);
          } @else {
            line-height: normal;
          }
          padding: #{$preventCollapse}px 0;
  
          &::before{
            content: "";
            --a: calc(${value("ascentScale")} - ${value("capHeightScale")} + ${value(
      "lineGapScale"
    )} / 2);
            margin-top: calc(${leadingTrim(`var(--a)`)} * -1em);
            display: block;
            height: 0;
          }
          &::after {
            content: "";
            margin-bottom: calc(${leadingTrim(
              `${value("descentScale")} + ${value("lineGapScale")} / 2`
            )} * -1em);
            display: block;
            height: 0;
          }
        }
      };
    `,
  }

  await saveResult(url, result)

  console.log(`Including font from ${url}`)

  return result
}

/*
 */

module.exports = {
  utils: {
    "pow($num, $pow)": function(num, pow) {
      return Math.pow(num, pow)
    },
  },
  fontImporter(url, prev, done) {
    getFontInfo(url, prev).then(done)
  },
}

function parseQuery(url) {
  let query = (url.split("?")[1] || "").split("#")[0]
  let result = {}

  if (!query) return result

  query.split("&").map(part => {
    if (part.includes("=")) {
      let [key, value] = part.split("=")
      result[key] = parse(value)
    } else {
      result[part] = true
    }
  })

  return result
}

function parse(v) {
  try {
    return JSON.parse(v)
  } catch (e) {
    return v
  }
}
