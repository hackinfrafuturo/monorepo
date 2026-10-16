import "./face.css";
import React, { useRef } from "react";
import { motion, useInView } from "motion/react";
import { blocks } from "./face.content.json";
import { controls } from "./face.controls.json";
import { TextContent } from "@/components/ui/text-content";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function DimensionLine({ className }: { className?: string }) {
  return (
    <div className={`flex items-center ${className ?? ""}`}>
      <span className="w-px h-3 @xl:h-4 bg-accent shrink-0" />
      <svg viewBox="0 0 8 8" className="w-2 h-2 shrink-0 -ml-px">
        <path d="M0 4 L8 0 V8 Z" className="fill-accent" />
      </svg>
      <span className="flex-1 h-px bg-accent" />
      <svg viewBox="0 0 8 8" className="w-2 h-2 shrink-0 -mr-px">
        <path d="M8 4 L0 0 V8 Z" className="fill-accent" />
      </svg>
      <span className="w-px h-3 @xl:h-4 bg-accent shrink-0" />
    </div>
  );
}

export default function ImageOverlayCoverFace() {
  const darken = (controls.imageDarken?.value ?? 35) / 100;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });

  return (
    <div
      ref={ref}
      className="relative w-full h-full overflow-hidden bg-background font-body"
    >
      {/* Full-bleed background image - purple duotone site photo */}
      <motion.img
        src={blocks.heroImage.src}
        alt=""
        initial={{ scale: 1.08, opacity: 0 }}
        animate={inView ? { scale: 1, opacity: 1 } : {}}
        transition={{ duration: 1.4, ease: EASE }}
        className="bp-photo absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-accent mix-blend-multiply" />
      <div className="absolute inset-0 bg-background mix-blend-screen" />
      <div className="bp-grid-overlay absolute inset-0" />
      {/* Darkening scrim - legibility, driven by control */}
      <div
        className="absolute inset-0 bg-overlay"
        style={{ opacity: darken }}
      />

      {/* Tagline top-left */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 1, delay: 0.1, ease: EASE }}
        className="absolute top-8 left-6 @xl:top-12 @xl:left-16"
      >
        <TextContent
          content={blocks.taglineLine1.content}
          className="font-heading leading-[1.04] text-foreground font-bold text-4xl @xl:text-[96px]"
          data-content-keys={["taglineLine1"]}
          style={{
            letterSpacing: "-0.01em",
          }}
        />
        <motion.div
          initial={{ scaleX: 0 }}
          animate={inView ? { scaleX: 1 } : {}}
          transition={{ duration: 1, delay: 0.4, ease: EASE }}
          className="origin-left mt-4 @xl:mt-6"
        >
          <DimensionLine className="w-40 @xl:w-72" />
        </motion.div>
      </motion.div>

      {/* Subtitle bottom-left */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 1, delay: 0.4, ease: EASE }}
        className="absolute bottom-6 left-6 @xl:bottom-12 @xl:left-16 pr-6"
      >
        <TextContent
          content={blocks.subtitle.content}
          className="text-muted text-base @xl:text-3xl font-normal leading-snug [&_strong]:text-foreground [&_strong]:font-heading"
          data-content-keys={["subtitle"]}
        />
      </motion.div>
    </div>
  );
}
