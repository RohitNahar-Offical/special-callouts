/**
 * Special Callouts - Main Plugin Entry Point
 * Advanced callout styling with grid layouts, custom colors, gradients, glow effects, and multi-column support
 * 
 * IMPORTANT: Before modifying this file, read RULES.md for mandatory protocols.
 * 
 * @author ahseyg
 * @license MIT
 */

import { App, Plugin, Editor, FuzzySuggestModal, Menu } from 'obsidian';
import { SpecialCalloutsSettings } from './src/types';
import { DEFAULT_SETTINGS } from './src/constants';
import { CalloutProcessor } from './src/processor';
import { CustomCalloutSuggester } from './src/modals/SuggesterModal';
import { SpecialCalloutsSettingTab } from './src/settings/SettingsTab';
import { IconPickerModal } from './src/modals/IconPickerModal';
import { InsertCalloutModal } from './src/modals/InsertCalloutModal';
import { MultiColumnBuilderModal } from './src/modals/MultiColumnBuilderModal';

class ColumnSuggesterModal extends FuzzySuggestModal<string> {
    items: string[];
    callback: (item: string) => void;

    constructor(app: App, items: string[], callback: (item: string) => void) {
        super(app);
        this.items = items;
        this.callback = callback;
    }

    getItems(): string[] {
        return this.items;
    }

    getItemText(item: string): string {
        return item;
    }

    onChooseItem(item: string, evt: MouseEvent | KeyboardEvent): void {
        this.callback(item);
    }
}

/**
 * Formats the "Default Callout Metadata" setting into the parenthesised form the renderer
 * actually parses. Tolerates the user typing their own parentheses around it.
 *
 * Returns a leading-space-prefixed block ready to append after `]`, or '' when unset.
 */
function formatMetadata(raw: string | undefined): string {
    const meta = (raw || '').trim();
    if (!meta) return '';
    const inner = meta.startsWith('(') && meta.endsWith(')') ? meta.slice(1, -1).trim() : meta;
    return inner ? ` (${inner})` : '';
}

/**
 * Locates the metadata block following `]` on a callout line.
 *
 * Counts parenthesis depth the same way parser.ts extractMetadata does, so grouped values
 * like text:(white, dark-border) are matched in full instead of being cut at the first ')'.
 */
function findMetadataSpan(
    line: string,
    from: number
): { start: number; end: number; content: string } | null {
    let i = from;
    while (i < line.length && line[i] === ' ') i++;
    if (line[i] !== '(') return null;

    let depth = 0;
    for (let j = i; j < line.length; j++) {
        if (line[j] === '(') depth++;
        else if (line[j] === ')') {
            depth--;
            if (depth === 0) return { start: i, end: j, content: line.slice(i + 1, j) };
        }
    }
    return null;
}

/**
 * Main plugin class
 */
export default class SpecialCallouts extends Plugin {
    settings: SpecialCalloutsSettings;
    private processor: CalloutProcessor;

