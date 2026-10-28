import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { blocks as sourceBlocks } from "./face.content.json";
import { useLocalized } from "@/i18n/use-localized";
import { TextContent } from "@/components/ui/text-content";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* Small alternating tilts so each press photo reads as a print pinned to a board */
const PHOTO_TILT = [-1.5, 1.25, -1];

export default function FeatureCardsFace() {
  const blocks = useLocalized(sourceBlocks);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });

  const cards = blocks.cards.rows;
  const hasPhotos = cards.some((card) => card.photo.src !== "");

  return (
    <div
      ref={ref}
      className="relative w-full h-full overflow-hidden bg-background font-body flex flex-col px-6 py-6 @xl:px-16 @xl:py-14"
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
          className="mt-1 @xl:mt-6 font-heading leading-[1.06] text-foreground font-bold text-4xl @xl:text-7xl"
          data-content-keys={["title"]}
          style={{ letterSpacing: "-0.01em" }}
        />
      </motion.div>

      {/* Organizer cards: logo and name up top, aligned bio row, press photo
          filling the card bottom. Photo tops align because the bio row has a
          fixed minimum height. */}
      <div className="mt-4 @xl:mt-10 flex-1 min-h-0 grid grid-cols-1 @xl:grid-cols-3 gap-3 @xl:gap-6">
        {cards.map((card, index) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 28 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 + index * 0.1, ease: EASE }}
            className="bg-surface border border-accent/25 p-3 @xl:p-7 flex flex-col gap-1.5 @xl:gap-4"
          >
            <div className="flex items-center gap-3 @xl:gap-4">
              <div className="w-10 h-10 @xl:w-20 @xl:h-20 shrink-0 rounded-lg @xl:rounded-xl overflow-hidden bg-[#f4f2ee]">
                <img
                  src={card.logo.src}
                  alt={card.title}
                  className="w-full h-full object-contain"
                />
              </div>
              <TextContent
                content={card.title}
                className="text-foreground font-bold text-lg @xl:text-3xl leading-tight"
                data-content-keys={[`cards.rows.${index}.title`]}
                style={{ letterSpacing: "-0.01em" }}
              />
            </div>
            <TextContent
              content={card.description}
              className="text-muted text-[11px] @xl:text-xl @xl:min-h-[11.25rem] font-normal leading-normal @xl:leading-relaxed [&_strong]:text-foreground"
              data-content-keys={[`cards.rows.${index}.description`]}
            />
            {card.photo.src !== "" && (
              <div className="hidden @xl:block w-full flex-1 min-h-0 relative">
                <img
                  src={card.photo.src}
                  alt={card.title}
                  className="absolute inset-0 w-full h-full object-contain shadow-[0_18px_45px_rgba(0,0,0,0.45)]"
                  style={{
                    transform: `rotate(${PHOTO_TILT[index % PHOTO_TILT.length]}deg)`,
                  }}
                />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Compact canvas: press photos as a strip below the cards */}
      {hasPhotos && (
        <div className="@xl:hidden mt-3 shrink-0 grid grid-cols-3 gap-2 h-24">
          {cards.map((card, index) =>
            card.photo.src !== "" ? (
              <div key={card.id} className="relative">
                <img
                  src={card.photo.src}
                  alt={card.title}
                  className="absolute inset-0 w-full h-full object-contain shadow-[0_10px_24px_rgba(0,0,0,0.45)]"
                  style={{
                    transform: `rotate(${PHOTO_TILT[index % PHOTO_TILT.length]}deg)`,
                  }}
                />
              </div>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
