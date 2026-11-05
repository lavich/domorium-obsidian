export interface VaultFileHost<File, Leaf> {
  normalize(path: string): string;
  find(path: string): File | null;
  leafShowing(path: string): Leaf | null;
  reveal(leaf: Leaf): void;
  openInTab(file: File): void;
  notFound(path: string): void;
}

export function openVaultFile<File, Leaf>(
  relativePath: string,
  host: VaultFileHost<File, Leaf>,
): void {
  const path = host.normalize(relativePath);
  const file = host.find(path);
  if (file === null) {
    host.notFound(path);
    return;
  }
  const open = host.leafShowing(path);
  if (open) {
    host.reveal(open);
    return;
  }
  host.openInTab(file);
}
