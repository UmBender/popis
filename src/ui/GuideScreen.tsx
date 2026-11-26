import type { ReactNode } from "react";
import type { GuideLink } from "../guide/content";
import type { KeyValueStore } from "../storage/history";

export type GuideScreenProps = {
  readonly store: KeyValueStore;
  readonly onOpenLink: (link: GuideLink) => void;
};

export function GuideScreen(_props: GuideScreenProps): ReactNode {
  throw new Error("todo");
}
