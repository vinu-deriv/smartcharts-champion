/* eslint-disable react/react-in-jsx-scope */
import { observer } from 'mobx-react-lite';
import { useStores } from 'src/store';
import { CrosshairOffIcon, CrosshairOnIcon } from './Icons';
import { Toggle } from './Form';
import Tooltip from './Tooltip';

const CrosshairToggle = () => {
    const { chart, crosshair } = useStores();
    const { isMobile } = chart;

    const CrosshairIcon = crosshair.isEnabled ? CrosshairOnIcon : CrosshairOffIcon;

    const crosshairLabel = crosshair.isEnabled ? t.translate('Disable Crosshair') : t.translate('Enable Crosshair');

    return (
        <Tooltip content={crosshairLabel} enabled={!isMobile} position='right'>
            <Toggle active={crosshair.isEnabled} onChange={(value: boolean) => crosshair.updateEnabledState(value)}>
                <CrosshairIcon />
            </Toggle>
        </Tooltip>
    );
};

export default observer(CrosshairToggle);
