/**
 * Special Callouts - Icon Picker Modal
 * Fuzzy search modal for selecting icons
 */

import { App, FuzzySuggestModal, getIconIds, setIcon } from 'obsidian';

let cachedIconIds: string[] | null = null;

export class IconPickerModal extends FuzzySuggestModal<string> {
    onChoose: (icon: string) => void;

    constructor(app: App, onChoose: (icon: string) => void) {
        super(app);
        this.onChoose = onChoose;
        this.setPlaceholder('Search for an icon... (e.g. star, pencil, flame)');
    }

    getItems(): string[] {
        if (!cachedIconIds) {
            cachedIconIds = getIconIds();
        }
        return cachedIconIds;
    }

    getItemText(icon: string): string {
        return icon;
    }

    renderSuggestion(match: { item: string }, el: HTMLElement): void {
        const icon = match.item;
        el.addClass('sc-icon-item');

        const iconContainer = el.createDiv();
        iconContainer.addClass('sc-icon-container');

        setIcon(iconContainer, icon);

        const textDiv = el.createDiv({ text: icon });
        textDiv.addClass('sc-font-sm');
    }

    onChooseItem(icon: string, _evt: MouseEvent | KeyboardEvent): void {
        this.onChoose(icon);
    }
}
