import { useRef } from "react";
import type { ChangeEvent } from "react";
import { Upload, Loader2 } from "lucide-react";
import type { ImportFormat } from "../../../types";

const FORMAT_EXTENSIONS: Record<ImportFormat, string> = {
  csv: ".csv",
  pdf: ".pdf",
  ofx: ".ofx,.qfx",
  image: ".jpg,.jpeg,.png",
};

const FORMAT_HINT: Record<ImportFormat, string> = {
  csv: "CSV",
  pdf: "PDF",
  ofx: "OFX",
  image: "Imagem",
};

interface UploadDropzoneProps {
  isUploading: boolean;
  hasUploaded: boolean;
  onFileSelected: (file: File) => void;
  // null enquanto o plano ainda carrega — nesse intervalo aceita qualquer
  // formato (mesma postura permissiva de canImportFormat em usePlanLimits).
  allowedFormats: ImportFormat[] | null;
}

export default function UploadDropzone({ isUploading, hasUploaded, onFileSelected, allowedFormats }: UploadDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formats = allowedFormats ?? (["csv", "pdf", "ofx", "image"] as ImportFormat[]);
  const acceptAttr = formats.map((f) => FORMAT_EXTENSIONS[f]).join(",");
  const hintText = formats.map((f) => FORMAT_HINT[f]).join(", ");

  const onDropzoneClick = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onFileSelected(file);
  };

  return (
    <>
      <input ref={fileInputRef} type="file" accept={acceptAttr} onChange={onInputChange} className="hidden" />
      <div
        onClick={onDropzoneClick}
        className="border-[1.5px] border-dashed border-neutral-300 dark:border-white/20 rounded-lg text-center cursor-pointer bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
        style={{ padding: isUploading ? "28px" : "36px" }}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2.5">
            <Loader2 size={26} className="text-orla-blue animate-spin" />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              Lendo e categorizando lançamentos do PDF/Imagem…
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2.5">
            <Upload size={26} className="text-neutral-400" />
            <div>
              <div className="text-sm font-medium">
                {hasUploaded ? "Enviar outro extrato bancário" : "Arraste o extrato ou clique para enviar"}
              </div>
              <div className="text-xs text-neutral-700 dark:text-neutral-400 mt-0.5">{hintText}, até 10MB</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
