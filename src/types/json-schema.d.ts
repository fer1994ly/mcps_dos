declare module 'json-schema' {
    // Minimal declarations to satisfy packages that import JSONSchema7 types.
    // These are intentionally permissive (any) to avoid blocking compilation.
    export type JSONSchema7 = any;
    export type JSONSchema7Definition = any;
}
