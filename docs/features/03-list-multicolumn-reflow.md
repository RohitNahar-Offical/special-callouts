# Multi-Column List Reflow (`col:N`)

## 1. Overview & Purpose

Standard markdown lists in callouts can take up unnecessary vertical space. Specifying `col:N` automatically reflows list items into $N$ balanced columns using CSS Grid.

```markdown
> [!tip] (col:3) Project Tasks
> - Setup repository
> - Configure CI/CD
> - Add unit tests
> - Design mockups
> - Implement styles
> - Deploy release
```

---

## 2. The Column Reflow Algorithm

In [src/processor.ts](file:///r:/Obsidian/Testsub1/.obsidian/plugins/special-callouts/src/processor.ts) (`applyColumnsToContainer`):

1. **Item Count & Dimension Math**:
   Let $M$ be the number of list items (`<li>`) and $C$ be the requested column count (`colCount`):
   $$\text{rowCount} = \left\lceil \frac{M}{C} \right\rceil$$
2. **Column Distribution**:
   For the $k$-th item ($0 \le k < M$):
   $$\text{colIndex} = \left\lfloor \frac{k}{\text{rowCount}} \right\rfloor + 1$$
   $$\text{rowIndex} = (k \bmod \text{rowCount}) + 1$$
3. **CSS Custom Properties**:
   Each list item receives:
   ```ts
   liEl.setCssProps({
       '--sc-col': colIndex.toString(),
       '--sc-row': rowIndex.toString()
   });
   liEl.addClass('sc-multi-col-item');
   ```

```css
.sc-multi-col-list {
    display: grid !important;
    grid-template-columns: repeat(var(--sc-list-cols), 1fr) !important;
    grid-auto-flow: column !important;
    gap: 4px 16px !important;
}

.sc-multi-col-item {
    grid-column: var(--sc-col) !important;
    grid-row: var(--sc-row) !important;
}
```

---

## 3. Resilient Asynchronous Handling

Many lists are generated dynamically by third-party plugins:
- **Dataview queries**: ` ```dataview ... ``` `
- **Tasks plugins**: `- [ ] ...`
- **Homepage embeds**

### The Retry Strategy
1. **Immediate Animation Frame**: Checks if `<ul>` / `<ol>` elements are already in the DOM.
2. **120ms Fallback Check**: Catches delayed async renders.
3. **MutationObserver**: Permanently observes `.callout-content` child and character mutations so dynamic filter updates automatically re-balance list columns.
