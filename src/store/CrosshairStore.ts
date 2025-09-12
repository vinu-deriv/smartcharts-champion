import { computed, makeObservable, observable } from 'mobx';
import MainStore from '.';

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
    };

    setTemporaryDisabled = (disabled: boolean) => {
        this.isTemporarilyDisabled = disabled;
        this.mainStore.chartAdapter.flutterChart?.config.updateCrosshairVisibility(this.isFunctionallyActive);
    };
}
export default CrosshairStore;
