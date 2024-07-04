import { Plugin, CustomRTE } from 'grapesjs';
import { Editor, TinyMCE } from 'tinymce';

export type PluginOptions = {
    /**
     * Position side of the toolbar.
     * @default 'left'
     */
    position?: 'left' | 'center' | 'right';

    /**
     * Extend the default customRTE interface.
     * @see https://grapesjs.com/docs/guides/Replace-Rich-Text-Editor.html
     * @default {}
     * @example
     * customRte: { parseContent: true, ... },
     */
    customRte?: Partial<CustomRTE>;
};

const loadFromCDN = (doc: Document, url: string) => {
    const scr = doc?.createElement('script');
    if (scr) {
        scr.src = url;
        doc.head.appendChild(scr);
    }

    return scr;
}

const forEach = <T extends HTMLElement = HTMLElement>(items: Iterable<T>, clb: (item: T) => void) => {
    [].forEach.call(items, clb);
}

const stopPropagation = (ev: Event) => ev.stopPropagation();

const plugin: Plugin<PluginOptions> = (editor, options = {}) => {
    const opts: Required<PluginOptions> = {
        customRte: {},
        position: 'left',
        ...options,
    };

    const hasWindow = typeof window !== 'undefined';
    let dynamicLoad = false;
    let globMCE: TinyMCE;

    const updateEditorToolbars = () => setTimeout(() => editor.refresh(), 600);

    const focus = (el: HTMLElement, rte?: Editor) => {
        if (rte?.hasFocus()) return;

        el.focus();
        rte?.focus();
        updateEditorToolbars();
    };

    editor.setCustomRte({
        getContent(el, rte: Editor) {
            return rte?.getContent();
        },

        enable(el, rte?: Editor) {
            // If already exists I'll just focus on it
            if (rte) {
                focus(el, rte);
                return rte;
            }

            const toolbar = ['alignleft aligncenter alignright|forecolor fontsizeinput','bold italic underline strikethrough link customButton'];

            return globMCE.init({
                target: el,
                inline: true,
                auto_focus: true,
                menubar: false,
                toolbar: toolbar,
                font_size_input_default_unit: "px",
                plugins: 'link',
                license_key: 'gpl',
                setup: function (r) {
                    r.ui.registry.addSplitButton('customButton', {
                        text: '站点标题',
                        onAction: (_) => r.insertContent('{{-STORENAME-}}'),
                        onItemAction: (buttonApi, value) => r.insertContent(value),
                        fetch: (callback) => {
                            const items = [
                                {
                                    type: 'choiceitem',
                                    text: '站点标题',
                                    value: '{{-STORENAME-}}'
                                },
                                {
                                    type: 'choiceitem',
                                    text: '页面标题',
                                    value: '{{-TITLE-}}'
                                }
                            ];
                            callback(items as any);
                        }
                    });
                }
            }).then(editors => {
                if (editors.length > 0) {
                    rte = editors[0];

                    focus(el, rte);
                    return rte;
                }
            });
        },

        disable(el, rte?: Editor) {
            //el.contentEditable = 'false';
            //debugger;
        },

        ...opts.customRte,
    });

    // Update RTE toolbar position
    editor.on('rteToolbarPosUpdate', (pos: any) => {
        const { elRect } = pos;

        switch (opts.position) {
            case 'center':
                pos.left = (elRect.width / 2) - (pos.targetWidth / 2);
                break;
            case 'right':
                pos.left = ''
                pos.right = 0;
                break;
        }
    });

    editor.onReady(() => {
        if (hasWindow && !dynamicLoad) {
            let doc = editor.Canvas.getDocument();
            dynamicLoad = true;
            const scriptEl = loadFromCDN(doc, 'https://cdn.jsdelivr.net/npm/tinymce@7.2.0/tinymce.js');
            if (scriptEl) {
                scriptEl.onload = () => {
                    globMCE = (editor.Canvas.getWindow() as any).tinymce as TinyMCE;
                }
            }
        }
    });
};

export default plugin;
