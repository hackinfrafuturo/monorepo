import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { blocks as sourceBlocks } from "./face.content.json";
import { useLocalized } from "@/i18n/use-localized";
import { TextContent } from "@/components/ui/text-content";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function ClosingFace() {
  const blocks = useLocalized(sourceBlocks);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });

  return (
    <div
      ref={ref}
      className="relative w-full h-full overflow-hidden bg-background text-foreground font-body flex flex-col px-6 py-8 @xl:px-16 @xl:py-16"
    >
      {/* Header */}
      <div className="shrink-0">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, delay: 0.1, ease: EASE }}
        >
          <TextContent
            content={blocks.title.content}
            className="font-heading leading-[1.02] text-foreground font-bold text-5xl @xl:text-8xl"
            data-content-keys={["title"]}
            style={{ letterSpacing: "-0.01em" }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, delay: 0.18, ease: EASE }}
        >
          <TextContent
            content={blocks.subtitle.content}
            className="mt-4 @xl:mt-7 text-muted text-base @xl:text-3xl font-normal leading-relaxed max-w-[44ch] [&_strong]:text-foreground"
            data-content-keys={["subtitle"]}
          />
        </motion.div>
      </div>

      {/* Email: the one thing this slide asks for */}
      <div className="flex-1 min-h-0 flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, delay: 0.3, ease: EASE }}
        >
          <TextContent
            content={blocks.email.content}
            className="font-heading font-bold text-foreground text-2xl @xl:text-[104px] leading-[1.05]"
            data-content-keys={["email"]}
            style={{ letterSpacing: "-0.02em" }}
          />
        </motion.div>
      </div>

      {/* Meta: dates and venue as one quiet line */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.55, ease: EASE }}
        className="shrink-0 border-t-2 border-dashed border-accent/50 pt-4 @xl:pt-6"
      >
        <TextContent
          content={blocks.meta.content}
          className="text-muted text-base @xl:text-2xl font-normal leading-relaxed"
          data-content-keys={["meta"]}
        />
      </motion.div>
    </div>
  );
}
