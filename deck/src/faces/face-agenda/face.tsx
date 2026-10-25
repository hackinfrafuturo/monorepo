import "./face.css";
import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { blocks as sourceBlocks } from "./face.content.json";
import { useLocalized } from "@/i18n/use-localized";
import { TextContent } from "@/components/ui/text-content";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const DAYS = ["saturday", "sunday"] as const;

export default function AgendaFace() {
  const blocks = useLocalized(sourceBlocks);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const reducedMotion = useReducedMotion();

  return (
    <div ref={ref} className="agenda-face bg-background font-body text-foreground">
      <motion.header
        initial={reducedMotion ? false : { opacity: 0, y: 14 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: EASE }}
        className="agenda-header"
      >
        <h1>
          <TextContent
            as="span"
            content={blocks.title.content}
            className="agenda-title font-heading font-bold"
            data-content-keys={["title"]}
          />
        </h1>
        <TextContent
          content={blocks.subtitle.content}
          className="agenda-subtitle text-muted"
          data-content-keys={["subtitle"]}
        />
      </motion.header>

      <div className="agenda-days">
        {DAYS.map((day, dayIndex) => (
          <motion.section
            key={day}
            aria-labelledby={`agenda-${day}`}
            initial={reducedMotion ? false : { opacity: 0, y: 26 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.15 + dayIndex * 0.12, ease: EASE }}
            className="agenda-day"
          >
            <div className="agenda-day-heading">
              <h2 id={`agenda-${day}`}>
                <TextContent
                  as="span"
                  content={blocks[`${day}Title`].content}
                  className="font-heading font-bold"
                  data-content-keys={[`${day}Title`]}
                />
              </h2>
              <TextContent
                content={blocks[`${day}Hours`].content}
                className="agenda-hours text-muted"
                data-content-keys={[`${day}Hours`]}
              />
            </div>

            <ol className="agenda-rows">
              {blocks[day].rows.map((row, index) => (
                <li key={row.id} className="agenda-row">
                  <TextContent
                    content={row.time}
                    className="agenda-time text-accent-soft"
                    data-content-keys={[`${day}.rows.${index}.time`]}
                  />
                  <div className="agenda-activity">
                    <TextContent
                      content={row.activity}
                      className="agenda-label font-semibold"
                      data-content-keys={[`${day}.rows.${index}.activity`]}
                    />
                    {row.detail && (
                      <TextContent
                        content={row.detail}
                        className="agenda-detail text-muted"
                        data-content-keys={[`${day}.rows.${index}.detail`]}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </motion.section>
        ))}
      </div>

      <TextContent
        content={blocks.note.content}
        className="agenda-note text-muted"
        data-content-keys={["note"]}
      />
    </div>
  );
}
