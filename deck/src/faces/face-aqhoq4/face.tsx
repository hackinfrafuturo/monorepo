import "./face.css";
import React, { useRef } from "react";
import { motion, useInView } from "motion/react";
import { blocks } from "./face.content.json";
import { TextContent } from "@/components/ui/text-content";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function StepPhoto({ src }: { src: string }) {
  return (
    <div className="relative w-full h-full min-h-0 overflow-hidden">
      <img src={src} alt="" className="bp-photo w-full h-full object-cover" />
      <div className="absolute inset-0 bg-accent mix-blend-multiply" />
      <div className="absolute inset-0 bg-background mix-blend-screen" />
      <div className="bp-grid-overlay absolute inset-0" />
      <div className="absolute inset-0 bg-overlay/30" />
    </div>
  );
}

export default function HowItWorksFace() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });

  const steps = blocks.steps.rows;
  const colClass =
    steps.length >= 4
      ? "@xl:grid-cols-4"
      : steps.length === 3
      ? "@xl:grid-cols-3"
      : steps.length === 2
      ? "@xl:grid-cols-2"
      : "@xl:grid-cols-1";

  return (
    <div
      ref={ref}
      className="relative w-full h-full overflow-hidden bp-grid font-body flex flex-col px-6 py-6 @xl:px-16 @xl:py-12"
    >
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: EASE }}
        className="shrink-0"
      >
        <div className="mt-3 @xl:mt-5 flex items-end justify-between gap-6">
          <TextContent
            content={blocks.title.content}
            className="font-heading leading-[1.06] text-foreground font-bold text-4xl @xl:text-7xl"
            data-content-keys={["title"]}
            style={{ letterSpacing: "-0.01em" }}
          />
        </div>
      </motion.div>

      {/* Steps: one column per step at @xl, two per row on compact */}
      <div
        className={`mt-6 @xl:mt-10 flex-1 min-h-0 grid grid-cols-2 ${colClass} auto-rows-[minmax(0,1fr)_auto] gap-3 @xl:gap-6`}
      >
        {steps.map((s, index) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 26 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{
              duration: 0.8,
              delay: 0.15 + index * 0.12,
              ease: EASE,
            }}
            className="grid grid-rows-subgrid row-span-2 min-h-0 border border-accent/25 bg-surface overflow-hidden"
          >
            {/* Site photo */}
            <div className="relative w-full min-h-0 overflow-hidden border-b-2 border-dashed border-accent/50">
              <StepPhoto src={s.image.src} />
            </div>

            <div className="flex flex-col shrink-0 p-3 @xl:p-6">
              {/* Title */}
              <TextContent
                content={s.title}
                className="font-heading font-bold text-foreground text-lg @xl:text-5xl @xl:min-h-[6.3rem] leading-[1.05]"
                data-content-keys={[`steps.rows.${index}.title`]}
                style={{ letterSpacing: "-0.01em" }}
              />

              {/* Description */}
              <TextContent
                content={s.description}
                className="mt-2 @xl:mt-4 text-muted text-base @xl:text-2xl font-normal leading-relaxed [&_strong]:text-foreground"
                data-content-keys={[`steps.rows.${index}.description`]}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
