type THamburgerDragIconProps = {
    isOverlapping?: boolean;
};

const HamburgerDragIcon = ({ isOverlapping }: THamburgerDragIconProps) => (
    <div
        className='drag-icon'
        style={
            isOverlapping
                ? {
                      color: 'transparent',
                      backgroundColor: 'transparent',
                  }
                : undefined
        }
    >
        <div style={isOverlapping ? { backgroundColor: 'transparent' } : undefined}></div>
        <div style={isOverlapping ? { backgroundColor: 'transparent' } : undefined}></div>
        <div style={isOverlapping ? { backgroundColor: 'transparent' } : undefined}></div>
    </div>
);

export default HamburgerDragIcon;
