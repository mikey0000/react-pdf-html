import React, {RefObject, useMemo} from 'react';
import renderHtml, { HtmlRenderers } from './render';
import { Style } from '@react-pdf/types';
import { HtmlStyles } from './styles';

export type HtmlProps = {
  collapse?: boolean;
  renderers?: HtmlRenderers;
  style?: Style | (Style | undefined)[];
  stylesheet?: HtmlStyles | HtmlStyles[];
  resetStyles?: boolean;
  children: RefObject<HTMLElement>;
};

const Html: React.FC<HtmlProps> = (props) => {
  return useMemo(() => <>{renderHtml(props.children, props)}</>, [
    props.collapse,
    ...Object.values(props.renderers || {}),
    ...(Array.isArray(props.style) ? props.style : [props.style]),
    ...(Array.isArray(props.stylesheet)
      ? props.stylesheet
      : [props.stylesheet]),
    props.resetStyles,
    props.children,
  ]);
};

export default Html;
