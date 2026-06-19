import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { pollImportUntilSettled } from "../api/imports";
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

type WorkflowStep = "upload" | "parse";

export interface ImportUploadPanelProps {
  icon: string;
  dropzoneText: string;
  dropzoneHint: string;
  accept: string;
  validateFile: (file: File) => string | null;
  upload: (file: File, signal?: AbortSignal) => Promise<ImportBatch>;
  fetchImport: (id: number, signal?: AbortSignal) => Promise<ImportBatch>;
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
  fetchImport,
  invalidateQueryKeys,
  redirectPath = "/analysis-hub",
}: ImportUploadPanelProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const signal = controller.signal;

      setWorkflowStep("upload");
      const batch = await upload(file, signal);

      if (batch.status === "processing") {
        setWorkflowStep("parse");
        return pollImportUntilSettled(fetchImport, batch, signal);
      }

      return batch;
    },
    onSuccess: (batch, file) => {
      abortRef.current = null;
      setWorkflowStep(null);

      if (batch.status === "failed") {
        setActiveFile(file);
        setUploadError(batch.error_message || "Elaborazione non riuscita.");
        setCancelMessage(null);
        return;
      }

      setActiveFile(null);
      setUploadError(null);
      setCancelMessage(null);
      resetInput();

      navigate(redirectPath);

      void Promise.all(
        invalidateQueryKeys.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
    },
    onError: (error: unknown, file) => {
      abortRef.current = null;
      setWorkflowStep(null);

      if (isAbortError(error)) {
        setActiveFile(null);
        setCancelMessage("Caricamento annullato.");
        setUploadError(null);
        resetInput();
        return;
      }

      setActiveFile(file);
      const message =
        error instanceof Error ? error.message : "Errore durante il caricamento.";
      setUploadError(message);
      setCancelMessage(null);
    },
  });

  const isBusy = uploadMutation.isPending;

  function resetInput() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function clearSelection() {
    if (isBusy) return;
    setActiveFile(null);
    setUploadError(null);
    setCancelMessage(null);
    setWorkflowStep(null);
    uploadMutation.reset();
    resetInput();
  }

  function cancelUpload() {
    abortRef.current?.abort();
    abortRef.current = null;
    uploadMutation.reset();
    setActiveFile(null);
    setUploadError(null);
    setWorkflowStep(null);
    setCancelMessage("Caricamento annullato.");
    resetInput();
  }

  function startUpload(file: File) {
    if (isBusy) return;
    setActiveFile(file);
    setUploadError(null);
    setCancelMessage(null);
    uploadMutation.mutate(file);
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || isBusy) return;

    const file = files[0];
    const validationError = validateFile(file);
    if (validationError) {
      setActiveFile(null);
      setUploadError(validationError);
      setCancelMessage(null);
      resetInput();
      return;
    }

    startUpload(file);
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  }

  function statusMessage(): string {
    if (workflowStep === "upload") {
      return "Caricamento file in corso...";
    }
    if (workflowStep === "parse") {
      return "Elaborazione gare in corso...";
    }
    if (isBusy) {
      return "Elaborazione in corso...";
    }
    return "Caricamento non riuscito";
  }

  const dropzoneClass = [
    "telemat-upload-dropzone",
    isDragging ? "telemat-upload-dropzone--active" : "",
    isBusy ? "telemat-upload-dropzone--uploading" : "",
    activeFile && !isBusy ? "telemat-upload-dropzone--ready" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const showProgress = Boolean(activeFile) || isBusy;

  return (
    <section className="telemat-upload-card">
      {!showProgress ? (
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
              {isBusy ? (
                <span className="telemat-upload-preview__spinner" />
              ) : (
                icon
              )}
            </div>
            <div className="telemat-upload-preview__main">
              <p className="telemat-upload-preview__name">
                {activeFile?.name ?? "File in caricamento"}
              </p>
              {activeFile && (
                <p className="telemat-upload-preview__meta">
                  {formatFileSize(activeFile.size)}
                </p>
              )}
              <p className="telemat-upload-preview__status">{statusMessage()}</p>
            </div>
          </div>

          <div className="telemat-upload-actions">
            {isBusy ? (
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
                  onClick={() => activeFile && startUpload(activeFile)}
                >
                  Riprova
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
