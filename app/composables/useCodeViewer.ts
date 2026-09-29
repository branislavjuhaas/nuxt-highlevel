export interface CodeTarget {
  path: string;
  /** 1-based lines to highlight, the first one is scrolled into view. */
  lines: number[];
  /** What the highlighted lines use, shown as a subtitle. */
  names?: string[];
}

/** The file shown in the code viewer modal, if any. */
export function useCodeViewer() {
  const target = useState<CodeTarget | undefined>("code-viewer", () => undefined);
  const show = (value: CodeTarget) => (target.value = value);
  return { target, show };
}
