'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * SmartLink replaces Next.js <Link> to fix the "Thundering Herd" RSC payload flood.
 * By default, Next.js aggressive prefetches all <Link> tags when a tab regains focus.
 * This wrapper explicitly disables viewport prefetching and only prefetches on user intent (hover/touch).
 */
export const SmartLink = ({ href, children, ...props }) => {
    const router = useRouter();

    const handlePrefetch = () => {
        if (typeof href === "string") {
            router.prefetch(href);
        }
    };

    return (
        <Link
            href={href}
            prefetch={false} // Disable automatic viewport/visibilitychange prefetching
            onMouseEnter={handlePrefetch}
            onTouchStart={handlePrefetch}
            {...props}
        >
            {children}
        </Link>
    );
};
