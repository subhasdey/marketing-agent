"use client";

import clsx from "clsx";
import { useCallback, useState } from "react";
import { uploadCsvDatasets } from "@/lib/api";
import type { CsvIngestionResponse } from "@/types/analytics";

export function CsvUploadCard() {
  const [datasetPrefix, setDatasetPrefix] = useState("");
  const [business, setBusiness] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CsvIngestionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const filesArray = Array.from(newFiles);
    setFiles((prev) => {
      const existingKeys = new Set(prev.map((file) => `${file.name}-${file.lastModified}`));
      const deduped = filesArray.filter((file) => !existingKeys.has(`${file.name}-${file.lastModified}`));
      return [...prev, ...deduped];
    });
  }, []);

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      addFiles(event.target.files);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files?.length) {
      addFiles(event.dataTransfer.files);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (files.length === 0) {
      setError("Please add at least one CSV file.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await uploadCsvDatasets({
        files,
        datasetName: datasetPrefix.trim() || undefined,
        business: business.trim() || undefined,
      });
      setResult(response);
      setFiles([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to upload CSV datasets.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data Ingestion</p>
        <h2 className="text-lg font-semibold text-slate-900">Upload marketing CSV exports</h2>
        <p className="text-sm text-slate-600">
          Drag and drop one or more Shopify/channel exports to register them for KPIs, Prompt-to-SQL, and AutoML.
        </p>
      </div>
      <form className="space-y-4 p-6" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Dataset prefix (optional)
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              placeholder="e.g. Paid Social"
              value={datasetPrefix}
              onChange={(event) => setDatasetPrefix(event.target.value)}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Business label (optional)
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              placeholder="e.g. Avalon Sunshine"
              value={business}
              onChange={(event) => setBusiness(event.target.value)}
            />
          </label>
        </div>

        <label
          className={clsx(
            "flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition",
            isDragging ? "border-slate-500 bg-slate-50" : "border-slate-300 hover:border-slate-400"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input type="file" accept=".csv,text/csv" multiple className="hidden" onChange={handleFileInput} />
          <p className="text-sm font-semibold text-slate-900">Drag & drop CSV files</p>
          <p className="text-xs text-slate-500">or click to browse your exports</p>
        </label>

        {files.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Files ready to ingest</p>
            <ul className="mt-3 space-y-2">
              {files.map((selectedFile, index) => (
                <li
                  key={`${selectedFile.name}-${selectedFile.lastModified}-${index}`}
                  className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
                >
                  <div>
                    <p className="font-medium text-slate-900">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB · {selectedFile.type || "text/csv"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-medium text-rose-600 hover:text-rose-700"
                    onClick={() => removeFile(index)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="submit"
          className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={submitting}
        >
          {submitting ? "Uploading..." : files.length > 1 ? "Upload all files" : "Upload & ingest"}
        </button>

        {error && <p className="text-sm text-rose-600">{error}</p>}
      </form>

      {result && (
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">
            Job {result.job_id} · Status:{" "}
            <span className={result.status === "completed" ? "text-emerald-600" : "text-amber-600"}>
              {result.status}
            </span>
          </p>
          <p className="mt-1 text-slate-600">
            {result.ingested_count} dataset(s) ingested. Ready for Prompt-to-SQL, KPI, and AutoML services.
          </p>
          {result.warnings && result.warnings.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-amber-600">
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
          {result.datasets.length > 0 && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Registered tables</p>
              <ul className="mt-2 space-y-2">
                {result.datasets.map((dataset) => (
                  <li key={dataset.table_name}>
                    <p className="font-medium text-slate-900">{dataset.dataset_name}</p>
                    <p className="text-xs text-slate-500">
                      {dataset.table_name} · {dataset.row_count.toLocaleString()} rows · source: {dataset.business}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

