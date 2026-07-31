import { useRef } from "react";
import type { ChangeEvent } from "react";
import { Upload, Loader2 } from "lucide-react";

interface UploadDropzoneProps {
  isUploading: boolean;
  hasUploaded: boolean;
  onFileSelected: (file: File) => void;
}

export default function UploadDropzone({ isUploading, hasUploaded, onFileSelected }: UploadDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      <input ref={fileInputRef} type="file" accept=".pdf,.ofx,.qfx,.csv" onChange={onInputChange} className="hidden" />
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
              <div className="text-xs text-neutral-700 dark:text-neutral-400 mt-0.5">PDF, OFX ou CSV, até 10MB</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
