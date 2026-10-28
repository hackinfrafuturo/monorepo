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

function Cell({
  value,
  path,
  highlight,
  color,
}: {
  value: string;
  path: string;
  highlight: boolean;
  color: string;
}) {
  const check = isCheck(value);
  return (
    <div
      className={`flex items-center justify-center text-center self-stretch ${
        highlight ? "bp-col-hi" : ""
      }`}
      style={{ backgroundColor: `${color}12` }}
    >
      {check ? (
        <Check
          className="h-4 w-4 @xl:h-8 @xl:w-8"
          style={{ color }}
          strokeWidth={2.5}
        />
      ) : value.trim() !== "" ? (
        <TextContent
          content={value}
          className="text-muted text-sm @xl:text-2xl font-normal tabular-nums"
          data-content-keys={[path]}
        />
      ) : null}
    </div>
  );
}

export default function ComparePlansFace() {
  const blocks = useLocalized(sourceBlocks);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.2 });
  const highlight = (controls.highlightPlan?.value ?? "None") as string;

  const rows = blocks.rows.rows;
  const plans = [
    { key: "plan1", col: "col1", name: blocks.plan1.content },
    { key: "plan2", col: "col2", name: blocks.plan2.content },
    { key: "plan3", col: "col3", name: blocks.plan3.content },
  ] as const;

  const gridTemplate = "1.6fr 1fr 1fr 1fr";

  return (
    <div
      ref={ref}
      className="relative w-full h-full overflow-hidden bg-background font-body flex flex-col px-6 py-7 @xl:px-16 @xl:py-12"
    >
      {/* Title */}
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

      {/* Phone: one card per tier. The comparison table is too narrow to read. */}
      <div className="mt-4 flex min-h-0 flex-1 flex-col @xl:hidden">
        <TextContent
          content={blocks.description.content}
          className="shrink-0 text-[13px] leading-snug text-muted [&_strong]:text-foreground"
          data-content-keys={["description"]}
        />
        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
          {plans.map((plan, planIndex) => {
            const included = rows.filter((row) => isCheck(row[plan.col]));
            return (
              <section
                key={plan.key}
                className="shrink-0 border-t-2 pt-2"
                style={{ borderColor: TIER_COLORS[planIndex] }}
              >
                <TextContent
                  content={plan.name}
                  className="shrink-0 font-bold uppercase tracking-[0.12em] text-sm"
                  style={{ color: TIER_COLORS[planIndex] }}
                  data-content-keys={[plan.key]}
                />
                <ul className="mt-1 min-h-0">
                  {included.map((row) => {
                    const rowIndex = rows.indexOf(row);
                    return (
                      <li key={row.id} className="flex items-start gap-1.5 py-0.5">
                        <Check
                          className="mt-0.5 h-3.5 w-3.5 shrink-0"
                          style={{ color: TIER_COLORS[planIndex] }}
                          strokeWidth={2.5}
                        />
                        <TextContent
                          as="span"
                          content={row.feature}
                          className="text-[13px] leading-4 text-foreground"
                          data-content-keys={[`rows.rows.${rowIndex}.feature`]}
                        />
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </div>

      {/* Desktop comparison table */}
      <div className="mt-6 hidden min-h-0 flex-1 flex-col @xl:mt-12 @xl:flex">
        {/* Header row: description + plan names, each plan anchored by its tier color */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="grid items-stretch gap-3 @xl:gap-6 pb-4 @xl:pb-7 border-b border-accent/40"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          <TextContent
            content={blocks.description.content}
            className="text-muted text-sm @xl:text-2xl font-normal leading-snug max-w-[46ch] pr-2 [&_strong]:text-foreground"
            data-content-keys={["description"]}
          />
          {plans.map((plan, planIndex) => (
            <div
              key={plan.key}
              className={`flex items-center justify-center py-1 ${
                highlight === plan.name
                  ? "bp-col-hi border-2 border-dashed border-accent/70"
                  : ""
              }`}
              style={{
                borderTop: `3px solid ${TIER_COLORS[planIndex]}`,
                backgroundColor: `${TIER_COLORS[planIndex]}12`,
              }}
            >
              <TextContent
                content={plan.name}
                className="font-bold uppercase tracking-[0.14em] text-lg @xl:text-3xl"
                style={{ color: TIER_COLORS[planIndex] }}
                data-content-keys={[plan.key]}
              />
            </div>
          ))}
        </motion.div>

        {/* Rows: tier-colored checks, quiet dashes, faint column tint */}
        <div className="flex-1 min-h-0 flex flex-col justify-around">
          {rows.map((row, index) => (
            <motion.div
              key={row.id}
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: 0.24 + index * 0.07, ease: EASE }}
              className="grid items-stretch gap-3 @xl:gap-6 border-b border-dashed border-accent/40"
              style={{ gridTemplateColumns: gridTemplate }}
            >
              <div className="flex items-center py-2.5 @xl:py-4">
                <TextContent
                  content={row.feature}
                  className="text-foreground text-sm @xl:text-2xl font-normal leading-tight"
                  data-content-keys={[`rows.rows.${index}.feature`]}
                />
              </div>
              <Cell
                value={row.col1}
                path={`rows.rows.${index}.col1`}
                highlight={highlight === blocks.plan1.content}
                color={TIER_COLORS[0]}
              />
              <Cell
                value={row.col2}
                path={`rows.rows.${index}.col2`}
                highlight={highlight === blocks.plan2.content}
                color={TIER_COLORS[1]}
              />
              <Cell
                value={row.col3}
                path={`rows.rows.${index}.col3`}
                highlight={highlight === blocks.plan3.content}
                color={TIER_COLORS[2]}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
