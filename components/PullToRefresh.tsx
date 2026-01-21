import React, { useState, useEffect, useRef } from 'react';
import { Loader2, ArrowDown } from 'lucide-react';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
    const [startY, setStartY] = useState(0);
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const PULL_THRESHOLD = 80;

    const handleTouchStart = (e: React.TouchEvent) => {
        if (containerRef.current && containerRef.current.scrollTop === 0) {
            setStartY(e.touches[0].pageY);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (startY === 0 || isRefreshing) return;

        if (containerRef.current && containerRef.current.scrollTop === 0) {
            const currentY = e.touches[0].pageY;
            const distance = currentY - startY;

            if (distance > 0) {
                setPullDistance(Math.min(distance * 0.5, PULL_THRESHOLD + 20));
                if (distance > 20) {
                    // Prevent scroll when pulling
                    if (e.cancelable) e.preventDefault();
                }
            }
        }
    };

    const handleTouchEnd = async () => {
        if (startY === 0 || isRefreshing) return;

        if (pullDistance > PULL_THRESHOLD) {
            setIsRefreshing(true);
            setPullDistance(PULL_THRESHOLD);
            try {
                await onRefresh();
            } finally {
                setTimeout(() => {
                    setIsRefreshing(false);
                    setPullDistance(0);
                }, 500);
            }
        } else {
            setPullDistance(0);
        }
        setStartY(0);
    };

    return (
        <div
            ref={containerRef}
            className="h-full overflow-y-auto no-scrollbar relative flex flex-col"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <div
                className="absolute left-0 right-0 flex items-center justify-center transition-all duration-200 z-50 pointer-events-none"
                style={{
                    top: `${pullDistance - 40}px`,
                    opacity: pullDistance > 20 ? 1 : 0,
                }}
            >
                <div className="bg-white dark:bg-charcoal rounded-full p-2 shadow-xl border border-secondary/10 dark:border-white/10">
                    {isRefreshing ? (
                        <Loader2 className="animate-spin text-primary" size={20} />
                    ) : (
                        <ArrowDown
                            className="text-primary transition-transform duration-200"
                            style={{ transform: `rotate(${Math.min(pullDistance * 2, 180)}deg)` }}
                            size={20}
                        />
                    )}
                </div>
            </div>
            <div
                className="flex-1 flex flex-col transition-transform duration-200"
                style={{ transform: `translateY(${pullDistance}px)` }}
            >
                {children}
            </div>
        </div>
    );
};
