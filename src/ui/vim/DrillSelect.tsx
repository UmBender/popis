import type { ReactNode } from "react";
import type { VimDrill } from "../../storage/vim";

/** The choice between the motion drill, the edit drill and Aprender, shared by the screens. */
export function DrillSelect({
  value,
  onChange,
}: {
  readonly value: VimDrill;
  readonly onChange: (drill: VimDrill) => void;
}): ReactNode {
  return (
    <>
      <label htmlFor="vim-drill">Treino</label>
      <select
        id="vim-drill"
        value={value}
        onChange={(e) => {
          const chosen = e.target.value;
          onChange(chosen === "edit" || chosen === "learn" ? chosen : "motion");
        }}
      >
        <option value="motion">Movimento</option>
        <option value="edit">Edição</option>
        <option value="learn">Aprender</option>
      </select>
    </>
  );
}
