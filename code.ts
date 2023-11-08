type CustomTextStyle = {
  name: string
  fontFamily: string
  fontSize: number
  fontWeight: string
  lineHeight: number
  letterSpacing: number
  textDecoration: string | null
  textTransform: string | null
}

const formatMixinName = (name: string): string => 
  name.replace(/\s+/g, '-').replace(/\//g, '-').toLowerCase()

  const createMixinContent = (textStyle: CustomTextStyle, addSemiColon: boolean = true): string => {
    let mixinContent = `font-family: '${textStyle.fontFamily}'${addSemiColon ? ';' : ''}\n  font-size: ${textStyle.fontSize}px${addSemiColon ? ';' : ''}`
  
    if (textStyle.fontWeight.toLowerCase() !== 'regular') {
      mixinContent += `\n  font-weight: ${textStyle.fontWeight.toLowerCase()}${addSemiColon ? ';' : ''}`
    }
  
    if (textStyle.lineHeight !== undefined && textStyle.lineHeight !== 0) {
      mixinContent += `\n  line-height: ${textStyle.lineHeight.toFixed(1)}${addSemiColon ? ';' : ''}`
    }
  
    if (textStyle.letterSpacing !== undefined && textStyle.letterSpacing !== 0) {
      mixinContent += `\n  letter-spacing: ${textStyle.letterSpacing}px${addSemiColon ? ';' : ''}`
    }
  
    if (textStyle.textDecoration && textStyle.textDecoration.toLowerCase() !== 'none') {
      mixinContent += `\n  text-decoration: ${textStyle.textDecoration.toLowerCase()}${addSemiColon ? ';' : ''}`
    }
  
    if (textStyle.textTransform) {
      mixinContent += `\n  text-transform: ${textStyle.textTransform}${addSemiColon ? ';' : ''}`
    }
  
    return mixinContent
  }
  
  const createStyleMixin = (textStyle: CustomTextStyle, format: string): string => {
    const mixinName = formatMixinName(textStyle.name)
    const addSemiColon = format !== 'sass'
    const mixinContent = createMixinContent(textStyle, addSemiColon)
    switch (format) {
      case 'scss':
        return `@mixin ${mixinName} {\n  ${mixinContent}\n}`
      case 'sass':
        return `=${mixinName}\n  ${mixinContent.replace(/; /g, '\n  ').replace(/;/g, '')}`
      case 'css':
        return `.${mixinName} {\n  ${mixinContent}\n}`
      default:
        return `.${mixinName} {\n  ${mixinContent}\n}`
    }
  }

const extractTextStyles = (format: string) => {
  const selectedFrame = figma.currentPage.selection[0]
  if (!selectedFrame || selectedFrame.type !== 'FRAME') {
    figma.notify('No frame is selected. Please select a frame to extract text styles.')
    return
  }
  
  const textStyles = new Set<CustomTextStyle>()

  const collectTextStyles = (node: SceneNode) => {
    if (node.type === 'TEXT' && node.textStyleId && typeof node.textStyleId === 'string') {
      const figmaStyle = figma.getStyleById(node.textStyleId)
      if (!figmaStyle) return

      const textStyle: CustomTextStyle = {
        name: figmaStyle.name,
        fontFamily: 'fontName' in node && typeof node.fontName !== 'symbol' ? node.fontName.family : '',
        fontSize: typeof node.fontSize === 'number' ? node.fontSize : 0,
        fontWeight: 'fontName' in node && typeof node.fontName !== 'symbol' ? node.fontName.style : '',
        lineHeight: 'lineHeight' in node && typeof node.lineHeight !== 'symbol' && node.lineHeight.unit === 'PIXELS' ? node.lineHeight.value : 0,
        letterSpacing: 'letterSpacing' in node && typeof node.letterSpacing !== 'symbol' ? node.letterSpacing.value : 0,
        textDecoration: node.textDecoration && node.textDecoration !== 'NONE' && typeof node.textDecoration === 'string'
          ? node.textDecoration.toLowerCase()
          : null,
        textTransform: node.textCase === 'UPPER' ? 'uppercase' : 
                       node.textCase === 'LOWER' ? 'lowercase' : 
                       node.textCase === 'TITLE' ? 'capitalize' : null,
      }
      textStyles.add(textStyle)
    }
    if ('children' in node) {
      node.children.forEach(collectTextStyles)
    }
  }

  collectTextStyles(selectedFrame)
  const formattedStyles = Array.from(textStyles).map(style => createStyleMixin(style, format))
  figma.ui.postMessage({ type: 'styles', styles: formattedStyles })
}

figma.showUI(__html__, { width: 500, height: 600 })
figma.ui.onmessage = msg => {
  if (msg.type === 'extract-styles' && msg.format) {
    extractTextStyles(msg.format)
  } else if (msg.type === 'copied') {
    figma.notify('CSS Styles Copied to clipboard.')
  }
}