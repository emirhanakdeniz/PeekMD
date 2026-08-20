import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DocumentError, DocumentState, OpenedDocument } from "./types";
import { toDocumentError } from "./types";

export function useDocumentController() {
  const [state, setState] = useState<DocumentState>({ status: "loading" });
  const [notice, setNotice] = useState<DocumentError | null>(null);
  const documentRef = useRef<OpenedDocument | null>(null);

  const accept = useCallback((document: OpenedDocument) => {
    documentRef.current = document; setNotice(null); setState({ status: "ready", document, rendering: true });
  }, []);
  const fail = useCallback((value: unknown) => {
    const error = toDocumentError(value);
    if (documentRef.current) { setNotice(error); setState((current) => current.status === "ready" ? { ...current, rendering: false } : current); }
    else setState({ status: "error", error });
  }, []);
  const run = useCallback(async (command: string, args?: Record<string, unknown>) => {
    try { const document = await invoke<OpenedDocument>(command, args); accept(document); return document; } catch (error) { fail(error); return null; }
  }, [accept, fail]);
  const openPath = useCallback((path: string) => run("open_document", { path }), [run]);
  const pick = useCallback(async () => {
    try { const document = await invoke<OpenedDocument | null>("pick_document"); if (document) accept(document); } catch (error) { fail(error); }
  }, [accept, fail]);
  const reload = useCallback(() => documentRef.current ? run("open_document", { path: documentRef.current.path }) : Promise.resolve(null), [run]);
  const openRelative = useCallback((href: string) => documentRef.current ? run("open_relative_document", { basePath: documentRef.current.path, href }) : Promise.resolve(null), [run]);
  const renderingDone = useCallback(() => setState((current) => current.status === "ready" ? { ...current, rendering: false } : current), []);

  useEffect(() => { invoke<OpenedDocument | null>("get_initial_document").then((document) => document ? accept(document) : setState({ status: "empty" })).catch(fail); }, [accept, fail]);
  return { state, notice, dismissNotice: () => setNotice(null), pick, reload, openPath, openRelative, renderingDone };
}
