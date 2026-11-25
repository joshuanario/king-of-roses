import { Match, Show, Switch, createEffect, createMemo, createResource, createSignal, onCleanup } from 'solid-js'

import store from '../lib/store'
import * as api from '../lib/api'
import { attachFactLayer } from '../lib/ixbrl'
import { pairsFromLabels, pairsFromRenderable } from '../lib/labels'
import LabelSelect from './LabelSelect'
import FactInspector from './FactInspector'
import styles from './DocumentView.module.css'

const MIN_SPLIT = 25
const MAX_SPLIT = 75
const clamp = (v) => Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, v))

// Anchor to scroll to once a document opened from a cross-document link loads.
const pendingAnchors = new Map()

// One inline XBRL document: the document on the left, the fact inspector on
// the right. Mounted per document name.
const DocumentView = (props) => {
    const [html, { refetch }] = createResource(() => props.name, api.fetchDocument)
    const [layer, setLayer] = createSignal(null)
    // Rendered expressions of the selected fact, and the one last scrolled to (1-based, 0 = none yet).
    const [occurrences, setOccurrences] = createSignal({ count: 0, current: 0 })
    const [split, setSplit] = createSignal(50)
    const [dragging, setDragging] = createSignal(false)
    let iframe
    let card

    // Links between documents of the filing ("wk_ex_1.htm#anchor").
    const openDocument = (path, fragment) => {
        const name = decodeURIComponent(path.split('/').pop() || '')
        if (!store.documents().includes(name)) return false
        if (name === props.name) {
            if (fragment) layer()?.scrollToAnchor(fragment)
        } else {
            if (fragment) pendingAnchors.set(name, fragment)
            store.openTab(name)
        }
        return true
    }

    const onLoad = () => {
        layer()?.destroy()
        const doc = iframe?.contentDocument
        if (!doc?.body) return
        const l = attachFactLayer(doc, {
            onSelect: (f) => store.selectFact({ ...f, document: props.name }),
            onClear: store.clearFact,
            onOpenDocument: openDocument,
        })
        setLayer(l)
        const anchor = pendingAnchors.get(props.name)
        if (anchor) {
            pendingAnchors.delete(props.name)
            l.scrollToAnchor(anchor)
        }
    }

    // Reflect the store's selection in the document.
    createEffect(() => {
        const l = layer()
        if (!l) return
        const f = store.fact()
        if (f) {
            setOccurrences({ count: l.select(f).count, current: 0 })
        } else {
            l.clear()
            setOccurrences({ count: 0, current: 0 })
        }
    })

    const scrollToNext = () => {
        const current = layer()?.scrollToSelection() || 0
        setOccurrences((o) => ({ ...o, current }))
    }

    onCleanup(() => {
        layer()?.destroy()
        store.clearFact()
    })

    const labelPairs = createMemo(() => [
        ...pairsFromLabels(store.expressableData()?.Labels),
        ...pairsFromRenderable(store.renderableData()),
    ])

    // Pointer capture keeps the drag on the divider even when the pointer
    // crosses the iframe or leaves the window, and every way a drag can end
    // (up, cancel, capture lost) releases it, so the document never stays
    // un-scrollable.
    const startDrag = (e) => {
        if (e.button !== 0) return
        e.preventDefault()
        const divider = e.currentTarget
        const rect = card.getBoundingClientRect()
        divider.setPointerCapture(e.pointerId)
        setDragging(true)
        const move = (ev) => setSplit(clamp(((ev.clientX - rect.left) / rect.width) * 100))
        const end = () => {
            setDragging(false)
            divider.removeEventListener('pointermove', move)
            divider.removeEventListener('pointerup', end)
            divider.removeEventListener('pointercancel', end)
            divider.removeEventListener('lostpointercapture', end)
            if (divider.hasPointerCapture(e.pointerId)) divider.releasePointerCapture(e.pointerId)
        }
        divider.addEventListener('pointermove', move)
        divider.addEventListener('pointerup', end)
        divider.addEventListener('pointercancel', end)
        divider.addEventListener('lostpointercapture', end)
    }
    const onDividerKey = (e) => {
        const step = { ArrowLeft: -5, ArrowRight: 5 }[e.key]
        if (step) {
            e.preventDefault()
            setSplit((s) => clamp(s + step))
        }
    }

    return (
        <section class={styles.view} aria-label={`Inline XBRL document ${props.name}`}>
            <LabelSelect pairs={labelPairs()} />

            <div
                ref={card}
                class={`card ${styles.split}`}
                classList={{ [styles.dragging]: dragging() }}
                style={{ '--split': `${split()}%` }}
            >
                <div class={styles.docPane}>
                    <Switch>
                        <Match when={html.state === 'errored'}>
                            <div class="state" role="alert">
                                <p>Could not load {props.name}.</p>
                                <p class="state-detail">{String(html.error?.message || html.error)}</p>
                                <button class="btn" onClick={refetch}>Try again</button>
                            </div>
                        </Match>
                        <Match when={html()}>
                            <iframe
                                ref={iframe}
                                class={styles.frame}
                                title={`Inline XBRL document ${props.name}`}
                                srcdoc={html()}
                                onLoad={onLoad}
                            />
                        </Match>
                        <Match when={true}>
                            <div class="state" role="status">
                                <span class="spinner" /> Loading {props.name}…
                            </div>
                        </Match>
                    </Switch>
                    {/* Covers the iframe only while dragging so it can't swallow pointer events. */}
                    <Show when={dragging()}>
                        <div class={styles.dragShield} />
                    </Show>
                </div>

                <div
                    class={styles.divider}
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize document and fact inspector"
                    aria-valuemin={MIN_SPLIT}
                    aria-valuemax={MAX_SPLIT}
                    aria-valuenow={Math.round(split())}
                    tabIndex={0}
                    onPointerDown={startDrag}
                    onKeyDown={onDividerKey}
                />

                <FactInspector occurrences={occurrences()} onScrollIntoView={scrollToNext} />
            </div>
        </section>
    )
}

export default DocumentView
