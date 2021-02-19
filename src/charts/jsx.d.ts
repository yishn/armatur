declare global {
  namespace JSX {
    interface IntrinsicElements {
      [tagName: string]: any
    }
  }
}

export type IntrinsicElements = JSX.IntrinsicElements;
