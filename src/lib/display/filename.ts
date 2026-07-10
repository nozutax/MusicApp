export function stripPdfExtension(filename: string): string {
  return filename.replace(/\.pdf$/i, '')
}
