import { action, computed, observable, when, makeObservable } from 'mobx';
import Context from 'src/components/ui/Context';
import {
    TDrawingToolConfig,
    TIcon,
    TSettingsParameter,
    TAddingStateInfo,
    TFloatingMenuPositionOffset,
} from 'src/types';
import set from 'lodash-es/set';
import { capitalize, hexToInt, intToHexColor } from 'src/components/ui/utils';
import MainStore from '.';
import { getDefaultDrawingConfig, getDrawTools } from '../Constant';
import { clone, isLiteralObject, safeParse, transformStudiesforTheme } from '../utils';
import { LogActions, LogCategories, logEvent } from '../utils/ga';
import MenuStore from './MenuStore';
import SettingsDialogStore from './SettingsDialogStore';

export type TEdgePoints = {
    epoch: number;
    quote: number;
};

export type TActiveDrawingItem = {
    title: string;
    text: string;
    id: string;
    config: TDrawingToolConfig;
    parameters: TSettingsParameter[];
    bars?: number;
    key?: string;
    icon?: TIcon | undefined;
    name: string;
    lineStyle?: {
        color: number;
    };
    fillStyle?: {
        color: number;
    };
    num: number;
    index: number;
};

export type TRestoreFinalItem = {
    name: string;
    title: string;
    pattern: string;
    lineStyle?: { color: number };
    fillStyle?: { color: number };
    [key: string]: any;
};

export type TRestoreDrawingList = {
    index: number;
    data: TRestoreFinalItem;
};

export type TActiveDrawingToolItem = {
    id: string;
    items: TActiveDrawingItem[];
};

export type TDrawingCreatedConfig = {
    configId: string;
    edgePoints: TEdgePoints[];
    isOverlay: boolean;
    pattern: { index: number };
    lineStyle?: { color: { value: number }; thickness: number };
    fillStyle?: { color: { value: number }; thickness: number };
    [key: string]: any;
};

export type TDrawingEditParameter =
    | {
          category: string;
          defaultValue: string;
          path: string;
          title: string;
          type: string;
          value: string;
      }
    | TSettingsParameter;

export default class DrawToolsStore {
    _pervDrawingObjectCount = 0;
    mainStore: MainStore;
    menuStore: MenuStore;
    settingsDialog: SettingsDialogStore;
    activeToolsGroup: TActiveDrawingToolItem[] = [];
    portalNodeIdChanged?: string;
    seletedDrawToolConfig: TActiveDrawingItem | null = null;
    selectedToolId: string | null = null;
    showConfirmationToast = false;
    confirmationMessage = '';
    showDeletionSnackbar = false;
    deletedToolName = '';
    addingStateInfo: TAddingStateInfo = { currentStep: 0, totalSteps: 0, isFinished: true };
    floatingMenuPosition?: TFloatingMenuPositionOffset;

    constructor(mainStore: MainStore) {
        makeObservable(this, {
            activeToolsGroup: observable,
            portalNodeIdChanged: observable,
            selectedToolId: observable,
            showConfirmationToast: observable,
            confirmationMessage: observable,
            showDeletionSnackbar: observable,
            deletedToolName: observable,
            addingStateInfo: observable,
            floatingMenuPosition: observable,
            activeToolsNo: computed,
            destructor: action.bound,
            drawingFinished: action.bound,
            clearAll: action.bound,
            updateActiveToolsGroup: action.bound,
            onDeleted: action.bound,
            updatePortalNode: action.bound,
            onLoad: action.bound,
            hideDrawingConfirmation: action.bound,
            hideDeletionSnackbar: action.bound,
            showDeletionSnackbarForDeletedTool: action.bound,
            cancelDrawingTool: action.bound,
            updateAddingState: action.bound,
            resetAddingState: action.bound,
            updateProps: action.bound,
            updateFloatingMenuPosition: action.bound,
            setSelectedTool: action.bound,
            clearSelectedTool: action.bound,
        });

        this.mainStore = mainStore;
        this.menuStore = new MenuStore(mainStore, { route: 'draw-tool' });

        this.settingsDialog = new SettingsDialogStore({
            mainStore,
            onDeleted: (id: string) => {
                const drawToolsItems = this.drawingToolsRepoArray();
                const index = drawToolsItems?.findIndex(item => item.configId === id);
                if (index !== undefined && index > -1) {
                    this.onDeleted(index);
                }
            },
            onChanged: () => {
                /* No-op: Drawing tool settings are not editable in this implementation */
            },
        });
        when(() => !!this.context, this.onContextReady);
    }

