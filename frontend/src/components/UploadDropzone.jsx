import React, { useRef, useState } from "react";
import { Upload } from "lucide-react";

// Pure UI + file-selection component. Wiring it to a real endpoint:
// pass an onFile(file) handler that POSTs to /api/predict/image or
// /api/predict/video (FastAPI, Phase 2/3 of the roadmap).
export default function UploadDropzone({ accept, hint, onFile }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files) => {
    if (files && files[0] && onFile) onFile(files[0]);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
      style={{
        border: `1.5px dashed ${dragOver ? "var(--ink)" : "var(--line)"}`,
        borderRadius: 6,
        padding: 48,
        textAlign: "center",
        background: "var(--panel)",
        cursor: "pointer",
      }}
    >
      <input ref={inputRef} type="file" accept={accept} hidden onChange={(e) => handleFiles(e.target.files)} />
      <Upload size={22} color="var(--slate)" style={{ marginBottom: 12 }} />
      <p style={{ fontSize: 14, margin: "0 0 4px" }}>Drop a file here, or click to browse</p>
      <p style={{ fontSize: 12.5, color: "var(--slate)", margin: 0 }}>{hint}</p>
    </div>
  );
}
