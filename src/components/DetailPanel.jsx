import { For, Show, createEffect, onCleanup } from 'solid-js'
import { Portal } from 'solid-js/web'

import store from '../lib/store'
import styles from './DetailPanel.module.css'

// Side panel for a fact's narrative text or footnotes.
const DetailPanel = () => {
    const content = () => store.detailContent()

    createEffect(() => {
        if (!store.detail()) return
        const onKey = (e) => e.key === 'Escape' && store.closeDetail()
        window.addEventListener('keydown', onKey)
        onCleanup(() => window.removeEventListener('keydown', onKey))
    })

    return (
        <Show when={store.detail()}>
            {(detail) => (
                <Portal>
                    <div class={styles.scrim} onClick={store.closeDetail} />
                    <aside class={styles.panel} role="dialog" aria-modal="true" aria-labelledby="detail-label">
                        <header class={styles.header}>
                            <div class={styles.kinds} role="tablist" aria-label="Detail">
                                <button
                                    role="tab"
                                    class={styles.kind}
                                    aria-selected={detail().kind === 'narrative'}
                                    disabled={!content()?.narrative}
                                    onClick={() => store.setDetailKind('narrative')}
                                >
                                    Narrative
                                </button>
                                <button
                                    role="tab"
                                    class={styles.kind}
                                    aria-selected={detail().kind === 'footnotes'}
                                    disabled={!content()?.footnotes.length}
                                    onClick={() => store.setDetailKind('footnotes')}
                                >
                                    Footnotes{content()?.footnotes.length ? ` (${content().footnotes.length})` : ''}
                                </button>
                            </div>
                            <button class="icon-btn" aria-label="Close" autofocus onClick={store.closeDetail}>×</button>
                        </header>

                        <Show when={content()} fallback={<div class="state">Nothing to show.</div>}>
                            {(c) => (
                                <>
                                    <div class={styles.meta}>
                                        <h2 id="detail-label" class={styles.label}>{c().label}</h2>
                                        <div class={styles.period}>{c().period}</div>
                                    </div>
                                    <div class={styles.body}>
                                        <Show
                                            when={detail().kind === 'narrative'}
                                            fallback={
                                                <ol class={styles.footnotes}>
                                                    <For each={c().footnotes}>
                                                        {(f) => <li value={f.n} innerHTML={f.html} />}
                                                    </For>
                                                </ol>
                                            }
                                        >
                                            <div class={styles.narrative} innerHTML={c().narrative || ''} />
                                        </Show>
                                    </div>
                                </>
                            )}
                        </Show>
                    </aside>
                </Portal>
            )}
        </Show>
    )
}

export default DetailPanel
