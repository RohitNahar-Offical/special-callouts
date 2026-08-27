/**
 * Special Callouts - Main Plugin Entry Point
 * Advanced callout styling with grid layouts, custom colors, gradients, glow effects, and multi-column support
 * 
 * IMPORTANT: Before modifying this file, read RULES.md for mandatory protocols.
 * 
 * @author ahseyg
 * @license MIT
 */

import { App, Plugin, Editor, Menu } from 'obsidian';
import { SpecialCalloutsSettings } from './src/types';
import { DEFAULT_SETTINGS } from './src/constants';
import { CalloutProcessor } from './src/processor';
import { clearMetadataCache } from './src/parser';
import { SpecialCalloutsSettingTab } from './src/settings/SettingsTab';
import { InsertCalloutModal } from './src/modals/InsertCalloutModal';
import { MultiColumnBuilderModal } from './src/modals/MultiColumnBuilderModal';

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
 * Main plugin class
 */
export default class SpecialCallouts extends Plugin {
    settings: SpecialCalloutsSettings;
    private processor: CalloutProcessor;
    private registeredStyleCommands: Set<string> = new Set();

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
            if (element.classList?.contains('callout')) {
                this.processor.processCallout(element);
            }
            const nested = element.querySelectorAll<HTMLElement>('.callout');
            for (let i = 0; i < nested.length; i++) {
                this.processor.processCallout(nested[i]);
            }
        });

        // Live Preview (Editing Mode) observer for dynamic CodeMirror 6 widget additions with debounced RAF batching
        const pendingNodes: Set<HTMLElement> = new Set();
        let rafId: number | null = null;

        const processPendingNodes = () => {
            rafId = null;
            if (pendingNodes.size === 0) return;

            const nodesToProcess = Array.from(pendingNodes);
            pendingNodes.clear();

            for (let i = 0; i < nodesToProcess.length; i++) {
                const el = nodesToProcess[i];
                if (!el.isConnected) continue;

                if (el.classList.contains('callout')) {
                    this.processor.processCallout(el);
                } else {
                    const callouts = el.querySelectorAll<HTMLElement>('.callout');
                    for (let j = 0; j < callouts.length; j++) {
                        this.processor.processCallout(callouts[j]);
                    }
                }
            }
        };

        const livePreviewObserver = new MutationObserver((mutations) => {
            let queued = false;
            for (let i = 0; i < mutations.length; i++) {
                const mutation = mutations[i];
                for (let j = 0; j < mutation.addedNodes.length; j++) {
                    const node = mutation.addedNodes[j];
                    if (node.nodeType === 1) {
                        const el = node as HTMLElement;
                        const cls = el.className || '';
                        // Early fast-path exit for non-editor structural UI nodes
                        if (typeof cls === 'string' && (
                            cls.includes('tree-item') ||
                            cls.includes('nav-folder') ||
                            cls.includes('workspace-ribbon') ||
                            cls.includes('status-bar') ||
                            cls.includes('menu') ||
                            cls.includes('tooltip') ||
                            cls.includes('suggestion')
                        )) {
                            continue;
                        }

                        if (el.classList.contains('callout')) {
                            pendingNodes.add(el);
                            queued = true;
                        } else if (el.childElementCount > 0 && (
                            cls.includes('cm-embed-block') ||
                            cls.includes('cm-callout') ||
                            cls.includes('cm-content') ||
                            cls.includes('markdown-rendered') ||
                            cls.includes('workspace-leaf') ||
                            cls.includes('view-content')
                        )) {
                            pendingNodes.add(el);
                            queued = true;
                        }
                    }
                }
            }

            if (queued && rafId === null) {
                rafId = window.requestAnimationFrame(processPendingNodes);
            }
        });

        const targetContainer = this.app.workspace.containerEl || document.body;
        livePreviewObserver.observe(targetContainer, { childList: true, subtree: true });
        this.register(() => {
            if (rafId !== null) window.cancelAnimationFrame(rafId);
            livePreviewObserver.disconnect();
        });

        // Register right-click context menu in editor
        this.registerEvent(
            this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor) => {
                menu.addItem((item) => {
                    item
                        .setTitle('Special Callout Studio (Create / Edit)...')
                        .setIcon('layout-grid')
                        .onClick(() => {
                            const selection = editor.getSelection();
                            const line = editor.getLine(editor.getCursor().line);
                            if ((selection && selection.includes('[!multi-callout]')) || /^\s*>\s*\[!multi-callout\]/i.test(line)) {
                                new MultiColumnBuilderModal(this.app, this.settings, editor).open();
                            } else {
                                new InsertCalloutModal(this.app, this.settings, editor).open();
                            }
                        });
                });
            })
        );
    }

    /**
     * Registers core and custom plugin commands
     */
    private registerCommands(): void {
        // Unified Special Callout Studio (Create / Edit Single & Multi)
        this.addCommand({
            id: 'open-special-callout-studio',
            name: 'Special Callout Studio (Create / Edit Single & Multi)...',
            editorCallback: (editor) => {
                const selection = editor.getSelection();
                const line = editor.getLine(editor.getCursor().line);
                if ((selection && selection.includes('[!multi-callout]')) || /^\s*>\s*\[!multi-callout\]/i.test(line)) {
                    new MultiColumnBuilderModal(this.app, this.settings, editor).open();
                } else {
                    new InsertCalloutModal(this.app, this.settings, editor).open();
                }
            }
        });

        this.registerStyleCommands();
    }

    /**
     * Registers one insert command per saved custom style.
     */
    private registerStyleCommands(): void {
        this.settings.customStyles
            .filter((style) => style.showInCommandPalette === true)
            .forEach((style) => {
                const id = `insert-${style.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
                if (this.registeredStyleCommands.has(id)) return;
                this.registeredStyleCommands.add(id);

                this.addCommand({
                    id,
                    name: `Insert "${style.name}" Callout`,
                    editorCallback: (editor) => this.insertCalloutTemplate(editor, style.name)
                });
            });

        (this.settings.customLayouts || [])
            .filter((layout) => layout.showInCommandPalette === true)
            .forEach((layout) => {
                const id = `insert-layout-${layout.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
                if (this.registeredStyleCommands.has(id)) return;
                this.registeredStyleCommands.add(id);

                this.addCommand({
                    id,
                    name: `Insert "${layout.name}" Layout`,
                    editorCallback: (editor) => {
                        let template = `> [!multi-callout] (${layout.name})\n>\n`;
                        for (let i = 1; i <= layout.cols; i++) {
                            template += `>> [!note] Panel ${i}\n>> Content\n>\n`;
                        }
                        editor.replaceRange(template, editor.getCursor());
                    }
                });
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

    /**
     * Loads settings, filling in defaults the saved file predates.
     */
    async loadSettings(): Promise<void> {
        const saved = ((await this.loadData()) || {}) as Partial<SpecialCalloutsSettings>;

        this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
        this.settings.customStyles = Array.isArray(saved.customStyles) ? saved.customStyles : (DEFAULT_SETTINGS.customStyles || []);
        this.settings.customColors = Array.isArray(saved.customColors) ? saved.customColors : (DEFAULT_SETTINGS.customColors || []);
        this.settings.customLayouts = Array.isArray(saved.customLayouts) ? saved.customLayouts : (DEFAULT_SETTINGS.customLayouts || []);
        this.settings.standardStyles = Object.assign({}, DEFAULT_SETTINGS.standardStyles, saved.standardStyles);
        this.settings.standardColors = Object.assign({}, DEFAULT_SETTINGS.standardColors, saved.standardColors);
        this.settings.universalDefaults = Object.assign({}, DEFAULT_SETTINGS.universalDefaults, saved.universalDefaults);
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
        this.registerStyleCommands();
        clearMetadataCache();
        if (this.processor) {
            this.processor.updateSettings(this.settings);
        }
    }
}

