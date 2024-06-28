import type { Plugin, CustomRTE } from 'grapesjs';
//import InlineEditor from '@ckeditor/ckeditor5-build-inline';
import type {InlineEditor} from 'ckeditor5';

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
  let globMCE: any;

  const updateEditorToolbars = () => setTimeout(() => editor.refresh(), 600);

  const focus = (el: HTMLElement, rte?: InlineEditor) => {
    if (rte?.ui.view.editable.isFocused) return;
    el.contentEditable = 'true';
    rte?.focus();
    //rte?.editing.view.focus();
    rte?.ui.focusTracker.set('isFocused', true);
    rte?.ui.view.editable.set('isFocused', true);
    rte?.editing.view.document.set('isFocused', true);
    rte?.ui.view.panel.set('isVisible', true);

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
    getContent(el, rte: InlineEditor) {
      return rte.getData();
    },

    enable(el, rte?: InlineEditor) {
      // If already exists I'll just focus on it
      if (rte && rte.state != 'destroyed') {
        focus(el, rte);
        return rte;
      }

      return globMCE.create(el, config).then((newRte: InlineEditor) => {
        rte = newRte ;
        focus(el, rte);
        return rte;
      });
    },

    disable(el, rte?: InlineEditor) {
      el.contentEditable = 'false';
      // rte?.ui.view.editable.set('isFocused', false);
      // rte?.ui.view.panel.set('isVisible', false);
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
      const scriptEl = loadFromCDN(doc, 'https://cdn.ckeditor.com/ckeditor5/41.4.2/inline/ckeditor.js');
      if (scriptEl) {
        scriptEl.onload = () => {
          globMCE = (editor.Canvas.getWindow() as any).InlineEditor;
        }
      }
    }
  });
};

export default plugin;
