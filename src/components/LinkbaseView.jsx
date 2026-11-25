import { Show, createMemo, createSignal } from 'solid-js'

import store from '../lib/store'
import { LINKBASES } from '../lib/linkbases'
import { narrativeHtml, pickLabel } from '../lib/labels'
import DataGrid from './DataGrid'
import Select from './Select'
import ArcDiagramDialog from './ArcDiagramDialog'
import styles from './LinkbaseView.module.css'

const chosenParts = new Map() // `${hash}|${linkbase}` -> part index

// Presentation / Definition / Calculation grid for one network.
// Mounted per (renderable, linkbase), so props are stable for its lifetime.
// Cell actions live in the grid's right-click menu. Definition and
// Calculation have a selectize bar above the grid to pick the hypercube or
// summation item.
const LinkbaseView = (props) => {
    const linkbase = LINKBASES[props.linkbase]
    const isDefinition = props.linkbase === 'definition'
    const parts = createMemo(() => linkbase.parts(props.renderable))
    // Remember the chosen hypercube / summation item per network while
    // switching tabs.
    const memoryKey = `${store.hash()}|${props.linkbase}`
    const [partIndex, setPartIndexSignal] = createSignal(
        Math.min(chosenParts.get(memoryKey) ?? 0, Math.max(0, parts().length - 1)))
    const setPartIndex = (i) => {
        chosenParts.set(memoryKey, i)
        setPartIndexSignal(i)
    }
    const [drsOpen, setDrsOpen] = createSignal(false)

    const part = () => parts()[partIndex()]
    const blob = createMemo(() => part() && linkbase.transform(part(), store.ui.labelRole, store.ui.lang))
    const drs = () => (isDefinition ? props.renderable.DGrid?.DRS : null)

    // Options for the selectize bar above the grid (Definition / Calculation).
    const pickerOptions = createMemo(() => {
        const { labelRole: role, lang } = store.ui
        if (isDefinition) {
            // Each root domain (line items) is tied to its hypercube(s) by a
            // HypercubeConnection link in the DRS ("all" / "notAll" arcs).
            const nodes = new Map((drs()?.Nodes || []).map((n) => [n.Href, n]))
            const links = (drs()?.Links || []).filter((l) => l.HypercubeConnection)
            const label = (href) => pickLabel(nodes.get(href)?.Label, role, lang) || href
            return parts().map((rootDomain, i) => {
                const cubes = links
                    .filter((l) => l.SourceHref === rootDomain.Href)
                    .map((l) => label(l.TargetHref) + (l.HypercubeConnection.IsInclusive === false ? ' (notAll)' : ''))
                return {
                    value: String(i),
                    label: cubes.length ? cubes.join(' + ') : label(rootDomain.Href),
                    hint: label(rootDomain.Href),
                }
            })
        }
        if (props.linkbase === 'calculation') {
            return parts().map((item, i) => ({
                value: String(i),
                label: pickLabel(item.Label, role, lang) || item.Href || `Summation item ${i + 1}`,
            }))
        }
        return []
    })

    const hasNarrative = (pos) => !!pos && !!narrativeHtml(part()?.FactualQuadrant?.[pos.row]?.[pos.col], store.ui.lang)
    const footnoteIds = (pos) => (pos && part()?.FootnoteGrid?.[pos.row]?.[pos.col]) || []
    const open = (kind, pos) =>
        store.openDetail({ kind, linkbase: props.linkbase, part: partIndex(), row: pos.row, col: pos.col })

    const contextItems = (pos) => {
        const items = []
        if (hasNarrative(pos)) items.push({ title: 'Show Narrative', click: () => open('narrative', pos) })
        if (footnoteIds(pos).length) items.push({ title: 'Show Footnotes', click: () => open('footnotes', pos) })
        if (drs()) items.push({ title: 'Visualize DRS', click: () => setDrsOpen(true) })
        return items
    }

    return (
        <>
            <Show when={pickerOptions().length}>
                <div class={styles.picker}>
                    <Select
                        ariaLabel={isDefinition ? 'Hypercube' : 'Summation item'}
                        placeholder={isDefinition ? 'Select a hypercube' : 'Select a summation item'}
                        options={pickerOptions()}
                        value={String(partIndex())}
                        onChange={(v) => setPartIndex(Number(v))}
                    />
                    <Show when={drs()}>
                        <button class={`btn ${styles.drsButton}`} onClick={() => setDrsOpen(true)}>
                            Visualize Dimensional Relationship Set
                        </button>
                    </Show>
                </div>
            </Show>

            <Show
                when={blob()}
                fallback={<div class="state">This network has no {linkbase.title.toLowerCase()} relationships.</div>}
            >
                <div class="grid-host">
                    <DataGrid
                        data={blob().grid}
                        headerRows={blob().numFrozenRows}
                        headerCols={linkbase.headerCols}
                        footnoteMarks={footnoteIds}
                        contextItems={contextItems}
                    />
                </div>
            </Show>

            <Show when={drsOpen() && drs()}>
                <ArcDiagramDialog drs={drs()} onClose={() => setDrsOpen(false)} />
            </Show>
        </>
    )
}

export default LinkbaseView
