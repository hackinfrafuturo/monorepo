import "./face.css";
import React, { useRef } from "react";
import { motion, useInView } from "motion/react";
import { blocks } from "./face.content.json";
import { TextContent } from "@/components/ui/text-content";
import CountUpStat from "@/components/ui/count-up-stat";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function EventStatsFace() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });

  const numbers = blocks.numbers.rows;
  const claims = blocks.claims.rows;

  return (
    <div
      ref={ref}
      className="relative w-full h-full overflow-hidden bp-grid text-foreground font-body flex flex-col px-6 py-8 @xl:px-16 @xl:py-14"
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

      {/* Headline numbers */}
      <div className="relative shrink-0 grid grid-cols-3 gap-x-3 @xl:flex @xl:items-baseline @xl:gap-x-16">
        {numbers.map((number, index) => (
          <motion.div
            key={number.id}
            initial={{ opacity: 0, y: 60 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{
              duration: 1.3,
              delay: 0.15 + index * 0.15,
              ease: EASE,
            }}
            className={`flex flex-col @xl:flex-row @xl:items-baseline gap-2 @xl:gap-5 ${
              index > 0
                ? "pl-3 @xl:pl-16 border-l-2 border-dashed border-accent/50"
                : ""
            }`}
          >
            <CountUpStat
              value={number.value}
              active={inView}
              delay={0.35 + index * 0.15}
              className="font-heading font-bold text-foreground leading-none text-4xl @xl:text-[150px]"
              style={{ letterSpacing: "-0.02em" }}
            />
            <TextContent
              as="span"
              content={number.unit}
              className="font-heading text-muted text-sm @xl:text-4xl"
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

      {/* Claims: each line rises from behind its hairline */}
      <div className="relative flex-1 min-h-0 flex flex-col justify-center">
        {claims.map((claim, index) => {
          const rowDelay = 0.7 + index * 0.16;
          return (
            <div key={claim.id} className="relative py-3 @xl:py-5">
              {index > 0 && (
                <motion.div
                  aria-hidden
                  initial={{ scaleX: 0 }}
                  animate={inView ? { scaleX: 1 } : {}}
                  transition={{ duration: 1.1, delay: rowDelay - 0.25, ease: EASE }}
                  className="absolute top-0 left-0 right-0 h-px border-t border-dashed border-accent/25 origin-left"
                />
              )}
              <div className="overflow-hidden">
                <motion.div
                  initial={{ y: "110%" }}
                  animate={inView ? { y: "0%" } : {}}
                  transition={{ duration: 1.15, delay: rowDelay, ease: EASE }}
                >
                  <TextContent
                    content={claim.text}
                    className="block text-muted text-xl @xl:text-[64px] font-normal leading-tight @xl:leading-[1.15] [&_strong]:text-foreground [&_strong]:font-semibold"
                    data-content-keys={[`claims.rows.${index}.text`]}
                    style={{ letterSpacing: "-0.01em" }}
                  />
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
