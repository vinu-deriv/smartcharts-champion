import { ActiveSymbols as TActiveSymbols } from '../types/api-types';
import { 
    TProcessedSymbols, 
    TProcessedSymbolItem, 
    TCategorizedSymbols,
} from '../types/active-symbols.types';
import {
    TSubCategory,
    TSubCategoryDataItem,
    TCategorizedSymbolItem,
} from '../types/categorical-display.types';

// Helper function for stable sort
export function stableSort<T>(array: T[], compareFn: (a: T, b: T) => number): T[] {
    return array
        .map((item, index) => ({ item, index }))
        .sort((a, b) => {
            const order = compareFn(a.item, b.item);
            return order !== 0 ? order : a.index - b.index;
        })
        .map(({ item }) => item);
}

// Helper functions for processing symbols
export const processSymbols = (symbols: TActiveSymbols): TProcessedSymbols => {
    const processedSymbols: TProcessedSymbols = [];

    // Stable sort is required to retain the order of the symbol name
    const sortedSymbols = stableSort(symbols, (a, b) =>
        a.submarket_display_name.localeCompare(b.submarket_display_name)
    );

    for (const s of sortedSymbols) {
        processedSymbols.push({
            symbol: s.symbol,
            name: s.display_name,
            market: s.market,
            market_display_name: s.market_display_name,
            subgroup: s.subgroup,
            subgroup_display_name: s.subgroup_display_name,
            submarket_display_name: s.submarket_display_name,
            exchange_is_open: !!s.exchange_is_open,
            decimal_places: s.pip.toString().length - 2,
        });
    }

    return processedSymbols;
};

export const categorizeActiveSymbols = (activeSymbols: TProcessedSymbols): TCategorizedSymbols => {
    const categorizedSymbols: TCategorizedSymbols = [];
    if (!activeSymbols.length) return categorizedSymbols;
    
    const first = activeSymbols[0];
    const getSubcategory = (d: TProcessedSymbolItem): TSubCategory => ({
        subcategoryName: d.submarket_display_name,
        data: [],
    });
    const getCategory = (d: TProcessedSymbolItem): TCategorizedSymbolItem<TSubCategoryDataItem> => ({
        categoryName: d.market_display_name,
        categoryId: d.market,
        hasSubcategory: true,
        hasSubgroup: !!(d.subgroup && d.subgroup !== 'none'),
        data: [],
        subgroups: [],
    });
    let subcategory = getSubcategory(first);
    let category = getCategory(first);
    for (const symbol of activeSymbols) {
        if (
            category.categoryName !== symbol.market_display_name &&
            category.categoryName !== symbol.subgroup_display_name
        ) {
            category.data.push(subcategory as unknown as TSubCategoryDataItem);
            categorizedSymbols.push(category);
            subcategory = getSubcategory(symbol);
            category = getCategory(symbol);
        }

        if (category.hasSubgroup) {
            if (!category.subgroups?.some((el: TCategorizedSymbolItem) => el.categoryId === symbol.subgroup)) {
                category.subgroups?.push({
                    data: [],
                    categoryName: symbol.subgroup_display_name,
                    categoryId: symbol.subgroup,
                    hasSubcategory: true,
                    hasSubgroup: false,
                    subgroups: [],
                });
            }
            // should push a subcategory instead of symbol
            if (
                !category.subgroups
                    ?.find((el: TCategorizedSymbolItem) => el.categoryId === symbol.subgroup)
                    ?.data.find((el: TSubCategory) => el.subcategoryName === symbol.submarket_display_name)
            ) {
                subcategory = getSubcategory(symbol);
                category.subgroups
                    ?.find((el: TCategorizedSymbolItem) => el.categoryId === symbol.subgroup)
                    ?.data.push(subcategory);
                subcategory = getSubcategory(symbol);
            }
            category.subgroups
                ?.find((el: TCategorizedSymbolItem) => el.categoryId === symbol.subgroup)
                ?.data.find((el: TSubCategory) => el.subcategoryName === symbol.submarket_display_name)
                ?.data.push({
                    enabled: true,
                    itemId: symbol.symbol,
                    display: symbol.name,
                    dataObject: symbol,
                });
        }
        if (subcategory.subcategoryName !== symbol.submarket_display_name) {
            category.data.push(subcategory as unknown as TSubCategoryDataItem);
            subcategory = getSubcategory(symbol);
        }
        subcategory.data.push({
            enabled: true,
            itemId: symbol.symbol,
            display: symbol.name,
            dataObject: symbol,
        });
    }

    category.data.push(subcategory as unknown as TSubCategoryDataItem);
    categorizedSymbols.push(category);

    return categorizedSymbols;
};