    get context(): Context | null {
        return this.mainStore.chart.context;
    }

    get stateStore() {
        return this.mainStore.state;
    }

    getDrawToolsItems = () => {
        const drawTools = getDrawTools();
        return Object.keys(drawTools).map(key => drawTools[key]);
    };

    drawingToolsRepoArray = () => {
        return this.mainStore.chartAdapter.flutterChart?.drawingTool
            .getDrawingToolsRepoItems()
            .map(item => safeParse(item))
            .filter(item => item);
    };

    onContextReady = () => {
        document.addEventListener('keydown', this.closeOnEscape, false);
        document.addEventListener('dblclick', this.doubleClick);
    };

    closeOnEscape = (e: KeyboardEvent) => {
        const ESCAPE = 27;
        if (e.keyCode === ESCAPE) {
            this.mainStore.chartAdapter.flutterChart?.drawingTool.clearDrawingToolSelect();
            // drawingTools.selectedDrawingTool = null;
            this.seletedDrawToolConfig = null;
            this.drawingFinished();
        }
    };

    doubleClick = () => this.drawingFinished();
    get activeToolsNo() {
        return this.activeToolsGroup.reduce((a, b) => a + b.items.length, 0);
    }

    destructor() {
        document.removeEventListener('keydown', this.closeOnEscape);
        document.removeEventListener('dblclick', this.doubleClick);
    }

    // Callback that gets called when theme is changed
    updateTheme() {
        this.activeToolsGroup.forEach(item =>
            item.items.forEach(data => {
                transformStudiesforTheme(data.parameters, this.mainStore.chartSetting.theme);
            })
        );
    }

    // Callback that runs when the chart is loaded
    onLoad(drawings: TDrawingCreatedConfig[]) {
        this.activeToolsGroup = [];

        drawings.forEach((item: TDrawingCreatedConfig) => {
            if (typeof item === 'string') {
                item = safeParse(item);
            }

            if (!item) {
                return;
            }

            const drawingName = item.name.replace('dt_', '');
            if (drawingName) {
                const finalItem = this.processDrawTool(drawingName);

                finalItem.config = item;

                finalItem.parameters.forEach((params: TDrawingEditParameter) => {
                    if (params.path) {
                        if (['lineStyle', 'fillStyle'].includes(params.path)) {
                            params.value = intToHexColor(item[params.path]?.color?.value ?? item[params.path]?.color);
                        } else if (params.path === 'enableLabel') {
                            params.value = item[params.path];
                        }
                    }
                });
                this.updateActiveToolsGroup(finalItem);
            }
        });
    }

    drawingFinished() {
        // Hide confirmation toast when drawing is finished
        // This will also clear the selected tool
        this.hideDrawingConfirmation();
    }

    // Callback to remove all drawings
    clearAll() {
        this.activeToolsGroup = [];
        window.flutterChart?.drawingTool.clearDrawingTool();
        // this.mainStore.state.saveDrawings();
        logEvent(LogCategories.ChartControl, LogActions.DrawTools, 'Clear All');
    }

    transform = (value: any) => {
        if (typeof value === 'string' && (value.startsWith('#') || value.toLowerCase().startsWith('0x'))) {
            return hexToInt(value);
        }
        if (isLiteralObject(value)) {
            const map = value as Record<string, any>;
            Object.keys(value).forEach(key => {
                map[key] = this.transform(map[key]);
            });
        } else if (Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) {
                value[i] = this.transform(value[i]);
            }
        }

