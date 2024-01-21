class FigmaTextStyleExtractor {
  constructor() {
    this.unitPrefs = {}

    
    figma.showUI(__html__, { width: 500, height: 550 })
    this.setupMessageListener()
  }

  setupMessageListener() {
    figma.ui.onmessage = (msg) => {
      switch (msg.type) {
        case "extract-styles":
          this.handleStyleExtraction(msg);
          break;
        case "copied":
          figma.notify("CSS Styles Copied to clipboard.");
          break
      }
    };
  }

  handleStyleExtraction(msg) {
    const { fontSizeUnit, lineHeightUnit, letterSpacingUnit, baseSize } =
      msg.unitPreferences;
    this.unitPrefs = {
      fontSizeUnit: fontSizeUnit || "px",
      lineHeightUnit: lineHeightUnit || "px",
      letterSpacingUnit: letterSpacingUnit || "px",
      baseSize: baseSize || 16,
    };
    this.extractTextStyles(msg.format);
  }

  extractTextStyles(format) {
    const textStylesMap = new Map();
    const collectTextStyles = (node) => {
      if (node.type === "TEXT" && node.textStyleId) {
        const textStyle = figma.getStyleById(node.textStyleId);
        if (textStyle && textStyle.name) {
          textStylesMap.set(
            this.formatMixinName(textStyle.name),
            this.createTextStyleObject(node, textStyle)
          );
        }
      }
      if ("children" in node) {
        node.children.forEach(collectTextStyles);
      }
    };

    figma.root.children.forEach(collectTextStyles);
    const formattedStyles = Array.from(textStylesMap.values()).map((style) =>
      this.createStyleMixin(style, format)
    );
    figma.ui.postMessage({ type: "styles", styles: formattedStyles });
  }

  createTextStyleObject(node, textStyle) {
    return {
      name: textStyle.name,
      fontFamily: textStyle.fontName.family,
      fontSize: textStyle.fontSize,
      fontWeight: textStyle.fontName.style,
      lineHeight: this.extractLineHeight(node),
      letterSpacing: node.letterSpacing.value || 0,
      textDecoration: this.extractTextDecoration(node),
      textTransform: this.extractTextTransform(node),
    };
  }

  formatMixinName(name) {
    return name.replace(/\s+/g, "-").replace(/\//g, "-").toLowerCase();
  }

  createStyleMixin(textStyle, format) {
    const mixinName = this.formatMixinName(textStyle.name);
    const hasSemicolon = format !== "sass";
    const selectorProperty = this.createSelectorProperties(textStyle, hasSemicolon)
    return this.formatMixin(mixinName, selectorProperty, format);
  }

  createSelectorProperties(textStyle, hasSemicolon) {
    const semicolonLogic = hasSemicolon ? ";" : ""
    let selectorProperty = `font-family: '${textStyle.fontFamily}'${semicolonLogic}`
    selectorProperty += `\n  font-size: ${this.convertToUnit(textStyle.fontSize, this.unitPrefs.fontSizeUnit)}${semicolonLogic}`
    selectorProperty += `\n  font-weight: ${textStyle.fontWeight.toLowerCase()}${semicolonLogic}`
    selectorProperty += `\n  line-height: ${this.convertToUnit(textStyle.lineHeight, this.unitPrefs.lineHeightUnit, true)}${semicolonLogic}`
    selectorProperty += `\n  letter-spacing: ${this.formatLetterSpacing(textStyle.letterSpacing)}${semicolonLogic}`
    if (textStyle.textDecoration) {
      selectorProperty += `\n  text-decoration: ${textStyle.textDecoration}${semicolonLogic}`
    }
    if (textStyle.textTransform) {
      selectorProperty += `\n  text-transform: ${textStyle.textTransform}${semicolonLogic}`
    }
    return selectorProperty
  }

  formatMixin(mixinName, selectorProperty, format) {
    switch (format) {
      case "scss":
        return `@mixin ${mixinName} {\n  ${selectorProperty}\n}`;
      case "sass":
        return `.${mixinName}\n  ${selectorProperty}`;
      case "css":
      default:
        return `.${mixinName} {\n  ${selectorProperty}\n}`;
    }
  }

  convertToUnit(value, unit, isLineHeight = false) {
    if (value === 0) return '0';

    let formattedValue;
    if (unit === 'em' || unit === 'rem') {
        formattedValue = (value / this.unitPrefs.baseSize).toFixed(isLineHeight ? 1 : 2);
    } else {
        formattedValue = value.toFixed(isLineHeight ? 1 : 0);
    }
    return formattedValue + unit;
}

  extractLineHeight(node) {
    if (typeof node.lineHeight === "number") return node.lineHeight
    if (
      typeof node.lineHeight === "object" &&
      node.lineHeight.unit === "PIXELS"
    ) {
      return node.lineHeight.value
    }
    return 0
  }

  extractTextDecoration(node) {
    return node.textDecoration === "NONE" ? null : node.textDecoration.toLowerCase()
  }

  extractTextTransform(node) {
    const textTransformMap = {
        'UPPER': 'uppercase',
        'LOWER': 'lowercase',
        'TITLE': 'capitalize'
    }
    return textTransformMap[node.textCase] || null
  }


  formatLetterSpacing(letterSpacing) {
    return letterSpacing === 0 ? "0" : this.convertToUnit(letterSpacing, this.unitPrefs.letterSpacingUnit)
  }

}

new FigmaTextStyleExtractor()