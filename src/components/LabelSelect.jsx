import { createMemo } from 'solid-js'

import store from '../lib/store'
import Select from './Select'

// "Default - Truncated" style picker for label role + language.
// props.pairs: [labelRole, lang][]
const LabelSelect = (props) => {
    const value = () => JSON.stringify([store.ui.labelRole, store.ui.lang])
    const options = createMemo(() => {
        const seen = new Map()
        for (const [role, lang] of [...(props.pairs || []), [store.ui.labelRole, store.ui.lang]]) {
            const key = JSON.stringify([role, lang])
            if (!seen.has(key)) seen.set(key, { value: key, label: `${role} - ${lang}` })
        }
        return [...seen.values()]
    })
    return (
        <Select
            ariaLabel="Label role and language"
            size={props.size}
            options={options()}
            value={value()}
            onChange={(v) => {
                const [role, lang] = JSON.parse(v)
                store.setLabel(role, lang)
            }}
        />
    )
}

export default LabelSelect
