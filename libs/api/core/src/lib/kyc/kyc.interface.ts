export const FACE_MATCH_PROVIDER = Symbol('FACE_MATCH_PROVIDER');
export const ID_OCR_PROVIDER = Symbol('ID_OCR_PROVIDER');

export interface FaceMatchProvider {
  /**
   * Compare two face images. `similarity` is 0..100; `confidence` is the
   * provider's confidence that a face was detected at all.
   */
  compare(
    sourceBytes: Uint8Array,
    targetBytes: Uint8Array,
  ): Promise<FaceMatchResult>;
}

export interface FaceMatchResult {
  similarity: number;
  confidence: number;
  faceDetected: boolean;
}

export interface IdOcrProvider {
  /** Extract structured fields from a Ghana Card image. */
  extract(imageBytes: Uint8Array): Promise<IdOcrResult>;
}

export interface IdOcrResult {
  rawText: string;
  ghanaCardNumber: string | null;
  fullName: string | null;
  dateOfBirth: string | null;
  fields: Record<string, string>;
}
