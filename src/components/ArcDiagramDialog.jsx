import { createEffect, onCleanup, onMount } from 'solid-js'
import { Portal } from 'solid-js/web'

import store from '../lib/store'
import arcDiagram from '../lib/arcDiagramVertical'
import transformDRS from '../lib/transformDRS'
import styles from './ArcDiagramDialog.module.css'

const ArcDiagramDialog = (props) => {
    let svg
    let closeBtn

    createEffect(() => {
        arcDiagram(transformDRS(props.drs, store.ui.labelRole, store.ui.lang), svg)
    })

    onMount(() => {
        closeBtn.focus()
        const onKey = (e) => e.key === 'Escape' && props.onClose()
        window.addEventListener('keydown', onKey)
        onCleanup(() => window.removeEventListener('keydown', onKey))
    })

    return (
        <Portal>
            <div class={styles.backdrop}>
                <div class={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="drs-title">
                    <header class={styles.header}>
                        <h2 id="drs-title" class={styles.title}>Dimensional relationship set</h2>
                        <span class="toolbar-hint">Scroll to zoom · drag to pan · hover a concept to trace its arcs</span>
                        <button ref={closeBtn} class="icon-btn" aria-label="Close" onClick={props.onClose}>×</button>
                    </header>
                    <svg ref={svg} id="arc-diagram" class={styles.svg} />
                </div>
            </div>
        </Portal>
    )
}

export default ArcDiagramDialog
