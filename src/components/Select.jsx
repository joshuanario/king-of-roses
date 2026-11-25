import { For, Show, createEffect, createMemo, createSignal, createUniqueId } from 'solid-js'

import styles from './Select.module.css'

/**
 * Selectize-style searchable select.
 *
 * props:
 *   options   [{ value: string, label: string, hint?: string }]
 *   value     selected value
 *   onChange  (value) => void
 *   ariaLabel accessible name
 *   placeholder
 *   size      'sm' for in-toolbar use
 */
const Select = (props) => {
    const id = createUniqueId()
    const [open, setOpen] = createSignal(false)
    const [query, setQuery] = createSignal('')
    const [active, setActive] = createSignal(0)
    let root
    let list

    const selected = createMemo(() => props.options.find((o) => o.value === props.value))
    const display = () => {
        const s = selected()
        if (!s) return ''
        return s.hint && props.size !== 'sm' ? `${s.label}  ·  ${s.hint}` : s.label
    }
    // Selectize-style matching: every typed word must appear somewhere in the
    // option, so "tax credit" finds "#us-gaap_TaxCreditCarryforwardTable".
    const filtered = createMemo(() => {
        const words = query().trim().toLowerCase().split(/\s+/).filter(Boolean)
        if (!words.length) return props.options
        return props.options.filter((o) => {
            const text = `${o.label} ${o.hint || ''}`.toLowerCase()
            return words.every((w) => text.includes(w))
        })
    })

    const openList = () => {
        if (open()) return
        setQuery('')
        setActive(Math.max(0, props.options.findIndex((o) => o.value === props.value)))
        setOpen(true)
    }
    const close = () => {
        setOpen(false)
        setQuery('')
    }
    const choose = (option) => {
        if (option && option.value !== props.value) props.onChange(option.value)
        close()
    }

    createEffect(() => {
        if (!open()) return
        const i = active()
        list?.querySelector(`[data-index="${i}"]`)?.scrollIntoView({ block: 'nearest' })
    })

    const onKeyDown = (e) => {
        const count = filtered().length
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                if (!open()) openList()
                else setActive((i) => Math.min(count - 1, i + 1))
                break
            case 'ArrowUp':
                e.preventDefault()
                if (!open()) openList()
                else setActive((i) => Math.max(0, i - 1))
                break
            case 'Enter':
                if (open()) {
                    e.preventDefault()
                    choose(filtered()[active()])
                }
                break
            case 'Escape':
                if (open()) {
                    e.preventDefault()
                    close()
                }
                break
            case 'Tab':
                close()
                break
        }
    }

    return (
        <div
            ref={root}
            class={styles.select}
            classList={{ [styles.open]: open(), [styles.sm]: props.size === 'sm' }}
            onFocusOut={(e) => {
                if (!root.contains(e.relatedTarget)) close()
            }}
        >
            <input
                class={styles.input}
                role="combobox"
                aria-label={props.ariaLabel}
                aria-expanded={open()}
                aria-controls={`${id}-list`}
                aria-autocomplete="list"
                aria-activedescendant={open() && filtered().length ? `${id}-${active()}` : undefined}
                autocomplete="off"
                spellcheck={false}
                title={display()}
                value={open() ? query() : display()}
                placeholder={open() ? display() || props.placeholder : props.placeholder}
                onFocus={openList}
                onClick={openList}
                onInput={(e) => {
                    setQuery(e.currentTarget.value)
                    setActive(0)
                    setOpen(true)
                }}
                onKeyDown={onKeyDown}
            />
            <span class={styles.chevron} aria-hidden="true">▾</span>
            <Show when={open()}>
                <ul ref={list} id={`${id}-list`} class={styles.list} role="listbox" aria-label={props.ariaLabel}>
                    <For each={filtered()} fallback={<li class={styles.empty}>No matches</li>}>
                        {(option, i) => (
                            <li
                                id={`${id}-${i()}`}
                                data-index={i()}
                                role="option"
                                aria-selected={option.value === props.value}
                                class={styles.option}
                                classList={{
                                    [styles.active]: i() === active(),
                                    [styles.selected]: option.value === props.value,
                                }}
                                onMouseDown={(e) => {
                                    e.preventDefault() // keep focus in the input
                                    choose(option)
                                }}
                                onMouseMove={() => setActive(i())}
                            >
                                <span class={styles.label}>{option.label}</span>
                                <Show when={option.hint}>
                                    <span class={styles.hint}>{option.hint}</span>
                                </Show>
                            </li>
                        )}
                    </For>
                </ul>
            </Show>
        </div>
    )
}

export default Select
