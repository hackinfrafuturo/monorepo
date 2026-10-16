import React from "react";
import { Agentation } from "agentation";
import { NewSlidesLayout } from "@/components/entrypoint-layouts/new-slides-layout";
import { faces } from "@/faces.config.json";
import Face0qe3rfFace from "@/faces/face-0qe3rf/face";
import Facesaep1yFace from "@/faces/face-saep1y/face";
import Facee0ydn6Face from "@/faces/face-e0ydn6/face";
import Faceaqhoq4Face from "@/faces/face-aqhoq4/face";
import Facenilv7tFace from "@/faces/face-nilv7t/face";
import Facelb9xuhFace from "@/faces/face-lb9xuh/face";
import Faceqrrz9gFace from "@/faces/face-qrrz9g/face";
import Face7j2yi8Face from "@/faces/face-7j2yi8/face";
import "@/faces/face-0qe3rf/face.css";
import "@/faces/face-saep1y/face.css";
import "@/faces/face-e0ydn6/face.css";
import "@/faces/face-aqhoq4/face.css";
import "@/faces/face-nilv7t/face.css";
import "@/faces/face-lb9xuh/face.css";
import "@/faces/face-qrrz9g/face.css";
import "@/faces/face-7j2yi8/face.css";

const visibleFaces = faces.filter((face) => !face.hidden);

export const componentMap = {
  "face-0qe3rf": Face0qe3rfFace,
  "face-saep1y": Facesaep1yFace,
  "face-e0ydn6": Facee0ydn6Face,
  "face-aqhoq4": Faceaqhoq4Face,
  "face-nilv7t": Facenilv7tFace,
  "face-lb9xuh": Facelb9xuhFace,
  "face-qrrz9g": Faceqrrz9gFace,
  "face-7j2yi8": Face7j2yi8Face,
};

export const projectConfig = {"layout":"STACKED","slidesDisplay":"CARDS","stackedOrientation":"HORIZONTAL","cardsBackgroundColor":"#16082b","cardsCorners":"SQUARE","mobileCanvas":"COMPACT","tokens":{"palette":[{"name":"--background","value":"#1a0933"},{"name":"--surface","value":"#140727"},{"name":"--overlay","value":"#0e041c"},{"name":"--foreground","value":"#f6f0ff"},{"name":"--accent","value":"#b37fff"},{"name":"--accent-soft","value":"#d8b4fe"},{"name":"--muted","value":"#a396c6"},{"name":"--label","value":"#c49eff"},{"name":"--note","value":"#e2b8ff"}],"fonts":[{"name":"--font-body","family":"Inter"},{"name":"--font-heading","family":"Geist Pixel Circle"},{"name":"--font-accent","family":"Caveat"}]}};

export default function Page() {
  return (
    <>
      <NewSlidesLayout
        faces={visibleFaces}
        componentMap={componentMap}
        layout="STACKED"
        slidesDisplay="CARDS"
        stackedOrientation="HORIZONTAL"
        cardsSlidesPerView={1.08}
        cardsBackgroundColor={"#16082b"}
        cardsBackgroundImage={""}
        cardsCorners="SQUARE"
        mobileCanvas="COMPACT"
      />
      {process.env.NODE_ENV === "development" && <Agentation />}
    </>
  );
}