/** Libellé court : « 1 Commerciale A » (code niveau + option + code classe). */
export function formatClassShortLabel(input: {
  codeClass: string;
  level: { codeLevel: string; option: { nameOption: string } };
}): string {
  return `${input.level.codeLevel} ${input.level.option.nameOption} ${input.codeClass}`;
}
