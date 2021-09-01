import { parse } from 'node-html-parser';
import { Style } from '@react-pdf/types';
import { Tag } from './tags';
import css, { Declaration, Rule } from 'css';
import supportedStyles from './supportedStyles';
import { HtmlStyles } from './styles';
import { CssToPDFTranslate } from './css/translate';
const camelize = require('camelize');

export type HtmlContent = (HtmlElement | string)[];

export type HtmlElement = HTMLElement & {
  tag: Tag | 'string';
  parentNode: HtmlElement;
  pdfStyle: Style[];
  content: HtmlContent;
  indexOfType: number;
  querySelectorAll: (selector: string) => HtmlElement[];
  querySelector: (selector: string) => HtmlElement;
};

export const convertRule = (rule: Rule, source: string = 'style'): Style => {
  const declarations: Declaration[] =
    rule.declarations?.filter(
      (declaration) => declaration.type === 'declaration'
    ) || [];

  return declarations
    .map((entry) => ({
      ...entry,
      property: camelize(entry.property as string),
    }))
    .reduce((style, { property, value }) => {
      if (property && value) {
        if (!property || !supportedStyles.includes(property)) {
          if (
            (property === 'background' && /^#?[a-zA-Z0-9]+$/.test(value)) ||
            /^rgba?\([0-9, ]+\)$/i.test(value) ||
            /^hsla?\([0-9.%, ]+\)$/i.test(value)
          ) {
            property = 'backgroundColor';
          } else {
            console.warn(`${source}: Found unsupported style "${property}"`, {
              property,
              value,
            });
          }
        }

        style[property as keyof Style] = value;
      }
      return style;
    }, {} as Style);
};

export const convertStylesheet = (stylesheet: string): HtmlStyles => {
  const response = {} as HtmlStyles;
  try {
    const parsed = css.parse(stylesheet);
    const rules: Rule[] =
      parsed.stylesheet?.rules?.filter((rule) => rule.type === 'rule') || [];
    rules.forEach((rule) => {
      const style = convertRule(rule);
      rule.selectors?.forEach((selector) => {
        response[selector] = style;
      });
    });
  } catch (e) {
    console.error(`Error parsing stylesheet: "${stylesheet}"`, e);
  }
  return response;
};

export const convertElementStyle = (
  styleAttr: string,
  tag: string
): Style | {} => {
  try {
    const parsed = css.parse(`${tag} { ${styleAttr} }`, {
      source: tag,
    });
    const rules: Rule[] =
      parsed.stylesheet?.rules?.filter((rule) => rule.type === 'rule') || [];
    const firstRule = rules.shift();
    return firstRule ? convertRule(firstRule, tag) : {};
  } catch (e) {
    console.error(
      `Error parsing style attribute "${styleAttr}" for tag: ${tag}`,
      e
    );
  }
  return {};
};

export const convertNode = (node: Node): HtmlElement | string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node as Text).wholeText;
  }
  if (node.nodeType === Node.COMMENT_NODE) {
    return '';
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    throw new Error('Not sure what this is');
  }

  const html = node as HTMLElement;
  const content = Array.from(html.childNodes).map(convertNode);
  const kindCounters: Record<string, number> = {};
  content.forEach((child) => {
    if (typeof child !== 'string') {
      child.indexOfType =
        child.tag in kindCounters
          ? (kindCounters[child.tag] = kindCounters[child.tag] + 1)
          : (kindCounters[child.tag] = 0);
    }
  });

  let style: Style = {};
  const styleAttr = html.getAttribute('style');
  if (styleAttr) {
    style = convertElementStyle(styleAttr.trim(), html.tagName);
  }

  const suppStyles = [
    'alignContent',
    'alignItems',
    'alignSelf',
    // 'flex',
    'flexDirection',
    'flexWrap',
    'flexFlow',
    'flexGrow',
    'flexShrink',
    'flexBasis',
    'justifyContent',
    'order',

    // Layout
    'bottom',
    'display',
    'left',
    'position',
    'right',
    'top',
    'overflow',
    'zIndex',

    // Dimension
    'height',
    'maxHeight',
    'maxWidth',
    'minHeight',
    'minWidth',
    'width',

    // Color
    'backgroundColor',
    'color',
    'opacity',

    // Text
    'fontSize',
    'fontFamily',
    'fontStyle',
    'fontWeight',
    //'letterSpacing', -- has issues
    'lineHeight',
    'maxLines',
    'textAlign',
    'textDecoration',
    'textDecorationColor',
    'textDecorationStyle',
    'textIndent',
    'textOverflow',
    'textTransform',

    // Sizing/positioning
    'objectFit',
    'objectPosition',
    'objectPositionX',
    'objectPositionY',

    // Margin/padding
    // 'margin',
    'marginHorizontal',
    'marginVertical',
    'marginTop',
    'marginRight',
    'marginBottom',
    'marginLeft',
    // 'padding',
    'paddingHorizontal',
    'paddingVertical',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',

    // Transformations
    'transform',
    'transformOrigin',
    'transformOriginX',
    'transformOriginY',

    // Borders
    // 'border',
    'borderWidth',
    'borderColor',
    'borderStyle',
    // 'borderTop',
    'borderTopColor',
    'borderTopStyle',
    'borderTopWidth',
    // 'borderRight',
    'borderRightColor',
    'borderRightStyle',
    'borderRightWidth',
    // 'borderBottom',
    'borderBottomColor',
    'borderBottomStyle',
    'borderBottomWidth',
    // 'borderLeft',
    'borderLeftColor',
    'borderLeftStyle',
    'borderLeftWidth',
    'borderTopLeftRadius',
    'borderTopRightRadius',
    'borderBottomRightRadius',
    'borderBottomLeftRadius',
    'borderRadius',
  ];

  //let computedStyle: Style | undefined;
  if (window) {
    const computedStyles = window.getComputedStyle(html);
    //don't bother rendering
    if (computedStyles.getPropertyValue('display') === 'none') {
      return '';
    }
    suppStyles.forEach((key) => {
      const computedStyle = computedStyles[key as keyof CSSStyleDeclaration];
      if (computedStyle) {
        CssToPDFTranslate(node.nodeType, style, key, computedStyle as string);
      }
    });
  }

  return Object.assign(html, {
    tag: (html.tagName || '').toLowerCase() as Tag | string,
    pdfStyle: style ? [style] : [],
    content,
    indexOfType: 0,
  }) as HtmlElement;
};

const parseHtml = (
  dom: HTMLElement
): { stylesheets: HtmlStyles[]; rootElement: HtmlElement } => {
  const stylesheets = Array.from(dom.querySelectorAll('style'))
    .map((styleNode) =>
      Array.from(styleNode.childNodes)
        .map((textNode) => (textNode as Text).wholeText.trim())
        .join('\n')
    )
    .filter((styleText) => !!styleText)
    .map(convertStylesheet);
  return {
    stylesheets,
    rootElement: convertNode(dom) as HtmlElement,
  };
};

export default parseHtml;
