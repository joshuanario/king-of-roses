import { Index, Show, createEffect, createMemo, createSelector, createSignal, createUniqueId, on, onCleanup, onMount } from 'solid-js'

import ContextMenu from './ContextMenu'
import styles from './DataGrid.module.css'

const isEmpty = (v) => v === '' || v == null

// The linkbase transforms pad the grid with an empty last column and row
// (a spreadsheet habit); drop that padding.
const trimPadding = (data, headerRows) => {
    let rows = data || []
    while (rows.length > headerRows && rows[rows.length - 1].every(isEmpty)) rows = rows.slice(0, -1)
    let width = Math.max(0, ...rows.map((r) => r.length))
    while (width > 0 && rows.every((r) => isEmpty(r[width - 1]))) width--
    return rows.map((r) => Array.from({ length: width }, (_, i) => r[i] ?? ''))
}

// Amounts like "$ 231,932,000.00", "(10,507)" or "39,898,661.00 Share".
const NUMERIC = /^[\s$€£¥(−-]*\d[\d,.]*\)?%?(\s+[A-Za-z]+)?\s*$/

/**
 * Spreadsheet-style table: numbered rows, no column letters, header rows
 * pinned to the top and label columns pinned to the left.
 *
 * Coordinates passed to callbacks are relative to the fact area, i.e. with the
 * header rows/columns already subtracted.
 *
 * props:
 *   data          2-D array of strings
 *   headerRows    number of header rows (period headers + dimension rows)
 *   headerCols    number of label columns
 *   footnoteMarks ({row, col}) => number[]   superscripts to show in a cell
 *   onCellSelect  ({row, col} | null) => void
 *   contextItems  ({row, col} | null) => [{ title, click?, items? }]
 */
