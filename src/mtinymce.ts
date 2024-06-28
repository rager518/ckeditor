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

        rte?.focus();
        updateEditorToolbars();
    };

    const config = {
        toolbar: {
            items: [
                'undo', 'redo',
                '|', 'heading',
                '|', 'bold', 'italic',
                '|', 'link', 'insertImage', 'insertTable', 'mediaEmbed',
                '|', 'bulletedList', 'numberedList', 'outdent', 'indent'
            ]
        },
        cloudServices: {

        },
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

            return globMCE.init({
                target: el,
                inline: true,
                auto_focus: true,
                license_key: 'gpl',
                // setup: function (r) {
                //     rte = r;
                //     focus(el, rte);
                //     return rte;
                // }
            }).then(editors => {

                if (editors.length > 0) {
                    rte = editors[0];
                    //focus(el, rte);
                    return rte;
                }
            });
        },

        disable(el, rte?: Editor) {
            //el.contentEditable = 'false';
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
