import type { ReactNode } from "react";

type MainLayoutProps = {
    children: ReactNode;
}

export const MainLayout = ({ children } : MainLayoutProps) => {
    return (
        <div className="flex-1 bg-white">
            {children}
        </div>
    )
}