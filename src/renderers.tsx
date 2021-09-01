import React from 'react';
import { Link, Text, View, Image, Svg, G, Polygon } from '@react-pdf/renderer';
import { Style } from '@react-pdf/types';
import { HtmlRenderer, HtmlRenderers } from './render';
import { HtmlElement } from './parse';
import { ImageProcessor } from "./image";

export const renderNoop: HtmlRenderer = ({ children }) => <></>;

export const renderBlock: HtmlRenderer = ({ style, children }) => {

  return (
    <View style={style}>{children}</View>
  )
};

export const renderInline: HtmlRenderer = ({ style, children }) => {
  return (
    <Text style={style}>{children}</Text>
  )
};

export const renderCell: HtmlRenderer = ({ style, element, children }) => {
  const table = element.closest('table') as unknown as HtmlElement | undefined;
  if (!table) {
    throw new Error('td element rendered outside of a table');
  }
  const tableStyles = table.pdfStyle.reduce(
    (combined, tableStyle) => Object.assign(combined, tableStyle),
    {} as Style
  );
  const baseStyles: Style = {
    border: tableStyles.border,
    borderColor: tableStyles.borderColor,
    borderWidth: tableStyles.borderWidth,
    borderStyle: tableStyles.borderStyle,
  };
  if (
    (tableStyles as any).borderSpacing &&
    (tableStyles as any).borderCollapse !== 'collapse'
  ) {
    baseStyles.width = tableStyles.borderWidth;
    baseStyles.margin = (tableStyles as any).borderSpacing;
  } else {
    baseStyles.borderRightWidth = 0;
    baseStyles.borderBottomWidth = 0;
    if (element.indexOfType !== 0) {
      baseStyles.borderLeftWidth = tableStyles.borderWidth;
      baseStyles.borderTopWidth = tableStyles.borderWidth;
    }
  }

  const overrides: Style = {};
  const colspanAttr = element.getAttribute('colspan');
  if (colspanAttr) {
    const colspan = parseInt(colspanAttr, 10);
    if (!isNaN(colspan)) {
      overrides.flexBasis = colspan;
    }
  }

  return <View style={[baseStyles, ...style, overrides]}>{children}</View>;
};

// @ts-ignore
const renderers: HtmlRenderers = {
  style: renderNoop,
  script: renderNoop,
  li: ({ element, stylesheets, style, children }) => {

    const ordered = element.parentNode.tag === 'ol';
    return (
      <View style={style}>
        <View>
          <Text>{ordered ? element.indexOfType + 1 + '.' : '•'}</Text>
        </View>
        <Text>{children}</Text>
      </View>
    );
  },
  a: ({ style, element, children }) => (
    <Link style={style} src={element.getAttribute('href') || ""}>
      {children}
    </Link>
  ),
  img: ({ style, element }) =>  {
    let buff;
    const src = element.getAttribute('src') || "";
    //if its inline, process it.
    if(/^http./i.test(src)) {
      return (
        <Image style={style} src={src} />
      )
    }
    new ImageProcessor(src).getImageBuffer().then((arrayBuff) => {
      buff = arrayBuff;
    })

    return (
      buff ? <Image style={style} src={buff} /> : <Text/>
    )

  },
  table: ({ element, style, children }) => {
    const tableStyles = element.pdfStyle.reduce(
      (combined, tableStyle) => Object.assign(combined, tableStyle),
      {} as Style
    );
    const overrides: Style = {};
    if (
      !(tableStyles as any).borderSpacing ||
      (tableStyles as any).borderCollapse === 'collapse'
    ) {
      overrides.borderLeftWidth = 0;
      overrides.borderTopWidth = 0;
    }

    return <View style={[...style, overrides]}>{children}</View>;
  },
  tr: ({ style, children }) => (
    <View wrap={false} style={style}>
      {children}
    </View>
  ),
  br: ({ style }) => (
    <View wrap={false} style={style}>
      <Text> </Text>
    </View>
  ),
  td: renderCell,
  th: renderCell,
  svg:  ({ element, style, children }) => {
    return  (
      <Svg style={style}>
        <G transform="scale(1) translate(100,10)">
        <Polygon
          fill="#f2cc99"
          points=" 69,18 82,8 99,3 118,5 135,12 149,21 156,13 165,9 177,13 183,28 180,50 164,91 155,107 154,114 151,121 141,127 139,136 155,206 157,251 126,342 133,357 128,376 83,376 75,368 67,350 61,350 53,369 4,369 2,361 5,354 12,342 16,321 4,257 4,244 7,218 9,179 26,127 43,93 32,77 30,70 24,67 16,49 17,35 18,23 30,12 40,7 53,7 62,12"
        />
      </G></Svg>
    )
  }
};

export default renderers;
