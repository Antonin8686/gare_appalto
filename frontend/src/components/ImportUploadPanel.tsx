import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ImportBatch } from "../types/import";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isAbortError(error: unknown): boolean {
  return (
    axios.isCancel(error) ||
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "CanceledError")
  );
}

export interface ImportUploadPanelProps {
  icon: string;
  dropzoneText: string;
  dropzoneHint: string;
  accept: string;
  validateFile: (file: File) => string | null;
  upload: (file: File, signal?: AbortSignal) => Promise<ImportBatch>;
  invalidateQueryKeys: string[][];
  redirectPath?: string;
}

export function ImportUploadPanel({
  icon,
  dropzoneText,
  dropzoneHint,
  accept,
  validateFile,
  upload,
  invalidateQueryKeys,
  redirectPath = "/analysis-hub",
}: ImportUploadPanelProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      return upload(file, controller.signal);
    },
    onSuccess: async () => {
      abortRef.current = null;
      setPendingFile(null);
      setUploadError(null);
      setCancelMessage(null);
      resetInput();

      await Promise.all(
        invalidateQueryKeys.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
      navigate(redirectPath);
    },
    onError: (error: unknown) => {
      abortRef.current = null;
      if (isAbortError(error)) {
        setCancelMessage("Caricamento annullato.");
        setUploadError(null);
        return;
      }
      const message =
        error instanceof Error ? error.message : "Errore durante il caricamento.";
      setUploadError(message);
      setCancelMessage(null);
    },
  });

  const isUploading = uploadMutation.isPending;

  function resetInput() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function clearSelection() {
    if (isUploading) return;
    setPendingFile(null);
    setUploadError(null);
    setCancelMessage(null);
    resetInput();
  }

  function cancelUpload() {
    abortRef.current?.abort();
    abortRef.current = null;
    uploadMutation.reset();
    setPendingFile(null);
    setUploadError(null);
    setCancelMessage("Caricamento annullato.");
    resetInput();
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || isUploading) return;

    const file = files[0];
    const validationError = validateFile(file);
    if (validationError) {
      setPendingFile(null);
      setUploadError(validationError);
      setCancelMessage(null);
      resetInput();
      return;
    }

    setPendingFile(file);
    setUploadError(null);
    setCancelMessage(null);
    resetInput();
  }

  function startUpload() {
    if (!pendingFile || isUploading) return;
    uploadMutation.mutate(pendingFile);
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  }

  const dropzoneClass = [
    "telemat-upload-dropzone",
    isDragging ? "telemat-upload-dropzone--active" : "",
    isUploading ? "telemat-upload-dropzone--uploading" : "",
    pendingFile && !isUploading ? "telemat-upload-dropzone--ready" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className="telemat-upload-card">
      {!pendingFile && !isUploading ? (
        <div
          className={dropzoneClass}
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragging(false);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
        >
          <div className="telemat-upload-dropzone-icon">{icon}</div>
          <p className="telemat-upload-dropzone-text">{dropzoneText}</p>
          <p className="telemat-upload-dropzone-hint">{dropzoneHint}</p>
          <input
            ref={inputRef}
            type="file"
            className="telemat-upload-input"
            accept={accept}
            onChange={(event) => handleFiles(event.target.files)}
          />
        </div>
      ) : (
        <div className={dropzoneClass}>
          <div className="telemat-upload-preview">
            <div className="telemat-upload-preview__icon" aria-hidden>
              {isUploading ? (
                <span className="telemat-upload-preview__spinner" />
              ) : (
                icon
              )}
            </div>
            <div className="telemat-upload-preview__main">
              <p className="telemat-upload-preview__name">
                {pendingFile?.name ?? "File in caricamento"}
              </p>
              {pendingFile && (
                <p className="telemat-upload-preview__meta">
                  {formatFileSize(pendingFile.size)}
                </p>
              )}
              <p className="telemat-upload-preview__status">
                {isUploading
                  ? "Invio al server in corso..."
                  : "Pronto per il caricamento"}
              </p>
            </div>
          </div>

          <div className="telemat-upload-actions">
            {isUploading ? (
              <button
                type="button"
                className="telemat-upload-btn telemat-upload-btn--ghost"
                onClick={cancelUpload}
              >
                Annulla caricamento
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="telemat-upload-btn telemat-upload-btn--primary"
                  onClick={startUpload}
                >
                  Carica e apri Centro Analisi
                </button>
                <button
                  type="button"
                  className="telemat-upload-btn telemat-upload-btn--ghost"
                  onClick={clearSelection}
                >
                  Annulla
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {cancelMessage && (
        <p className="telemat-upload-cancelled" role="status">
          {cancelMessage}
        </p>
      )}
      {uploadError && <p className="telemat-upload-error">{uploadError}</p>}
    </section>
  );
}
