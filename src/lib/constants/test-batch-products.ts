/**
 * Test batch data: 3 orthopedic products in a typical vendor spreadsheet format.
 * Used for testing the batch import flow without a real file.
 */
export const TEST_BATCH_PRODUCTS: Record<string, string>[] = [
  {
    'Product Name': 'Trident II Tritanium Acetabular Shell',
    'REF / SKU': '6270-2-054',
    'Vendor': 'Stryker Czech Republic s.r.o.',
    'Manufacturer': 'Stryker Corporation',
    'Description': 'Cementless acetabular shell with 3D-printed Tritanium porous titanium structure for primary and revision THA. Size 54mm.',
    'Material': 'Titanium Alloy Ti-6Al-4V ELI (ASTM F136)',
    'CE Marked': 'Yes',
    'MDR Class': 'III',
    'Price (EUR)': '1850',
  },
  {
    'Product Name': 'Pinnacle Gription Acetabular Cup System',
    'REF / SKU': '0580-06-056',
    'Vendor': 'DePuy Synthes Czech Republic',
    'Manufacturer': 'DePuy Synthes (Johnson & Johnson)',
    'Description': 'Modular acetabular cup with Gription porous titanium coating for cementless fixation. Compatible with Marathon polyethylene and ceramic liners. Size 56mm.',
    'Material': 'Titanium Alloy Ti-6Al-4V with Gription coating',
    'CE Marked': 'Yes',
    'MDR Class': 'III',
    'Price (EUR)': '1620',
  },
  {
    'Product Name': 'Taperloc Complete Hip Stem',
    'REF / SKU': '1160-4-0412',
    'Vendor': 'Zimmer Biomet Czech Republic',
    'Manufacturer': 'Zimmer Biomet',
    'Description': 'Hydroxyapatite-coated tapered wedge femoral stem for cementless primary total hip arthroplasty. Offset 44mm, size 12.',
    'Material': 'Titanium Alloy Ti-6Al-4V with HA coating',
    'CE Marked': 'Yes',
    'MDR Class': 'III',
    'Price (EUR)': '2150',
  },
]
