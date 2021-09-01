import { HtmlStyle } from '../styles';
import { Style } from 'util';

const elementNodeFilter: object = {};

const textNodeFilter: object = {
  width: false,
  height: false,
};

const keepProperty = (nodeType: number, property: string, value: string) => {
  if (value === 'none') return false;

  if (nodeType === Node.ELEMENT_NODE) {
    if (elementNodeFilter.hasOwnProperty(property)) {
      return elementNodeFilter[property as keyof object];
    }
  }
  if (nodeType === Node.TEXT_NODE) {
    if (textNodeFilter.hasOwnProperty(property)) {
      return elementNodeFilter[property as keyof object];
    }
  }

  return true;
};

const checkValue = (property: string, computedValue: string) => {
  //split styles that have multiple options in their value
  // none solid rgba(12, 12, 12)

  const rgbaMatch = /^rgba?\(.*?\)/i.exec(computedValue);

  if (rgbaMatch && computedValue.indexOf(rgbaMatch[0]) === 0) {
    return rgbaMatch[0];
  }

  const wordOnly = /(\w*)/.exec(computedValue.split(' ')[0]);

  //word or number combination only no commas
  //covers font families
  //TODO extract out
  if (property === 'fontFamily' && wordOnly && wordOnly[0] === '') {
    return 'OpenSansFont';
  }

  if (wordOnly) {
    return wordOnly[0];
  }

  throw new Error(`${computedValue} not a word`);
};

export const CssToPDFTranslate = (
  nodeType: number,
  style: HtmlStyle,
  property: string,
  computedValue: string
) => {
  if (!keepProperty(nodeType, property, computedValue)) {
    return;
  }

  if (property === 'lineHeight') {
    computedValue = '1'; //style.lineHeight / (style.fontSize * 2);
  }

  if (property === 'flex-grow' && computedValue === '0') {
    debugger;
    computedValue = '1';
  }

  style[property as keyof Style] = checkValue(
    property,
    computedValue as string
  );
};
