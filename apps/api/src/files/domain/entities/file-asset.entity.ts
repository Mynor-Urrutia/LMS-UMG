export interface FileAssetEntity {
  id: string;
  uploaderId: string | null;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: bigint;
  path: string;
  pdfStoredName: string | null;
  pdfPath: string | null;
  createdAt: Date;
}
