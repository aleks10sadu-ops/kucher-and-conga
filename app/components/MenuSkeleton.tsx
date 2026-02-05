'use client';

import React from 'react';

const SkeletonPulse = ({ className }: { className?: string }) => (
    <div className={`animate-pulse bg-white/5 rounded-lg ${className}`} />
);

export default function MenuSkeleton() {
    return (
        <div className="space-y-16">
            {/* Category Skeleton */}
            {[1, 2].map((categoryIndex) => (
                <div key={categoryIndex}>
                    <div className="flex items-center gap-4 mb-6 md:mb-8 border-b border-white/10 pb-4">
                        <SkeletonPulse className="h-8 w-48 bg-amber-400/20" />
                    </div>

                    {/* Updated grid classes to match EnhancedMenuSection: grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 */}
                    <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 lg:gap-6">
                        {/* Item Skeletons - increased count to look better on 4-column grid */}
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((itemIndex) => (
                            <div
                                key={itemIndex}
                                className="group overflow-hidden rounded-lg sm:rounded-xl lg:rounded-2xl border border-white/10 bg-white/5 flex flex-col h-full"
                            >
                                {/* Image Skeleton */}
                                <div className="relative aspect-square overflow-hidden bg-neutral-800">
                                    <SkeletonPulse className="w-full h-full" />
                                </div>

                                <div className="p-2 sm:p-3 lg:p-6 flex flex-col flex-grow space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <SkeletonPulse className="h-4 sm:h-5 lg:h-6 w-2/3" />
                                        <SkeletonPulse className="h-4 sm:h-5 lg:h-6 w-16 bg-amber-400/20" />
                                    </div>

                                    {/* Description lines */}
                                    <div className="space-y-2">
                                        <SkeletonPulse className="h-3 w-full" />
                                        <SkeletonPulse className="h-3 w-4/5" />
                                    </div>

                                    {/* Controls Skeleton */}
                                    <div className="mt-auto pt-2 flex justify-between items-center">
                                        <SkeletonPulse className="h-8 w-24 rounded-full bg-amber-400/10" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
