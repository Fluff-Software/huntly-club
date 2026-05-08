"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type Slide = {
  title: string;
  image: string;
  alt: string;
};

type ShowcaseSliderProps = {
  slides: Slide[];
};

export default function ShowcaseSlider({ slides }: ShowcaseSliderProps) {
  const hasSlides = slides.length > 0;
  const [currentIndex, setCurrentIndex] = useState(1);
  const [isAnimating, setIsAnimating] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const loopedSlides = useMemo(
    () => (hasSlides ? [slides[slides.length - 1], ...slides, slides[0]] : []),
    [hasSlides, slides],
  );

  const activeIndex = hasSlides ? (currentIndex - 1 + slides.length) % slides.length : 0;

  const goToSlide = (index: number) => {
    setIsAnimating(true);
    setCurrentIndex(index + 1);
  };

  const goToPrevious = () => {
    setIsAnimating(true);
    setCurrentIndex((prev) => prev - 1);
  };

  const goToNext = () => {
    setIsAnimating(true);
    setCurrentIndex((prev) => prev + 1);
  };

  const handleTrackTransitionEnd = () => {
    if (currentIndex === 0) {
      setIsAnimating(false);
      setCurrentIndex(slides.length);
      return;
    }

    if (currentIndex === slides.length + 1) {
      setIsAnimating(false);
      setCurrentIndex(1);
      return;
    }
  };

  useEffect(() => {
    if (!isAnimating) {
      const id = requestAnimationFrame(() => setIsAnimating(true));
      return () => cancelAnimationFrame(id);
    }
  }, [isAnimating]);

  useEffect(() => {
    if (!hasSlides || isPaused || slides.length <= 1) {
      return;
    }

    const intervalId = setInterval(() => {
      setIsAnimating(true);
      setCurrentIndex((prev) => prev + 1);
    }, 4500);

    return () => clearInterval(intervalId);
  }, [hasSlides, isPaused, slides.length]);

  if (!hasSlides) {
    return null;
  }

  return (
    <div
      className="mx-auto w-full max-w-xl"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      <div className="relative overflow-hidden rounded-3xl border border-huntly-stone/70 bg-white shadow-soft">
        <div
          className={`flex ${isAnimating ? "transition-transform duration-500 ease-out" : ""}`}
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          onTransitionEnd={handleTrackTransitionEnd}
        >
          {loopedSlides.map((slide, index) => (
            <figure key={`${slide.title}-${index}`} className="w-full shrink-0">
              <div className="relative aspect-[3/4] w-full">
                <Image
                  src={slide.image}
                  alt={slide.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, 640px"
                  className="object-cover object-top"
                />
              </div>
            </figure>
          ))}
        </div>

        <button
          type="button"
          onClick={goToPrevious}
          className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-huntly-stone/80 bg-white/95 text-3xl leading-none text-huntly-forest shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-huntly-leaf"
          aria-label="Previous slide"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={goToNext}
          className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-huntly-stone/80 bg-white/95 text-3xl leading-none text-huntly-forest shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-huntly-leaf"
          aria-label="Next slide"
        >
          ›
        </button>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2" aria-label="Slide navigation">
        {slides.map((slide, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={slide.title}
              type="button"
              onClick={() => goToSlide(index)}
              className={`h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-huntly-leaf ${
                isActive ? "w-8 bg-huntly-moss" : "w-2.5 bg-huntly-stone hover:bg-huntly-slate/50"
              }`}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={isActive ? "true" : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
