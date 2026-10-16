import "./face.css";
import React, { useRef } from "react";
import { motion, useInView } from "motion/react";
import { blocks } from "./face.content.json";
import { TextContent } from "@/components/ui/text-content";
import CountUpStat from "@/components/ui/count-up-stat";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const DROP_SHADOW =
  "shadow-[0_22px_50px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:scale-[1.15]";

function DroppedPhoto({
  src,
  inView,
  delay,
  box,
  spot,
  rotate,
  hiddenOnCompact,
}: {
  src: string;
  inView: boolean;
  delay: number;
  box: string;
  spot: string;
  rotate: number;
  hiddenOnCompact?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -110, rotate: rotate * 2 }}
      animate={inView ? { opacity: 1, y: 0, rotate } : {}}
      transition={{ duration: 1, delay, ease: EASE }}
      className={`absolute group hover:z-30 cursor-zoom-in ${box} ${spot} ${
        hiddenOnCompact ? "hidden @xl:block" : ""
      }`}
    >
      <img src={src} alt="" className={`h-full w-full object-cover ${DROP_SHADOW}`} />
    </motion.div>
  );
}

function DroppedVideo({
  src,
  inView,
  delay,
  box,
  spot,
  rotate,
}: {
  src: string;
  inView: boolean;
  delay: number;
  box: string;
  spot: string;
  rotate: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -110, rotate: rotate * 2 }}
      animate={inView ? { opacity: 1, y: 0, rotate } : {}}
      transition={{ duration: 1, delay, ease: EASE }}
      className={`absolute group hover:z-30 cursor-zoom-in ${box} ${spot}`}
    >
      <video
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className={`h-full w-full object-cover object-right ${DROP_SHADOW}`}
      />
    </motion.div>
  );
}

export default function RecapFace() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35, once: true });

  const stats = blocks.stats.rows;
  const photos = blocks.photos.rows;

  return (
    <div
      ref={ref}
      className="relative w-full h-full overflow-hidden bp-grid text-foreground font-body flex flex-col px-6 py-6 @xl:px-16 @xl:py-12"
    >
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: EASE }}
        className="shrink-0"
      >
        <TextContent
          content={blocks.title.content}
          className="font-heading font-bold text-foreground text-3xl @xl:text-7xl leading-[1.06]"
          data-content-keys={["title"]}
          style={{ letterSpacing: "-0.01em" }}
        />
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, delay: 0.12, ease: EASE }}
        className="shrink-0 mt-6 @xl:mt-12 grid grid-cols-3 gap-3 @xl:gap-10 border-t-2 border-dashed border-accent/50 pt-4 @xl:pt-10"
      >
        {stats.map((stat, index) => (
          <div
            key={stat.id}
            className={`flex flex-col min-w-0 ${
              index > 0 ? "border-l border-dashed border-accent/25 pl-3 @xl:pl-10" : ""
            }`}
          >
            <CountUpStat
              value={stat.value}
              active={inView}
              delay={0.3 + index * 0.12}
              className="font-heading font-bold text-foreground leading-none text-[26px] @xl:text-[104px]"
              style={{ letterSpacing: "-0.02em" }}
            />
            <TextContent
              content={stat.label}
              className="mt-2 @xl:mt-5 text-muted text-xs @xl:text-2xl font-normal leading-snug"
              data-content-keys={[`stats.rows.${index}.label`]}
            />
          </div>
        ))}
      </motion.div>

      {/* Winners + sponsors */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, delay: 0.5, ease: EASE }}
        className="shrink-0 mt-5 @xl:mt-10 border-t border-dashed border-accent/25 pt-3 @xl:pt-8"
      >
        <TextContent
          content={blocks.winners.content}
          className="text-muted text-xs @xl:text-2xl font-normal leading-snug [&_strong]:text-foreground"
          data-content-keys={["winners"]}
        />
        <TextContent
          content={blocks.sponsors.content}
          className="mt-1 @xl:mt-3 text-muted text-xs @xl:text-2xl font-normal leading-snug [&_strong]:text-foreground"
          data-content-keys={["sponsors"]}
        />
      </motion.div>

      {/* Dropped media pile at the bottom edge */}
      <div className="relative flex-1 min-h-0 mt-4 @xl:mt-6">
        <DroppedPhoto
          src={photos[0].src}
          inView={inView}
          delay={0.5}
          rotate={-6}
          box="h-24 aspect-[4/3] @xl:h-[286px]"
          spot="left-0 bottom-[-14px] @xl:bottom-[-28px]"
        />
        <DroppedPhoto
          src={photos[1].src}
          inView={inView}
          delay={0.6}
          rotate={5}
          box="h-20 aspect-square @xl:h-[264px]"
          spot="@xl:left-[12%] @xl:bottom-[-4px]"
          hiddenOnCompact
        />
        <DroppedPhoto
          src={photos[4].src}
          inView={inView}
          delay={0.7}
          rotate={-8}
          box="h-24 aspect-[3/4] @xl:h-[308px]"
          spot="@xl:left-[26%] @xl:bottom-[-30px]"
          hiddenOnCompact
        />
        <DroppedVideo
          src={blocks.video.src}
          inView={inView}
          delay={0.8}
          rotate={-3}
          box="h-24 aspect-video @xl:h-[330px]"
          spot="left-[30%] bottom-[-20px] @xl:left-[40%] @xl:bottom-[-36px]"
        />
        <DroppedPhoto
          src={photos[6].src}
          inView={inView}
          delay={0.9}
          rotate={6}
          box="aspect-[4/3] @xl:h-[330px]"
          spot="@xl:left-[62%] @xl:bottom-[-10px]"
          hiddenOnCompact
        />
        <DroppedPhoto
          src={photos[2].src}
          inView={inView}
          delay={1}
          rotate={8}
          box="h-24 aspect-[3/4] @xl:h-[286px]"
          spot="@xl:left-[76%] @xl:bottom-[-26px]"
          hiddenOnCompact
        />
        <DroppedPhoto
          src={photos[5].src}
          inView={inView}
          delay={1.1}
          rotate={-5}
          box="h-20 aspect-square @xl:h-[242px]"
          spot="left-[64%] bottom-[-10px] @xl:left-[86%] @xl:bottom-[-44px]"
        />
        <DroppedPhoto
          src={photos[3].src}
          inView={inView}
          delay={1.2}
          rotate={3}
          box="aspect-[4/3] @xl:h-[286px]"
          spot="@xl:left-[93%] @xl:bottom-[-20px]"
          hiddenOnCompact
        />
      </div>
    </div>
  );
}
