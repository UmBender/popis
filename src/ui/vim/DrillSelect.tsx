import type { ReactNode } from "react";

/** The choice between the motion drill and the edit drill, shared by both screens. */
export function DrillSelect({
  value,
  onChange,
}: {
  readonly value: "motion" | "edit";
  readonly onChange: (drill: "motion" | "edit") => void;
}): ReactNode {
  return (
    <>
      <label htmlFor="vim-drill">Treino</label>
      <select
        id="vim-drill"
        value={value}
        onChange={(e) => {
          onChange(e.target.value === "edit" ? "edit" : "motion");
        }}
      >
        <option value="motion">Movimento</option>
        <option value="edit">Edição</option>
      </select>
    </>
  );
}
