/**
 * Special Callouts - Metadata Reference Modal
 * Shows all available metadata parameters using Obsidian's safe Modal API
 */

import { App, Modal } from 'obsidian';

/**
 * Creates and displays the metadata reference modal
 */
export function showMetadataReference(app: App): void {
    new MetadataReferenceModal(app).open();
}

class MetadataReferenceModal extends Modal {
    constructor(app: App) {
        super(app);
        this.titleEl.setText('Metadata Reference & Cheat Sheet');
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('special-callouts-ui');
        contentEl.addClass('sc-metadata-modal');

        // Colors
        this.createTable(contentEl, '🎨 Colors', [
            ['bg:red or bg:#ff0000', 'Background color (tinted 15%)'],
            ['text:white or text:#fff', 'Content text color'],
            ['title:cyan or title:#00e5ff', 'Title text color'],
            ['link:orange or link:#ff9800', 'Link color inside callout'],
            ['icon-color:gold', 'Override icon color separately from title'],
        ]);

        // Typography
        this.createTable(contentEl, 'Aa Typography', [
            ['font:mono', 'Monospace font family'],
            ['font:serif', 'Serif font family'],
            ['font:hand', 'Handwritten cursive font'],
            ['font:marker', 'Chalkboard marker font'],
            ['font-size:1 to 5', 'Font size multiplier (3 is default 1.0em)'],
        ]);

        // Text Outline / Borders
        this.createTable(contentEl, '✨ Text Outline & Readability Strokes', [
            ['text:dark-border', 'Dark readability stroke around text'],
            ['text:light-border', 'Light readability stroke around text'],
            ['text:(white, dark-border)', 'Grouped syntax: text color + outline stroke'],
            ['title:(cyan, dark-border)', 'Grouped syntax for callout title'],
        ]);

        // Borders & Visual Effects
        this.createTable(contentEl, '🎨 Borders & Visual Effects', [
            ['border:red or border:#ff5722', 'Border color'],
            ['border:none', 'Remove callout borders entirely'],
            ['border-width:2 or border-width:4px', 'Custom border thickness'],
            ['border-style:dashed', 'Border styles: dashed, dotted, double, solid'],
            ['radius:16', 'Corner roundness in pixels (0 to 30px)'],
            ['neon:#00f2ff', 'Cyber illuminated neon border with radiant glow'],
            ['no-icon', 'Hide the callout icon completely'],
        ]);

        // Layout & Structure
        this.createTable(contentEl, '📊 Layout & Columns', [
            ['col:2 or col:3', 'Multi-column list layout inside callout'],
            ['compact', 'Tighter padding for lists & dense notes'],
            ['dense', 'Compact padding + tighter line height'],
            ['center', 'Center align all content and title'],
            ['title:center', 'Center align title only while keeping content left-aligned'],
            ['1:2 or 1:3', 'Inline Dashboard Grid (position : columns)'],
            ['1:3:2', 'Grid layout: position 1 of 3 columns, row 2'],
        ]);

        // Example box
        const exampleBox = contentEl.createDiv();
        exampleBox.addClass('sc-modal-info-box');
        exampleBox.createEl('strong', { text: '💡 Example Usage:' });
        const exPre = exampleBox.createEl('pre');
        exPre.setText('> [!note|bg:#1a1a2e,neon:#00f2ff,radius:12,compact] Cyber Note\n> > [!tip] (1:2)\n> > Left Column\n> > [!warning] (2:2)\n> > Right Column');

        // Pro tip box
        const tipBox = contentEl.createDiv();
        tipBox.addClass('sc-modal-info-box');
        tipBox.createEl('strong', { text: '⚡ Pro Tip: ' });
        tipBox.appendText('You can use metadata inside native pipes ');
        tipBox.createEl('code', { text: '>[!note|bg:red]' });
        tipBox.appendText(' or anywhere in parentheses ');
        tipBox.createEl('code', { text: '>[!note] Title (bg:red)' });
        tipBox.appendText('.');
    }

    onClose(): void {
        this.contentEl.empty();
    }

    private createTable(container: HTMLElement, title: string, rows: [string, string][]): void {
        const section = container.createDiv();
        section.addClass('sc-modal-section');

        const h3 = section.createEl('h3', { text: title });
        h3.addClass('sc-modal-section-title');

        const table = section.createEl('table');
        table.addClass('sc-modal-table');

        rows.forEach(([param, desc], i) => {
            const tr = table.createEl('tr');
            const isLast = i === rows.length - 1;

            const td1 = tr.createEl('td');
            td1.addClass('sc-modal-table-td1');
            if (!isLast) td1.addClass('sc-modal-table-row-border');
            td1.createEl('code', { text: param });

            const td2 = tr.createEl('td');
            td2.addClass('sc-modal-table-td2');
            if (!isLast) td2.addClass('sc-modal-table-row-border');
            td2.setText(desc);
        });
    }
}
