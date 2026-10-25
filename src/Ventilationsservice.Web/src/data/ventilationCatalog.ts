/** Common product-family suggestions; users can always enter other values manually. */
export const ventilationCatalog: Record<string, string[]> = {
  Swegon: ["GOLD", "CASA"],
  Systemair: ["Geniox", "SAVE"],
  FläktGroup: ["eQ Prime", "eQ Master", "eQL"],
  Östberg: ["HERU Select", "HERU T EC", "HERU K EC", "HERU S EC"],
  Flexit: ["Nordic S2", "Nordic S3", "Nordic S4", "Nordic CL3"],
  "IV Produkt": ["Envistar Compact", "Envistar Flex", "Flexomix"],
};

export const manufacturers: string[] = Object.keys(ventilationCatalog);

export function productsForManufacturer(manufacturer: string): string[] {
  const match = Object.keys(ventilationCatalog).find(
    (name) => name.toLocaleLowerCase("sv-SE") === manufacturer.trim().toLocaleLowerCase("sv-SE"),
  );
  return match ? ventilationCatalog[match] : [];
}
