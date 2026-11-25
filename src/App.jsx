import { Match, Show, Switch } from 'solid-js'

import store, { NETWORKS } from './lib/store'
import TabBar from './components/TabBar'
import NetworksView from './components/NetworksView'
import DocumentView from './components/DocumentView'
import DetailPanel from './components/DetailPanel'
import logo from './logo.svg'
import styles from './App.module.css'

const App = () => (
    <div class={styles.app}>
        <Switch>
            <Match when={store.catalog.state === 'errored'}>
                <div class="state" role="alert">
                    <p>Could not load the catalog.</p>
                    <p class="state-detail">{String(store.catalog.error?.message || store.catalog.error)}</p>
                    <button class="btn" onClick={store.reloadCatalog}>Try again</button>
                </div>
            </Match>
            <Match when={store.catalogData()}>
                <TabBar />
                <main class={styles.main}>
                    <Show
                        when={store.ui.tab === NETWORKS}
                        fallback={
                            <Show when={store.ui.tab} keyed>
                                {(name) => <DocumentView name={name} />}
                            </Show>
                        }
                    >
                        <NetworksView />
                    </Show>
                </main>
                <DetailPanel />
            </Match>
            <Match when={true}>
                <div class={styles.splash} role="status">
                    <img class={styles.logo} src={logo} alt="" />
                    <span>Loading catalog…</span>
                </div>
            </Match>
        </Switch>
    </div>
)

export default App
