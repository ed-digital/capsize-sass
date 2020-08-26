require("cross-fetch/polyfill")

const blobToBuffer = require("blob-to-buffer")
const fontkit = require("fontkit")

const unpackMetricsFromFont = font => {
  const {
    capHeight,
    ascent,
    descent,
    lineGap,
    unitsPerEm,
    familyName,
    fullName,
    postscriptName,
    subfamilyName,
    xHeight,
  } = font

  let absoluteDescent = Math.abs(descent)
  let contentArea = ascent + lineGap + absoluteDescent

  return {
    capHeight,
    ascent,
    descent,
    lineGap,
    unitsPerEm,
    familyName,
    fullName,
    postscriptName,
    subfamilyName,
    xHeight,
    absoluteDescent,
    capHeightScale: capHeight / unitsPerEm,
    descentScale: absoluteDescent / unitsPerEm,
    ascentScale: ascent / unitsPerEm,
    lineGapScale: lineGap / unitsPerEm,
    lineHeightScale: contentArea / unitsPerEm,
    contentArea,
  }
}

const fromFile = path =>
  new Promise((resolve, reject) =>
    fontkit.open(path, "", (err, font) => {
      if (err) {
        return reject(err)
      }
      resolve(unpackMetricsFromFont(font))
    })
  )

const fromBlob = async blob =>
  new Promise((resolve, reject) => {
    blobToBuffer(blob, (err, buffer) => {
      if (err) {
        return reject(err)
      }

      try {
        resolve(unpackMetricsFromFont(fontkit.create(buffer)))
      } catch (e) {
        reject(e)
      }
    })
  })

const fromUrl = async url => {
  const response = await fetch(url)

  if (typeof window === "undefined") {
    const data = await response.arrayBuffer()

    return unpackMetricsFromFont(fontkit.create(Buffer.from(data)))
  }

  const blob = await response.blob()

  return fromBlob(blob)
}

const filterInternalMetrics = ({ capHeight, ascent, descent, lineGap, unitsPerEm }) => ({
  capHeight,
  ascent,
  descent,
  lineGap,
  unitsPerEm,
})

module.exports = {
  fromFile,
  fromBlob,
  fromUrl,
  filterInternalMetrics,
}
