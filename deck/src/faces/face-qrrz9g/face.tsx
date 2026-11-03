import "./face.css";
import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { Check } from "lucide-react";
import { blocks as sourceBlocks } from "./face.content.json";
import { useLocalized } from "@/i18n/use-localized";
import { controls } from "./face.controls.json";
import { TextContent } from "@/components/ui/text-content";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* Tier identity: one metal color per plan column */
const TIER_COLORS = ["#e0975f", "#cfd2dd", "#f5c451"];

function isCheck(value: string) {
  const v = (value || "").trim().toLowerCase();
  return v === "✓" || v === "true" || v === "yes" || v === "check";
}

/* Three cards, one per tier. Each lists only what that tier adds; a row is ticked in the tier that introduces it. */
export default function ComparePlansFace() {
  const blocks = useLocalized(sourceBlocks);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.2 });
  const highlight = (controls.highlightPlan?.value ?? "None") as string;

  const rows = blocks.rows.rows;
  const plans = [
    { key: "plan1", col: "col1", name: blocks.plan1, tagline: blocks.tagline1, plus: blocks.plus1, n: 1 },
    { key: "plan2", col: "col2", name: blocks.plan2, tagline: blocks.tagline2, plus: blocks.plus2, n: 2 },
    { key: "plan3", col: "col3", name: blocks.plan3, tagline: blocks.tagline3, plus: blocks.plus3, n: 3 },
  ] as const;

  return (
    <div
      ref={ref}
      className="relative w-full h-full overflow-hidden bg-background font-body flex flex-col px-6 py-7 @xl:px-16 @xl:py-12"
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: EASE }}
        className="relative shrink-0"
      >
        <TextContent
          content={blocks.title.content}
          className="font-heading mt-3 @xl:mt-5 leading-[1.08] text-foreground font-bold text-4xl @xl:text-7xl"
          data-content-keys={["title"]}
          style={{ letterSpacing: "-0.01em" }}
        />
      </motion.div>

      <div className="mt-4 @xl:mt-10 grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto @xl:grid-cols-3 @xl:gap-6 @xl:overflow-visible">
        {plans.map((plan, planIndex) => {
          const color = TIER_COLORS[planIndex];
          const added = rows.filter((row) => isCheck(row[plan.col]));
          const highlighted = highlight === plan.name.content;
          return (
            <motion.section
              key={plan.key}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.15 + planIndex * 0.1, ease: EASE }}
              className={`flex shrink-0 flex-col px-4 py-3 @xl:px-9 @xl:py-9 ${
                highlighted ? "bp-col-hi border-2 border-dashed border-accent/70" : ""
              }`}
              style={{ borderTop: `3px solid ${color}`, backgroundColor: `${color}12` }}
            >
              <TextContent
                content={plan.name.content}
                className="font-bold uppercase tracking-[0.14em] text-sm @xl:text-3xl"
                style={{ color }}
                data-content-keys={[plan.key]}
              />
              <TextContent
                content={plan.tagline.content}
                className="mt-1 @xl:mt-2 font-heading font-bold text-foreground text-xl leading-tight @xl:text-5xl"
                data-content-keys={[`tagline${plan.n}`]}
              />
              <TextContent
                content={plan.plus.content}
                className="mt-2 @xl:mt-6 text-[13px] @xl:text-2xl text-muted"
                data-content-keys={[`plus${plan.n}`]}
              />
              <ul className="mt-1 @xl:mt-4 flex flex-col gap-1 @xl:gap-3">
                {added.map((row) => {
                  const rowIndex = rows.indexOf(row);
                  return (
                    <li key={row.id} className="flex items-start gap-1.5 @xl:gap-3">
                      <Check
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 @xl:mt-0.5 @xl:h-6 @xl:w-6"
                        style={{ color }}
                        strokeWidth={2.5}
                      />
                      <TextContent
                        as="span"
                        content={row.feature}
                        className="text-[13px] leading-4 @xl:text-2xl @xl:leading-snug text-foreground"
                        data-content-keys={[`rows.rows.${rowIndex}.feature`]}
                      />
                    </li>
                  );
                })}
              </ul>
            </motion.section>
          );
        })}
      </div>
    </div>
  );
}
