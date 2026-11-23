// @vitest-environment jsdom
// Bug: focusing a block of the Vim optimal preview inserted its description
// line above the code; on a scrolled page the browser's scroll anchoring
// moved the block up under the pointer, the mouse-up landed on the
// description and the click never opened the lesson. The description line
// must exist before any block is active, so showing it does not move layout.
import { fireEvent, render, screen, within } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { OptimalPreview } from "../../src/ui/vim/Preview";
import { parseKeys } from "../../src/vim/keys";
import type { PreviewBlock } from "../../src/vim/preview";

const BLOCK: PreviewBlock = {
  text: "ft",
  keys: parseKeys("ft"),
  helpKey: "f{c}",
  commandKey: "f",
  description: "vai até o próximo caractere na linha",
  lessonId: "motion-find",
  startKeyIndex: 0,
  endKeyIndex: 2,
};

describe("regression T36 preview-desc-layout-shift", () => {
  it("the description line is reserved before a block is active and stays the same node", () => {
    // Arrange
    render(
      createElement(OptimalPreview, { blocks: [BLOCK], matchedKeys: 0, onOpenLesson: () => {} }),
    );
    const reserved = screen.getByTestId("vim-preview-desc");
    const block = within(screen.getByTestId("vim-preview")).getByTestId("vim-preview-block");

    // Act
    fireEvent.focus(block);
    const whileFocused = screen.getByTestId("vim-preview-desc");
    const focusedText = whileFocused.textContent;
    fireEvent.blur(block);

    // Assert
    expect(whileFocused).toBe(reserved);
    expect(focusedText).toContain(BLOCK.description);
    expect(screen.getByTestId("vim-preview-desc")).toBe(reserved);
    expect(reserved.textContent).toBe("");
  });
});
