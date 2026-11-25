import { For, Match, Show, Switch, createMemo } from 'solid-js'

import store, { entityKey } from '../lib/store'
import { VIEWS } from '../lib/router'
import { LINKBASES } from '../lib/linkbases'
import { pairsFromRenderable } from '../lib/labels'
import Select from './Select'
import LabelSelect from './LabelSelect'
import LinkbaseView from './LinkbaseView'
import styles from './NetworksView.module.css'

const VIEW_TITLES = { ...Object.fromEntries(Object.entries(LINKBASES).map(([k, v]) => [k, v.title])), label: 'Label' }

const NetworksView = () => {
    const catalog = () => store.catalogData()

    const entityOptions = createMemo(() =>
        (catalog()?.Subjects || []).map((s) => ({ value: entityKey(s), label: entityKey(s), hint: s.Name })))

    // Only relationship sets that have a network for the chosen entity.
    const rsetOptions = createMemo(() => {
        const networks = catalog()?.Networks?.[store.ui.entity] || {}
        return (catalog()?.RelationshipSets || [])
            .filter((r) => r.RoleURI in networks)
            .map((r) => ({ value: r.RoleURI, label: r.RoleURI, hint: r.Title }))
    })

    return (
        <section class={styles.view} aria-label="Networks">
            <Select
                ariaLabel="Entity"
                placeholder="Select an entity"
                options={entityOptions()}
                value={store.ui.entity}
                onChange={store.setEntity}
            />
            <Select
                ariaLabel="Relationship set"
                placeholder="Select a relationship set"
                options={rsetOptions()}
                value={store.ui.roleURI}
                onChange={store.setRoleURI}
            />

            <div class={`card ${styles.card}`}>
                <div class={styles.subtabs} role="tablist" aria-label="Linkbase">
                    <For each={VIEWS}>
                        {(view) => (
                            <button
                                role="tab"
                                class={styles.subtab}
                                aria-selected={store.ui.view === view}
                                onClick={() => store.setView(view)}
                            >
                                {VIEW_TITLES[view]}
                            </button>
                        )}
                    </For>
                </div>

                <div class={styles.body}>
                    <Switch>
                        <Match when={!store.hash()}>
                            <div class="state">No network exists for this entity and relationship set.</div>
                        </Match>
                        <Match when={store.renderable.state === 'errored'}>
                            <div class="state" role="alert">
                                <p>Could not load this network.</p>
                                <p class="state-detail">{String(store.renderable.error?.message || store.renderable.error)}</p>
                                <button class="btn" onClick={store.reloadRenderable}>Try again</button>
                            </div>
                        </Match>
                        <Match when={store.renderableData()} keyed>
                            {(renderable) => (
                                <Show
                                    when={store.ui.view !== 'label'}
                                    fallback={<LabelPanel renderable={renderable} />}
                                >
                                    <Show when={store.ui.view} keyed>
                                        {(view) => <LinkbaseView linkbase={view} renderable={renderable} />}
                                    </Show>
                                </Show>
                            )}
                        </Match>
                    </Switch>
                    <Show when={store.renderable.loading}>
                        <div class="loading-overlay" role="status">
                            <span class="spinner" /> Loading network…
                        </div>
                    </Show>
                </div>
            </div>
        </section>
    )
}

const LabelPanel = (props) => (
    <div class={styles.labelPanel}>
        <h2 class={styles.labelTitle}>Labels</h2>
        <p>Choose the label role and language used by the grids, the DRS diagram and the fact inspector.</p>
        <LabelSelect pairs={pairsFromRenderable(props.renderable)} />
    </div>
)

export default NetworksView
