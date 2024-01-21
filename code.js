"use strict";
const formatMixinName = (name) => name.replace(/\s+/g, '-').replace(/\//g, '-').toLowerCase();
const createMixinContent = (textStyle, unitPrefs, addSemiColon = true) => {
    // Convert px to the desired unit
    const convertToUnit = (value, unit) => {
        switch (unit) {
            case 'em':
            case 'rem':
                return (value / unitPrefs.baseSize).toFixed(2) + unit; // Convert to em/rem and add unit
            default:
                return value.toString() + unit; // Append unit (px or any other unit)
        }
    };
    let mixinContent = `font-family: '${textStyle.fontFamily}'${addSemiColon ? ';' : ''}\n  font-size: ${convertToUnit(textStyle.fontSize, unitPrefs.fontSizeUnit)};`;
    // Add more properties to mixinContent as needed
    mixinContent += `\n  font-weight: ${textStyle.fontWeight};`;
    mixinContent += `\n  line-height: ${convertToUnit(textStyle.lineHeight, unitPrefs.lineHeightUnit)};`;
    mixinContent += `\n  letter-spacing: ${convertToUnit(textStyle.letterSpacing, unitPrefs.letterSpacingUnit)};`;
    if (textStyle.textDecoration !== null) {
        mixinContent += `\n  text-decoration: ${textStyle.textDecoration};`;
    }
    if (textStyle.textTransform !== null) {
        mixinContent += `\n  text-transform: ${textStyle.textTransform};`;
    }
    return mixinContent;
};
const createStyleMixin = (textStyle, format, unitPrefs) => {
    const mixinName = formatMixinName(textStyle.name);
    const addSemiColon = format !== 'sass';
    const mixinContent = createMixinContent(textStyle, unitPrefs, addSemiColon);
    switch (format) {
        case 'scss':
            return `@mixin ${mixinName} {\n  ${mixinContent}\n}`;
        case 'sass':
            return `=${mixinName}\n  ${mixinContent}`;
        case 'css':
            return `.${mixinName} {\n  ${mixinContent}\n}`;
        default:
            return `.${mixinName} {\n  ${mixinContent}\n}`;
    }
};
const extractTextStyles = (format, unitPrefs) => {
    const textStylesMap = new Map();
    const collectTextStyles = (node) => {
        if (node.type === 'TEXT' && node.textStyleId) {
            const textStyleId = node.textStyleId;
            const textStyle = figma.getStyleById(textStyleId);
            if (textStyle && textStyle.name) {
                let lineHeight = 0;
                if (typeof node.lineHeight === 'number') {
                    lineHeight = node.lineHeight;
                }
                else if (typeof node.lineHeight === 'object' &&
                    'unit' in node.lineHeight) {
                    if (node.lineHeight.unit === 'PIXELS') {
                        lineHeight = node.lineHeight.value;
                    }
                }
                const textDecoration = (node.textDecoration === 'NONE' ? null : node.textDecoration);
                const textStyleObj = {
                    name: textStyle.name,
                    fontFamily: textStyle.fontName.family,
                    fontSize: textStyle.fontSize,
                    fontWeight: textStyle.fontName.style,
                    lineHeight: lineHeight,
                    letterSpacing: node.letterSpacing.value || 0,
                    textDecoration: textDecoration,
                    textTransform: node.textCase === 'UPPER'
                        ? 'uppercase'
                        : node.textCase === 'LOWER'
                            ? 'lowercase'
                            : node.textCase === 'TITLE'
                                ? 'capitalize'
                                : null,
                };
                const styleKey = formatMixinName(textStyleObj.name);
                textStylesMap.set(styleKey, textStyleObj);
            }
        }
        if ('children' in node) {
            node.children.forEach(collectTextStyles);
        }
    };
    figma.root.children.forEach(collectTextStyles);
    const formattedStyles = Array.from(textStylesMap.values()).map((style) => createStyleMixin(style, format, unitPrefs));
    figma.ui.postMessage({ type: 'styles', styles: formattedStyles });
};
figma.showUI(__html__, { width: 500, height: 600 });
figma.ui.onmessage = (msg) => {
    if (msg.type === 'extract-styles' && msg.format) {
        const { fontSizeUnit, lineHeightUnit, letterSpacingUnit, baseSize, } = msg.unitPreferences;
        const unitPrefs = {
            fontSizeUnit: fontSizeUnit || 'px',
            lineHeightUnit: lineHeightUnit || 'px',
            letterSpacingUnit: letterSpacingUnit || 'px',
            baseSize: baseSize || 16, // Default base size
        };
        extractTextStyles(msg.format, unitPrefs);
    }
    else if (msg.type === 'copied') {
        figma.notify('CSS Styles Copied to clipboard.');
    }
};
