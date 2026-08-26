# Multi-Callout Dashboards & Grid Math

## 1. Concept & Container Structure

A multi-callout dashboard groups multiple sub-callouts inside an invisible outer container:

```markdown
> [!multi-callout]
>> [!info] (1-2:2:1, bg:#7c4dff, neon:cyan, icon:sparkles) Hero Banner
>> Main featured section spanning top row...
>>
>> [!tip] (1:2:2, bg:#00e676, icon:flame) Feature Column A
>> Details for feature A...
>>
>> [!note] (2:2:2, bg:#448aff, icon:pencil) Feature Column B
>> Details for feature B...
```

The outer `[!multi-callout]` acts as a CSS flex/grid layout wrapper, while each inner sub-callout defines its placement using the **Position Token**.

---

## 2. The Position Token Math

The position token follows the structure `Position:Columns[:Row]`:

$$\text{Format: } \text{colStart}[-\text{colEnd}] : \text{totalColumns} [: \text{rowStart}[-\text{rowEnd}]]$$

### Examples & Breakdown

1. `(1:2)`: Column 1 of 2 (Left half, 50% width).
2. `(2:2)`: Column 2 of 2 (Right half, 50% width).
3. `(1-2:2:1)`: Spans column 1 to 2 across a 2-column grid, pinned to Row 1 (100% width hero banner).
4. `(1:3:2)`: Column 1 of 3, placed in Row 2 (33.3% width).

### Layout Width Calculation
$$\text{Width \%} = \frac{\text{colSpan}}{\text{totalColumns}} \times 100\% - \text{gapOffset}$$

In CSS flex layout:
```css
flex: 1 1 calc(100% * (colSpan / totalCols) - 10px);
max-width: calc(100% * (colSpan / totalCols));
```

---

## 3. Visual Presets & Matrix Generator

The plugin includes high-productivity preset templates configured in [MultiColumnBuilderModal.ts](file:///r:/Obsidian/Testsub1/.obsidian/plugins/special-callouts/src/modals/MultiColumnBuilderModal.ts):

| Preset Key | Structure | Layout Matrix |
| :--- | :--- | :--- |
| `hero_2` | Top Full Hero + Bottom 2 Columns | `['area1', 'area1']`, `['area2', 'area3']` |
| `header_sidebar` | Top Header + Left Sidebar + Right Workspace | `['area1', 'area1', 'area1']`, `['area2', 'area3', 'area3']` |
| `cols_3` | 3 Equal Columns | `['area1', 'area2', 'area3']` |
| `grid_4` | 2x2 Quadrant Grid | `['area1', 'area2']`, `['area3', 'area4']` |
| `feature_3` | Top Hero + 3 Bottom Feature Cards | `['area1', 'area1', 'area1']`, `['area2', 'area3', 'area4']` |

---

## 4. Mobile Responsiveness

On viewports $\le 600\text{px}$, the outer flex container automatically switches to `flex-direction: column`, collapsing all sub-callouts to clean full-width cards (`100% width`) without horizontal overflow.
