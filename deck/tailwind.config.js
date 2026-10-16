import containerQueries from "@tailwindcss/container-queries";
import typography from "@tailwindcss/typography";

/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        body: ["var(--font-body)", "sans-serif"],
        heading: ["var(--font-heading)", "monospace", "sans-serif"],
        accent: ["var(--font-accent)", "sans-serif"],
      },
      colors: {"border":"rgb(from var(--border) r g b / <alpha-value>)","input":"rgb(from var(--input) r g b / <alpha-value>)","ring":"rgb(from var(--ring) r g b / <alpha-value>)","background":"rgb(from var(--background) r g b / <alpha-value>)","foreground":"rgb(from var(--foreground) r g b / <alpha-value>)","primary":{"DEFAULT":"rgb(from var(--primary) r g b / <alpha-value>)","foreground":"rgb(from var(--primary-foreground) r g b / <alpha-value>)"},"secondary":{"DEFAULT":"rgb(from var(--secondary) r g b / <alpha-value>)","foreground":"rgb(from var(--secondary-foreground) r g b / <alpha-value>)"},"destructive":{"DEFAULT":"rgb(from var(--destructive) r g b / <alpha-value>)","foreground":"rgb(from var(--destructive-foreground) r g b / <alpha-value>)"},"muted":{"DEFAULT":"rgb(from var(--muted) r g b / <alpha-value>)","foreground":"rgb(from var(--muted-foreground) r g b / <alpha-value>)"},"accent":{"DEFAULT":"rgb(from var(--accent) r g b / <alpha-value>)","foreground":"rgb(from var(--accent-foreground) r g b / <alpha-value>)"},"popover":{"DEFAULT":"rgb(from var(--popover) r g b / <alpha-value>)","foreground":"rgb(from var(--popover-foreground) r g b / <alpha-value>)"},"card":{"DEFAULT":"rgb(from var(--card) r g b / <alpha-value>)","foreground":"rgb(from var(--card-foreground) r g b / <alpha-value>)"},"surface":"rgb(from var(--surface) r g b / <alpha-value>)","overlay":"rgb(from var(--overlay) r g b / <alpha-value>)","accent-soft":"rgb(from var(--accent-soft) r g b / <alpha-value>)","label":"rgb(from var(--label) r g b / <alpha-value>)","note":"rgb(from var(--note) r g b / <alpha-value>)"},
      borderRadius: {
        sm: "calc(var(--radius) - 6px)",
        DEFAULT: "calc(var(--radius) - 4px)",
        md: "calc(var(--radius) - 2px)",
        lg: "var(--radius)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
        "3xl": "calc(var(--radius) + 12px)",
      },
    },
  },
  plugins: [containerQueries, typography],
};
