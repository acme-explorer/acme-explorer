import { IErrorMessageBuilderProps } from '../interfaces/error-message-builder.interface';

export const errorMessageBuilder = (
  props: IErrorMessageBuilderProps,
): string => {
  return `Invalid value ${props.value} at field ${props.path}`;
};
