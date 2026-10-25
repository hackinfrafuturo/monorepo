import React, { useRef } from "react";
import { motion, useInView } from "motion/react";
import { blocks as sourceBlocks } from "./face.content.json";
import { useCopy, useLocalized } from "@/i18n/use-localized";
import { controls } from "./face.controls.json";
import { TextContent } from "@/components/ui/text-content";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function assetSrc(src: string) {
  return `${import.meta.env.BASE_URL}${src.replace(/^\//, "")}`;
}

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
  const blocks = useLocalized(sourceBlocks);
  const sponsorsLabel = useCopy("Event sponsors");
  const darken = (controls.imageDarken?.value ?? 15) / 100;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });

  return (
    <div
      ref={ref}
      className="relative w-full h-full overflow-hidden bg-background font-body"
    >
      <img
        src={assetSrc(blocks.heroImage.src)}
        alt=""
        className="absolute inset-0 h-full w-full object-cover grayscale contrast-105 brightness-[0.55]"
      />
      <div className="pointer-events-none absolute inset-0 bg-background/60" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(14,4,28,0.7) 0%, rgba(26,9,51,0.45) 42%, rgba(26,9,51,0.5) 64%, rgba(14,4,28,0.86) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-overlay"
        style={{ opacity: darken }}
      />

      <div className="relative grid h-full w-full grid-rows-[auto_1fr_auto] px-6 py-8 @xl:px-16 @xl:py-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, delay: 0.1, ease: EASE }}
        >
          <TextContent
            content={blocks.taglineLine1.content}
            className="font-heading leading-[1.04] text-foreground font-bold text-4xl @xl:text-[96px]"
            data-content-keys={["taglineLine1"]}
            style={{ letterSpacing: "-0.01em" }}
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

        <div />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, delay: 0.4, ease: EASE }}
          className="grid gap-8 @xl:gap-10"
        >
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 @xl:grid-cols-3 @xl:gap-x-12 @xl:gap-y-8">
            {blocks.facts.rows.map((fact, index) => (
              <div key={fact.id} className="min-w-0">
                <dt>
                  <TextContent
                    as="span"
                    content={fact.label}
                    className="block text-muted text-xs @xl:text-lg"
                    data-content-keys={[`facts.rows.${index}.label`]}
                  />
                </dt>
                <dd>
                  <TextContent
                    as="span"
                    content={fact.value}
                    className="mt-1 block font-heading text-foreground text-xl leading-tight @xl:text-4xl"
                    data-content-keys={[`facts.rows.${index}.value`]}
                  />
                </dd>
              </div>
            ))}
          </dl>

          <div aria-label={sponsorsLabel}>
            <TextContent
              content={blocks.sponsorsLabel.content}
              className="mb-3 @xl:mb-5 text-muted text-xs @xl:text-lg"
              data-content-keys={["sponsorsLabel"]}
            />
            <ul className="grid grid-cols-2 items-center gap-x-6 gap-y-4 @xl:grid-cols-4 @xl:gap-x-10">
              {blocks.sponsors.rows.map((sponsor, index) => (
                <li key={sponsor.id} className="min-w-0">
                  <img
                    src={assetSrc(sponsor.image.src)}
                    alt={sponsor.name}
                    width={sponsor.image.width}
                    height={sponsor.image.height}
                    className="block h-7 w-auto max-w-full object-contain @xl:h-10"
                    data-content-keys={`sponsors.rows.${index}.image`}
                  />
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
