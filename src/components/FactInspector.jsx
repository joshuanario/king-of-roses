import { For, Match, Show, Switch, createMemo } from 'solid-js'

import store from '../lib/store'
import describeExpressable from '../lib/describeExpressable'
import styles from './FactInspector.module.css'

const FactInspector = (props) => {
    const fact = createMemo(() => {
        const x = store.expressableData()
        return x ? describeExpressable(x, store.ui.labelRole, store.ui.lang) : null
    })
    const count = () => props.occurrences?.count || 0

    return (
        <aside class={styles.inspector} aria-label="Fact inspector">
            <div class={styles.body}>
                <Switch>
                    <Match when={!store.fact()}>
                        <div class="state">Click a highlighted fact in the document to inspect it.</div>
                    </Match>
                    <Match when={store.expressable.state === 'errored'}>
                        <div class="state" role="alert">Could not load this fact.</div>
                    </Match>
                    <Match when={fact()}>
                        {(f) => (
                            <div class={styles.content}>
                                <div class={styles.conceptBlock}>
                                    <h2 class={styles.concept}>
                                        <Show when={count()} fallback={f().concept}>
                                            <a
                                                href="#"
                                                class={styles.conceptLink}
                                                title={count() > 1
                                                    ? `Scroll to the next of ${count()} expressions of this fact`
                                                    : 'Scroll this fact into view'}
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    props.onScrollIntoView()
                                                }}
                                            >
                                                {f().concept}
                                            </a>
                                        </Show>
                                    </h2>
                                    <div class={styles.occurrences} aria-live="polite">
                                        <Switch>
                                            <Match when={!count()}>Hidden in the document (ix:hidden)</Match>
                                            <Match when={count() > 1}>
                                                {props.occurrences.current
                                                    ? `Expression ${props.occurrences.current} of ${count()}`
                                                    : `${count()} expressions in the document`}
                                            </Match>
                                        </Switch>
                                    </div>
                                </div>

                                <dl class={styles.fields}>
                                    <dt>Period</dt>
                                    <dd>{f().period || '—'}</dd>
                                    <For each={f().members}>
                                        {(m) => (
                                            <>
                                                <dt>{m.dimension}</dt>
                                                <dd classList={{ [styles.typed]: m.typed }}>{m.member || '—'}</dd>
                                            </>
                                        )}
                                    </For>
                                </dl>

                                <section class={styles.section}>
                                    <h3 class={styles.heading}>Value</h3>
                                    <Show
                                        when={f().narrative}
                                        fallback={<div class={styles.value}>{f().value || '—'}</div>}
                                    >
                                        <div class={styles.narrative} innerHTML={f().narrative} />
                                    </Show>
                                </section>

                                <Show when={f().footnotes.length}>
                                    <section class={styles.section}>
                                        <h3 class={styles.heading}>Footnotes</h3>
                                        <ol class={styles.footnotes}>
                                            <For each={f().footnotes}>{(html) => <li innerHTML={html} />}</For>
                                        </ol>
                                    </section>
                                </Show>
                            </div>
                        )}
                    </Match>
                    <Match when={store.expressable.state === 'ready'}>
                        <div class="state">No details are available for this fact.</div>
                    </Match>
                </Switch>
                <Show when={store.expressable.loading}>
                    <div class="loading-overlay" role="status">
                        <span class="spinner" /> Loading fact…
                    </div>
                </Show>
            </div>
        </aside>
    )
}

export default FactInspector
