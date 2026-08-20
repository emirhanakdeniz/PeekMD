export interface OpenedDocument {
  path: string;
  filename: string;
  content: string;
  sizeBytes: number;
}

export type DocumentErrorCode =
  | "not_found" | "unsupported_type" | "too_large" | "invalid_utf8" | "invalid_link" | "read_failed";

export interface DocumentError { code: DocumentErrorCode; message: string }

export type DocumentState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "error"; error: DocumentError }
  | { status: "ready"; document: OpenedDocument; rendering: boolean };

export function toDocumentError(value: unknown): DocumentError {
  if (value && typeof value === "object" && "message" in value && typeof value.message === "string") {
    return { code: "code" in value && typeof value.code === "string" ? value.code as DocumentErrorCode : "read_failed", message: value.message };
  }
  return { code: "read_failed", message: typeof value === "string" ? value : "The document could not be opened." };
}
