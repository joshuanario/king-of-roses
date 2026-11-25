import transformPGrid from './transformPGrid'
import transformRootDomain from './transformRootDomain'
import transformSummationItem from './transformSummationItem'

// Inserts a balance-type column between the weight and the concept label of
// a calculation grid. Rows are: header rows, one per contributing concept,
// the "=" total row (the summation item itself), then a padding row.
const withBalanceTypes = (item, blob) => {
    const concepts = item.ContributingConcepts || []
    const grid = blob.grid.map((row, i) => {
        const body = i - blob.numFrozenRows
        let balance = ''
        if (body >= 0 && body < concepts.length) balance = concepts[body].BalanceType || ''
        else if (body === concepts.length) balance = item.BalanceType || ''
        return [row[0], balance, ...row.slice(1)]
    })
    return { ...blob, grid }
}

// One description per linkbase grid so a single view component can render all
// three. A "part" is one grid: the PGrid itself, a DGrid root domain, or a
// CGrid summation item.
export const LINKBASES = {
    presentation: {
        title: 'Presentation',
        headerCols: 1,
        parts: (r) => (r?.PGrid ? [r.PGrid] : []),
        transform: transformPGrid,
        rowLabel: (part, row) => part.IndentedLabels?.[row]?.Label,
    },
    definition: {
        title: 'Definition',
        partName: 'Root domain',
        headerCols: 1,
        parts: (r) => r?.DGrid?.RootDomains ?? [],
        transform: transformRootDomain,
        rowLabel: (part, row) => part.PrimaryItems?.[row]?.Label,
    },
    calculation: {
        title: 'Calculation',
        partName: 'Summation item',
        headerCols: 3, // weight | balance type | concept
        parts: (r) => r?.CGrid?.SummationItems ?? [],
        transform: (item, role, lang) => withBalanceTypes(item, transformSummationItem(item, role, lang)),
        rowLabel: (part, row) => part.ContributingConcepts?.[row]?.Label,
    },
}
