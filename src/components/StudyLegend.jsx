import React from 'react';
import NotificationBadge from './NotificationBadge.jsx';
import { connect } from '../store/Connect';
import { IndicatorIcon } from './Icons.jsx';

const StudyLegend = ({
    isOpened,
    setOpen,
    StudyMenu,
    menuOpen,
    StudyCategoricalDisplay,
    onCloseMenu,
    isMobile,
    activeStudiesNo,
}) => (
    <StudyMenu
        className="ciq-studies collapse"
        isOpened={isOpened}
        setOpen={setOpen}
        isMobile={isMobile}
    >
        <StudyMenu.Title>
            <IndicatorIcon
                className={`ic-icon-with-sub ${menuOpen ? 'active' : ''}`}
                tooltip-title={t.translate('Indicators')}
            />
            <NotificationBadge notificationCount={activeStudiesNo} />
        </StudyMenu.Title>
        <StudyMenu.Body>
            <StudyCategoricalDisplay
                dialogTitle={t.translate('Indicators')}
                closeMenu={() => onCloseMenu()}
            />
        </StudyMenu.Body>
    </StudyMenu>
);

export default connect(({ studies: st }) => ({
    isOpened: st.open,
    setOpen: st.setOpen,
    StudyMenu: st.StudyMenu,
    menuOpen: st.menu.open,
    StudyCategoricalDisplay: st.StudyCategoricalDisplay,
    onCloseMenu: st.menu.onTitleClick,
    isMobile: st.categoricalDisplay.isMobile,
    activeStudiesNo: st.activeStudies.data.length,
}))(StudyLegend);
