import { For, Show, createSignal, onCleanup, onMount } from 'solid-js'
import { Portal } from 'solid-js/web'

import styles from './ContextMenu.module.css'

/**
 * Right-click menu.
 *
 * props:
 *   x, y     viewport position
 *   items    [{ title, click?, items? }]   `items` makes a submenu
 *   onClose  () => void
 */
const ContextMenu = (props) => {
    let root
    onMount(() => {
        const onPointerDown = (e) => !root.contains(e.target) && props.onClose()
        const onDismiss = () => props.onClose()
        window.addEventListener('pointerdown', onPointerDown, true)
        window.addEventListener('resize', onDismiss)
        window.addEventListener('blur', onDismiss)
        onCleanup(() => {
            window.removeEventListener('pointerdown', onPointerDown, true)
            window.removeEventListener('resize', onDismiss)
            window.removeEventListener('blur', onDismiss)
        })
    })
    return (
        <Portal>
            <div ref={root}>
                <MenuList items={props.items} x={props.x} y={props.y} onClose={props.onClose} root />
            </div>
        </Portal>
    )
}

const MenuList = (props) => {
    const [openIndex, setOpenIndex] = createSignal(-1)
    let list

    onMount(() => {
        // Keep the menu on screen.
        const r = list.getBoundingClientRect()
        if (props.root) {
            list.style.left = `${Math.max(4, Math.min(props.x, window.innerWidth - r.width - 4))}px`
            list.style.top = `${Math.max(4, Math.min(props.y, window.innerHeight - r.height - 4))}px`
        } else {
            if (r.right > window.innerWidth - 4) list.classList.add(styles.flip)
            const overflowY = r.bottom - (window.innerHeight - 4)
            if (overflowY > 0) list.style.top = `${-overflowY}px`
        }
        list.querySelector('[role=menuitem]')?.focus()
    })

    const items = () => [...list.querySelectorAll(':scope > li > [role=menuitem]')]
    const onKeyDown = (e, item, i) => {
        const all = items()
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                all[(i + 1) % all.length].focus()
                break
            case 'ArrowUp':
                e.preventDefault()
                all[(i - 1 + all.length) % all.length].focus()
                break
            case 'ArrowRight':
                if (item.items) {
                    e.preventDefault()
                    setOpenIndex(i)
                }
                break
            case 'ArrowLeft':
                if (!props.root) {
                    e.preventDefault()
                    e.stopPropagation()
                    props.onBack()
                }
                break
            case 'Escape':
                e.preventDefault()
                e.stopPropagation()
                if (props.root) props.onClose()
                else props.onBack()
                break
            case 'Enter':
            case ' ':
                e.preventDefault()
                activate(item, i)
                break
            case 'Tab':
                e.preventDefault()
                props.onClose()
                break
        }
    }
    const activate = (item, i) => {
        if (item.items) {
            setOpenIndex(i)
            return
        }
        props.onClose()
        item.click?.()
    }

    return (
        <ul
            ref={list}
            role="menu"
            class={styles.menu}
            classList={{ [styles.root]: props.root, [styles.sub]: !props.root }}
            onContextMenu={(e) => e.preventDefault()}
        >
            <For each={props.items}>
                {(item, i) => (
                    <li class={styles.entry} onMouseEnter={() => setOpenIndex(item.items ? i() : -1)}>
                        <div
                            role="menuitem"
                            tabIndex={-1}
                            class={styles.item}
                            classList={{ [styles.open]: openIndex() === i() }}
                            aria-haspopup={item.items ? 'menu' : undefined}
                            aria-expanded={item.items ? openIndex() === i() : undefined}
                            title={item.title}
                            onClick={() => activate(item, i())}
                            onKeyDown={(e) => onKeyDown(e, item, i())}
                        >
                            <span class={styles.label}>{item.title}</span>
                            <Show when={item.items}>
                                <span class={styles.chevron} aria-hidden="true">▸</span>
                            </Show>
                        </div>
                        <Show when={item.items && openIndex() === i()}>
                            <MenuList
                                items={item.items}
                                onClose={props.onClose}
                                onBack={() => {
                                    setOpenIndex(-1)
                                    items()[i()]?.focus()
                                }}
                            />
                        </Show>
                    </li>
                )}
            </For>
        </ul>
    )
}

export default ContextMenu
