import { useEffect, useState } from "react";

const AUTOPLAY_INTERVAL_MS = 5000;

interface HeroCarouselProps {
  images: string[];
}

// Imagem de prévia do Hero. Com 1 imagem só, comportamento estático (igual
// ao que a landing já tinha antes do carrossel); com 2+, avança sozinho e
// pausa ao passar o mouse — troca só a chamada em `Landing.tsx`, layout e
// tokens (borda, sombra, raio) seguem os mesmos das demais seções com
// imagem (ex.: "Sobre nós").
export default function HeroCarousel({ images }: HeroCarouselProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (images.length < 2 || paused) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, AUTOPLAY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [images.length, paused]);

  if (images.length === 0) return null;

  const wrapperClassName =
    "rounded-2xl border border-neutral-300 dark:border-white/10 shadow-md overflow-hidden bg-white dark:bg-neutral-900";

  if (images.length === 1) {
    return (
      <div className={wrapperClassName}>
        <img
          src={images[0]}
          alt="Prévia da plataforma Contabilidade Igreja"
          className="w-full h-auto object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${wrapperClassName} relative`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative aspect-[4/3] sm:aspect-[16/10]">
        {images.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={i === 0 ? "Prévia da plataforma Contabilidade Igreja" : ""}
            aria-hidden={i !== index}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </div>
      <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Ir para imagem ${i + 1}`}
            aria-current={i === index}
            className={`h-2 rounded-full transition-all ${
              i === index ? "w-5 bg-orla-blue" : "w-2 bg-white/70 dark:bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
