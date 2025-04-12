declare namespace React {
    interface DetailedHTMLProps<P, T> {
        [key: string]: any;
    }
    interface HTMLAttributes<T> {
        [key: string]: any;
    }
}

declare global {
    namespace JSX {
        interface IntrinsicElements {
            [elemName: string]: {
                [key: string]: unknown;
            };
        }
    }
} 