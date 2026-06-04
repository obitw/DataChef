import { useRef, useState, DragEvent } from "react";

interface Props {
  onFile: (file: File) => void;
  accept?: string;
}

export default function FileDropzone({ onFile, accept = ".csv,.json" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  function handleFile(file: File) {
    setFileName(file.name);
    onFile(file);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        dragging
          ? "border-indigo-500 bg-indigo-50"
          : "border-gray-300 hover:border-indigo-400"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {fileName ? (
        <p className="text-sm text-indigo-700 font-medium">{fileName}</p>
      ) : (
        <>
          <p className="text-gray-500 text-sm">
            Glissez un fichier CSV ou JSON ici
          </p>
          <p className="text-gray-400 text-xs mt-1">ou cliquez pour parcourir</p>
        </>
      )}
    </div>
  );
}