    async onload(): Promise<void> {
        await this.loadSettings();

        // Initialize callout processor
        this.processor = new CalloutProcessor(this.settings);

        // Add settings tab
        this.addSettingTab(new SpecialCalloutsSettingTab(this.app, this));

        // Register commands
        this.registerCommands();

        // Register markdown post processor for callouts
        this.registerMarkdownPostProcessor((element) => {
            const callouts = element.querySelectorAll('.callout');
            callouts.forEach((callout) => {
                this.processor.processCallout(callout as HTMLElement);
            });
        });

        // Register right-click context menu in editor
        this.registerEvent(
            this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor) => {
                menu.addItem((item) => {
                    item
                        .setTitle('Insert Special Callout...')
                        .setIcon('palette')
                        .onClick(() => {
                            new InsertCalloutModal(this.app, this.settings, editor).open();
                        });
                });

                menu.addItem((item) => {
                    item
                        .setTitle('Multi-Column Dashboard Builder...')
                        .setIcon('layout-grid')
                        .onClick(() => {
                            new MultiColumnBuilderModal(this.app, this.settings, editor).open();
                        });
                });
            })
        );
    }

    /**
     * Registers all plugin commands based on usage scenarios
     */
    private registerCommands(): void {
        // All-in-One Customizer Modal Command
        this.addCommand({
            id: 'insert-and-customize-callout',
            name: 'Insert & Customize Callout (All-in-One)...',
            editorCallback: (editor) => {
                new InsertCalloutModal(this.app, this.settings, editor).open();
            }
        });

        // Multi-Column Dashboard Builder (Insert or Edit)
        this.addCommand({
            id: 'open-multi-column-builder',
            name: 'Multi-Column Dashboard Builder (Insert or Edit)...',
            editorCallback: (editor) => {
                new MultiColumnBuilderModal(this.app, this.settings, editor).open();
            }
        });

        // SCENARIO 1: Insert Custom Style (The Quick Access)
        this.addCommand({
            id: 'insert-custom-callout',
            name: 'Insert Custom Style...',
            editorCallback: (editor) => {
                const styles = this.settings.customStyles;
                if (styles.length === 0) {
                    this.insertCalloutTemplate(editor, 'note');
                    return;
                }
                new CustomCalloutSuggester(this.app, styles, (style) => {
                    this.insertCalloutTemplate(editor, style.name);
                }).open();
            }
        });

        // SCENARIO 2: Wrap Selection in Callout
        this.addCommand({
            id: 'wrap-selection-in-callout',
            name: 'Wrap Selection in Callout...',
            editorCallback: (editor) => {
                const selection = editor.getSelection();
                if (!selection) return;

                const styles = this.settings.customStyles;
                new CustomCalloutSuggester(this.app, styles, (style) => {
                    const header = `> [!${style.name}]${formatMetadata(this.settings.defaultMetadata)}\n`;
                    const wrapped = selection.split('\n').map(l => `> ${l}`).join('\n');
                    editor.replaceSelection(header + wrapped);
                }).open();
            }
        });

        // SCENARIO 3: Insert Multi-Column Layout (The Scaffolder)
        this.addCommand({
            id: 'insert-multi-column-layout',
            name: 'Insert Multi-Column Layout...',
            editorCallback: (editor) => {
                const options = ['2 Sütun', '3 Sütun', '4 Sütun'];
                new ColumnSuggesterModal(this.app, options, (choice: string) => {
                    if (!choice) return;
                    const cols = parseInt(choice.split(' ')[0]);
                    let template = `> [!multi-callout]\n>\n`;
                    for (let i = 1; i <= cols; i++) {
                        template += `>> [!note] (${i}:${cols})\n>> Sütun ${i} içeriği\n>\n`;
                    }
                    editor.replaceRange(template, editor.getCursor());
                }).open();
            }
        });

        // SCENARIO 4: Contextual Icon Change
        this.addCommand({
            id: 'change-current-callout-icon',
            name: 'Change Icon of Callout at Cursor',
            editorCallback: (editor) => {
                const cursor = editor.getCursor();
                const line = editor.getLine(cursor.line);
                
                // Callout baslıgı mı? Nested callout'lar icin >> de kabul edilir.
                const head = line.match(/^\s*>+\s*\[![^\]]+\]/);
                if (!head) return;

                new IconPickerModal(this.app, (icon: string) => {
                    const span = findMetadataSpan(line, head[0].length);
                    let newLine: string;

                    if (span) {
                        // Metadata varsa icon'u icine yaz: mevcutsa degistir, yoksa ekle
                        const existing = span.content.trim();
                        const meta = existing.includes('icon:')
                            ? existing.replace(/icon:[^,)]*/, `icon:${icon}`)
                            : existing ? `${existing}, icon:${icon}` : `icon:${icon}`;
                        newLine = line.slice(0, span.start) + `(${meta})` + line.slice(span.end + 1);
                    } else {
                        newLine = line.slice(0, head[0].length) + ` (icon:${icon})` + line.slice(head[0].length);
                    }

                    editor.setLine(cursor.line, newLine);
                }).open();
            }
        });

        // SCENARIO 5: Multi-Column Dashboard Builder
        this.addCommand({
            id: 'multi-column-dashboard-builder',
            name: 'Insert Multi-Column Dashboard...',
            editorCallback: (editor) => {
                new MultiColumnBuilderModal(this.app, this.settings, editor).open();
            }
        });
    }

    /**
     * Helper to insert a callout template with default metadata
     */
    private insertCalloutTemplate(editor: Editor, type: string): void {
        const cursor = editor.getCursor();
        const calloutText = `> [!${type}]${formatMetadata(this.settings.defaultMetadata)}\n> `;
        editor.replaceRange(calloutText, cursor);
        editor.setCursor({ line: cursor.line + 1, ch: 2 });
    }

    onunload(): void {
        this.processor.cleanup();
    }

    async loadSettings(): Promise<void> {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) as Partial<SpecialCalloutsSettings>);
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
        // Update processor with new settings
        if (this.processor) {
            this.processor.updateSettings(this.settings);
        }
    }
}