        return value;
    };

    updateFloatingMenuPosition = ({ x, y }: TFloatingMenuPositionOffset) => {
        // Store the position
        this.floatingMenuPosition = { x, y };
        // Update the floating menu position in the chart
        this.mainStore.chartAdapter.flutterChart?.drawingTool.updateFloatingMenuPosition(x, y);
    };

    setSelectedTool = (toolId: string) => {
        this.selectedToolId = toolId;
        // Show confirmation toast when tool is selected
        // The message will be dynamically generated by getDynamicMessage
        this.showConfirmationToast = true;
    };

    clearSelectedTool = () => {
        this.selectedToolId = null;
        this.showConfirmationToast = false;
    };

    startAddingNewTool = (id: string) => {
        this.setSelectedTool(id); // This will automatically show the confirmation toast
        this.menuStore.setOpen(false);
        this.mainStore.chartAdapter.flutterChart?.drawingTool.startAddingNewTool(id);
        // this.updateActiveToolsGroup(this.seletedDrawToolConfig);
    };

    cancelAddingNewTool = () => {
        this.mainStore.chartAdapter.flutterChart?.drawingTool.cancelAddingNewTool();
        this.hideDrawingConfirmation();
    };

    /// The common function (now only responsible for creating finalItem)
    processDrawTool(id: string) {
        const drawToolsConfig = getDrawTools();
        const props = drawToolsConfig[id];

        const { parameters, config } = getDefaultDrawingConfig(id);

        transformStudiesforTheme(parameters, this.mainStore.chartSetting.theme);
        transformStudiesforTheme(config, this.mainStore.chartSetting.theme);

        let finalItem = null;

        if (props && parameters) {
            parameters.map(p => (p.value = clone(p.defaultValue)));

            const item = {
                config,
                parameters,
                bars: '0',
                ...props,
            };

            const params = item.parameters.reduce((acc, it) => {
                const { path, paths, value } = it;

                if (isLiteralObject(value) && paths) {
                    const map = value as Record<string, any>;
                    const keys = Object.keys(map);
                    keys.forEach(key => {
                        set(acc, paths[key], map[key]);
                    });
                } else if (path) {
                    set(acc, path, value);
                }

                return acc;
            }, item.config || {});

            const drawingData = {
                id: item.id,
                name: `dt_${id}`,
                title: capitalize(item.id),
                ...this.transform(params),
            };

            const drawToolConfig = getDrawTools();

            finalItem = {
                ...drawingData,
                ...drawToolConfig[id],
                parameters,
                ...{ index: this.activeToolsNo },
            };
        }

        return finalItem;
    }

    /// This callback run when any of the drawing is dragged, used to save updated drawing config
    onUpdate() {
        const drawToolsItem = this.drawingToolsRepoArray();
        if (drawToolsItem) {
            this.onLoad(drawToolsItem);
        }
    }

    /// Used to add item in activeToolsGroup
    updateActiveToolsGroup(finalItem: TActiveDrawingItem) {
        const activeTools = [...this.activeToolsGroup];
        const groupIndex = activeTools.findIndex(item => item.id === finalItem.id);

        if (groupIndex === -1) {
            activeTools.push({
                id: finalItem.id,
                items: [finalItem],
            });
        } else {
            const item = activeTools[groupIndex];
            item.items.push({ ...finalItem, ...{ num: item.items.length } });
            activeTools[groupIndex] = item;
        }
        this.activeToolsGroup = activeTools;
    }

    /// Callback that runs when drawingTool is Deleted
    onDeleted(index?: number) {
        if (index !== undefined) {
            const drawToolsItem = this.drawingToolsRepoArray();
            const config = drawToolsItem ? drawToolsItem[index] : null;
            if (config) {
                this.mainStore.chartAdapter.flutterChart?.drawingTool.removeDrawingTool(index);
            }
            /// Log the event
            if (index && config) {
                logEvent(LogCategories.ChartControl, LogActions.DrawTools, `Remove ${index}`);
            }
        }
    }

    /// Update portal node
    updatePortalNode(portalNodeId: string | undefined) {
        this.portalNodeIdChanged = portalNodeId;
    }

    hideDrawingConfirmation = () => {
        this.showConfirmationToast = false;
        this.confirmationMessage = '';
        this.resetAddingState();
        // Clear selected tool when hiding confirmation
        this.clearSelectedTool();
    };

    hideDeletionSnackbar = () => {
        this.showDeletionSnackbar = false;
        this.deletedToolName = '';
    };

    showDeletionSnackbarForDeletedTool = (deletedToolName: string) => {
        this.deletedToolName = deletedToolName;
        this.showDeletionSnackbar = true;
    };

    cancelDrawingTool = () => {
        // Cancel current drawing operation
        this.hideDrawingConfirmation();
        this.mainStore.chartAdapter.flutterChart?.drawingTool.clearDrawingToolSelect();
        this.seletedDrawToolConfig = null;
        // drawingFinished() will call hideDrawingConfirmation() which clears the selected tool
        this.drawingFinished();
    };

    updateAddingState = (currentStep: number, totalSteps: number) => {
        this.addingStateInfo = {
            currentStep,
            totalSteps,
            isFinished: currentStep === totalSteps,
        };
    };

    resetAddingState = () => {
        this.addingStateInfo = { currentStep: 0, totalSteps: 0, isFinished: true };
    };

    updateProps = (props: { drawingToolFloatingMenuPosition?: TFloatingMenuPositionOffset }) => {
        if (props.drawingToolFloatingMenuPosition) {
            this.updateFloatingMenuPosition(props.drawingToolFloatingMenuPosition);
        }
    };
}
