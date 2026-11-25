import type { ReactNode } from "react";
import type { Lang } from "../ref/model";

type Props = {
  readonly lang: Lang;
};

/** The reader of one language of the reference (T46 AC-5, ADR-T46-1). */
export function RefScreen({ lang }: Props): ReactNode {
  void lang;
  throw new Error("todo");
}