const DataGrid = (props) => {
    const id = createUniqueId()
    const headerRows = () => props.headerRows || 0
    const headerCols = () => props.headerCols || 0
    const rows = createMemo(() => trimPadding(props.data, headerRows()))
    const width = () => rows()[0]?.length || 0

    // No cell is selected until the user clicks or uses the keyboard.
    const [active, setActive] = createSignal(null)
    const isActive = createSelector(() => (active() ? `${active().r}:${active().c}` : ''))
    const [menu, setMenu] = createSignal(null)
    // left offsets of the pinned label columns, and whether the header fits
    const [lefts, setLefts] = createSignal([])
    const [pinHeader, setPinHeader] = createSignal(true)
    let scroller
    let table

    const toFact = (r, c) => {
        const row = r - headerRows()
        const col = c - headerCols()
        return row > -1 && col > -1 ? { row, col } : null
    }

    // ---- layout of the pinned regions ----------------------------------------
    const measure = () => {
        const first = table?.rows[0]
        if (!first) return
        const cells = first.cells
        const out = []
        let x = cells[0].offsetWidth // row-number gutter
        for (let i = 0; i < headerCols(); i++) {
            out.push(x)
            x += cells[i + 1]?.offsetWidth || 0
        }
        setLefts(out)
        // Don't pin a header that would eat more than half of the view.
        setPinHeader((table.tHead?.offsetHeight || 0) <= scroller.clientHeight / 2)
        scroller.style.scrollPaddingTop = `${pinHeader() ? table.tHead?.offsetHeight || 0 : 0}px`
        scroller.style.scrollPaddingLeft = `${x}px`
    }
    onMount(() => {
        const ro = new ResizeObserver(measure)
        ro.observe(table)
        ro.observe(scroller)
        onCleanup(() => ro.disconnect())
        document.fonts?.ready.then(measure)
    })
    // A different grid (e.g. another summation item) drops the selection; a
    // label/language change keeps it since the shape stays the same.
    let shape = ''
    createEffect(on(rows, () => {
        requestAnimationFrame(measure)
        const next = `${rows().length}x${width()}/${headerRows()}`
        if (next !== shape) {
            shape = next
            setActive(null)
        }
    }))

    // ---- selection --------------------------------------------------------------
    const cellFrom = (target) => {
        const td = target.closest?.('td[data-c]')
        return td ? { r: Number(td.parentElement.dataset.r), c: Number(td.dataset.c), el: td } : null
    }
    const select = (r, c) => {
        setActive({ r, c })
        props.onCellSelect?.(toFact(r, c))
    }
    const cellEl = (r, c) => document.getElementById(`${id}-${r}-${c}`)

    const openMenu = (r, c, x, y) => {
        const items = props.contextItems?.(toFact(r, c)) || []
        if (!items.length) return false
        setMenu({ x, y, items })
        return true
    }

    const onContextMenu = (e) => {
        const cell = cellFrom(e.target)
        if (!cell) return
        select(cell.r, cell.c)
        if (openMenu(cell.r, cell.c, e.clientX, e.clientY)) e.preventDefault()
    }

    const onKeyDown = (e) => {
        // First keypress starts at the first fact cell.
        const { r, c } = active() || { r: headerRows() - 1, c: headerCols() }
        const move = {
            ArrowUp: [r - 1, c],
            ArrowDown: [r + 1, c],
            ArrowLeft: [r, c - 1],
            ArrowRight: [r, c + 1],
            Home: e.ctrlKey || e.metaKey ? [0, 0] : [r, 0],
            End: e.ctrlKey || e.metaKey ? [rows().length - 1, width() - 1] : [r, width() - 1],
            PageUp: [r - 10, c],
            PageDown: [r + 10, c],
        }[e.key]
        if (move) {
            e.preventDefault()
            const nr = Math.max(0, Math.min(rows().length - 1, move[0]))
            const nc = Math.max(0, Math.min(width() - 1, move[1]))
            select(nr, nc)
            cellEl(nr, nc)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
            return
        }
        if (active() && (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey))) {
            const rect = cellEl(r, c)?.getBoundingClientRect()
            if (rect && openMenu(r, c, rect.left + 8, rect.bottom)) e.preventDefault()
        }
    }

    // ---- rendering ----------------------------------------------------------------
    // `r` is an accessor: <Index> reuses row elements when the data changes
    // (e.g. switching summation items), and the absolute row index of a body
    // row shifts whenever the number of header rows changes.
    const renderCell = (value, r, c) => {
        const fact = () => r() >= headerRows() && c >= headerCols()
        const marks = () => {
            const pos = toFact(r(), c)
            return (pos && props.footnoteMarks?.(pos)) || []
        }
        const pinned = () => c < headerCols()
        return (
            <td
                id={`${id}-${r()}-${c}`}
                data-c={c}
                role="gridcell"
                aria-selected={isActive(`${r()}:${c}`)}
                class={styles.cell}
                classList={{
                    // the last label column holds concepts; earlier ones (e.g. calculation weights) are narrow
                    [styles.label]: c === headerCols() - 1,
                    [styles.narrow]: c < headerCols() - 1,
                    [styles.pinned]: pinned(),
                    [styles.lastPinned]: pinned() && c === headerCols() - 1,
                    [styles.numeric]: fact() && NUMERIC.test(value()),
                    [styles.active]: isActive(`${r()}:${c}`),
                }}
                style={pinned() ? { left: `${lefts()[c] ?? 0}px` } : undefined}
                title={value() || undefined}
            >
                {value()}
                <Show when={marks().length}>
                    <sup class={styles.mark}>({marks().join(', ')})</sup>
                </Show>
            </td>
        )
    }

    const renderRow = (row, r) => (
        <tr data-r={r()} role="row" aria-rowindex={r() + 1}>
            <th class={styles.rowNum} scope="row" role="rowheader">{r() + 1}</th>
            <Index each={row()}>{(value, c) => renderCell(value, r, c)}</Index>
        </tr>
    )

    return (
        <div
            ref={scroller}
            class={styles.scroller}
            tabIndex={0}
            role="grid"
            aria-rowcount={rows().length}
            aria-colcount={width()}
            aria-activedescendant={active() ? `${id}-${active().r}-${active().c}` : undefined}
            onKeyDown={onKeyDown}
            onScroll={() => setMenu(null)}
        >
            <table
                ref={table}
                class={styles.table}
                onMouseDown={(e) => {
                    const cell = cellFrom(e.target)
                    if (cell && e.button === 0) select(cell.r, cell.c)
                }}
                onContextMenu={onContextMenu}
            >
                <thead class={styles.head} classList={{ [styles.pinnedHead]: pinHeader() }}>
                    <Index each={rows().slice(0, headerRows())}>{(row, r) => renderRow(row, () => r)}</Index>
                </thead>
                <tbody>
                    <Index each={rows().slice(headerRows())}>{(row, i) => renderRow(row, () => i + headerRows())}</Index>
                </tbody>
            </table>
            <Show when={menu()}>
                {(m) => (
                    <ContextMenu
                        x={m().x}
                        y={m().y}
                        items={m().items}
                        onClose={() => {
                            setMenu(null)
                            scroller.focus({ preventScroll: true })
                        }}
                    />
                )}
            </Show>
        </div>
    )
}

export default DataGrid
