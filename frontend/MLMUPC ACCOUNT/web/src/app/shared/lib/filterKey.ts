// util.ts
export type KeysFromConst<T extends readonly string[]> = T[number];
export type FilterFromKeys<T extends readonly string[], V = string | number | boolean> =
  Partial<Record<T[number], V>>;
