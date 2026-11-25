import { For } from 'solid-js'

import store, { NETWORKS } from '../lib/store'
import styles from './TabBar.module.css'

// "Networks" is always present; one tab per inline XBRL document follows.
const TabBar = () => {
    const tabs = () => [NETWORKS, ...store.documents()]
    const onKeyDown = (e) => {
        const list = tabs()
        const i = list.indexOf(store.ui.tab)
        const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: list.length - 1 }[e.key]
        if (next === undefined) return
        e.preventDefault()
        const tab = list[(next + list.length) % list.length]
        store.openTab(tab)
        e.currentTarget.querySelector(`[data-tab="${CSS.escape(tab)}"]`)?.focus()
    }
    return (
        <nav class={styles.tabs} role="tablist" aria-label="Views" onKeyDown={onKeyDown}>
            <For each={tabs()}>
                {(tab) => (
                    <button
                        role="tab"
                        data-tab={tab}
                        class={styles.tab}
                        classList={{ [styles.doc]: tab !== NETWORKS }}
                        aria-selected={store.ui.tab === tab}
                        tabIndex={store.ui.tab === tab ? 0 : -1}
                        title={tab === NETWORKS ? 'Concept networks' : `Inline XBRL document: ${tab}`}
                        onClick={() => store.openTab(tab)}
                    >
                        {tab === NETWORKS ? 'Networks' : tab}
                    </button>
                )}
            </For>
        </nav>
    )
}

export default TabBar
