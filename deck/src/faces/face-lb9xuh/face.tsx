import "./face.css";
import React, { useRef } from "react";
import { motion, useInView } from "motion/react";
import { blocks } from "./face.content.json";
import { TextContent } from "@/components/ui/text-content";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function AgendaFace() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });

  const items = blocks.items.rows.slice(0, 5);

  return (
    <div
      ref={ref}
      className="relative w-full h-full overflow-hidden bp-grid text-foreground font-body flex flex-col px-6 py-8 @xl:px-16 @xl:py-14"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: EASE }}
        className="shrink-0"
      >
        <TextContent
          content={blocks.title.content}
          className="mt-3 @xl:mt-5 font-heading leading-[1.06] text-foreground font-bold text-4xl @xl:text-7xl"
          data-content-keys={["title"]}
          style={{ letterSpacing: "-0.01em" }}
        />
      </motion.div>

      {/* Reasons: pixel headline with muted support line, one per row */}
      <div className="mt-6 @xl:mt-10 flex-1 min-h-0 flex flex-col">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 + index * 0.09, ease: EASE }}
            className="flex-1 min-h-0 flex flex-col justify-center gap-1 @xl:gap-2 border-t-2 border-dashed border-accent/50"
          >
            <TextContent
              content={item.title}
              className="font-heading font-bold text-foreground text-lg @xl:text-5xl leading-[1.05]"
              data-content-keys={[`items.rows.${index}.title`]}
              style={{ letterSpacing: "-0.01em" }}
            />
            <TextContent
              content={item.note}
              className="text-muted text-sm @xl:text-2xl font-normal leading-snug [&_strong]:text-foreground"
              data-content-keys={[`items.rows.${index}.note`]}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
