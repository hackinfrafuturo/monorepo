import React, { useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { blocks as sourceBlocks } from "./face.content.json";
import { useLocalized } from "@/i18n/use-localized";
import { TextContent } from "@/components/ui/text-content";
import CountUpStat from "@/components/ui/count-up-stat";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function EventStatsFace() {
  const blocks = useLocalized(sourceBlocks);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const [played, setPlayed] = useState(false);

  useEffect(() => {
    if (inView) setPlayed(true);
  }, [inView]);

  const numbers = blocks.numbers.rows;
  const claims = blocks.claims.rows;

  return (
    <div
      ref={ref}
      className="relative w-full h-full overflow-hidden bg-background text-foreground font-body flex flex-col px-6 py-8 @xl:px-16 @xl:py-14"
    >
      {/* Aura glow breathing behind the headline numbers */}
      <motion.div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[55%] pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 70% at 50% 0%, rgba(179, 127, 255, 0.25), transparent 70%)",
        }}
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: [0.12, 0.22, 0.12] } : {}}
        transition={
          inView
            ? { duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.6 }
            : { duration: 0.8, ease: EASE }
        }
      />

      {/* Headline numbers. Size is the final string, so the count-up cannot reflow the slide. */}
      <div className="relative shrink-0 grid grid-cols-3 items-start gap-x-3 @xl:gap-x-16">
        {numbers.map((number, index) => (
          <motion.div
            key={number.id}
            initial={{ opacity: 0 }}
            animate={played ? { opacity: 1 } : {}}
            transition={{
              duration: 0.6,
              delay: 0.05 + index * 0.08,
              ease: EASE,
            }}
            className={`min-w-0 flex flex-col gap-2 @xl:gap-3 ${
              index > 0
                ? "pl-3 @xl:pl-16 border-l-2 border-dashed border-accent/50"
                : ""
            }`}
          >
            {number.id === "n3" ? (
              <>
                <div className="@xl:hidden">
                  <CountUpStat
                    value="$12k"
                    active={played}
                    delay={0.15 + index * 0.1}
                    className="max-w-full font-heading font-bold text-foreground leading-none text-4xl"
                    style={{ letterSpacing: "-0.02em" }}
                  />
                </div>
                <div className="hidden @xl:block">
                  <CountUpStat
                    value={number.value}
                    active={played}
                    delay={0.15 + index * 0.1}
                    className="max-w-full font-heading font-bold text-foreground leading-none text-[96px]"
                    style={{ letterSpacing: "-0.02em" }}
                  />
                </div>
              </>
            ) : (
              <CountUpStat
                value={number.value}
                active={played}
                delay={0.15 + index * 0.1}
                className="max-w-full font-heading font-bold text-foreground leading-none text-4xl @xl:text-[96px]"
                style={{ letterSpacing: "-0.02em" }}
              />
            )}
            <TextContent
              as="span"
              content={number.unit}
              className="font-heading text-muted text-sm @xl:text-3xl"
              data-content-keys={[`numbers.rows.${index}.unit`]}
            />
          </motion.div>
        ))}
      </div>

      <TextContent
        content={blocks.prizeNote.content}
        className="relative mt-4 @xl:mt-5 shrink-0 text-muted text-sm @xl:text-2xl"
        data-content-keys={["prizeNote"]}
      />

      {/* Claims stay in place and only fade in. */}
      <div className="relative flex-1 min-h-0 flex flex-col justify-center">
        {claims.map((claim, index) => {
          const rowDelay = 0.7 + index * 0.16;
          return (
            <div key={claim.id} className="relative py-3 @xl:py-5">
              {index > 0 && (
                <div
                  aria-hidden
                  className="absolute top-0 left-0 right-0 h-px border-t border-dashed border-accent/25"
                />
              )}
              <motion.div
                initial={{ opacity: 0 }}
                animate={played ? { opacity: 1 } : {}}
                transition={{ duration: 0.6, delay: rowDelay, ease: EASE }}
              >
                <TextContent
                  content={claim.text}
                  className="block text-muted text-xl @xl:text-[64px] font-normal leading-tight @xl:leading-[1.15] [&_strong]:text-foreground [&_strong]:font-semibold"
                  data-content-keys={[`claims.rows.${index}.text`]}
                  style={{ letterSpacing: "-0.01em" }}
                />
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
