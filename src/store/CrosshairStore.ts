import { computed, makeObservable, observable } from 'mobx';
import MainStore from '.';
import { STATE } from '../Constant';

class CrosshairStore {
    mainStore: MainStore;
    isEnabled = true; // User-controlled crosshair state
    isTemporarilyDisabled = false; // Temporarily disabled (e.g., on hover)

    constructor(mainStore: MainStore) {
        makeObservable(this, {
            isEnabled: observable,
            isTemporarilyDisabled: observable,
            isFunctionallyActive: computed,
        });

        this.mainStore = mainStore;
    }

    get isFunctionallyActive(): boolean {
        return this.isEnabled && !this.isTemporarilyDisabled;
    }

    updateEnabledState = (enabled: boolean) => {
        this.isEnabled = enabled;
        this.mainStore.chartAdapter.flutterChart?.config.updateCrosshairVisibility(this.isFunctionallyActive);
        
        // Track crosshair click event
        this.stateChange(STATE.CROSSHAIR_CLICK, {
            cta_name: enabled ? 'enable' : 'disable',
        });
    };

    setTemporaryDisabled = (disabled: boolean) => {
        this.isTemporarilyDisabled = disabled;
        this.mainStore.chartAdapter.flutterChart?.config.updateCrosshairVisibility(this.isFunctionallyActive);
    };
    
    // Helper method to track crosshair state changes
    stateChange = (event: string, params: Record<string, string> = {}) => {
        this.mainStore.state.stateChange(event, params);
    };
}
export default CrosshairStore;
