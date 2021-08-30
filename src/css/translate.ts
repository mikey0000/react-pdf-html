export const CssToPDFTranslate = (property: string, value: string): string => {
  //split styles that have multiple options in their value
  // none solid rgba(12, 12, 12)
  const rgbaMatch = /^rgba?\(.*?\)/i.exec(value);

  if (rgbaMatch && value.indexOf(rgbaMatch[0]) === 0) {
    return rgbaMatch[0];
  }

  const wordOnly = /(\w*)/.exec(value.split(' ')[0]);

  //word or number combination only no commas
  //covers font families
  //TODO extract out
  if (property === 'fontFamily' && wordOnly && wordOnly[0] === '') {
    return 'OpenSansFont';
  }

  if (wordOnly) {
    return wordOnly[0];
  }

  throw new Error(`${value} not a word`);
};
